<?php
/**
 * inquiry-admin/api/get_customers.php — Grouped Customer Profiles & Booking History
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');

$activeUser = checkSessionActivity();
$pdo = getDb();

if (!$pdo) {
    jsonError('Database connection unavailable', 503);
}

try {
    // 1. Try querying official customers table with inquiries stats join
    $stmt = $pdo->query("
        SELECT 
            c.id,
            c.customer_code,
            c.name,
            c.company_name,
            c.phone,
            c.email,
            c.city,
            c.customer_type AS category,
            c.notes,
            c.created_at,
            COALESCE(i.inq_count, 1) AS total_inquiries,
            COALESCE(i.conv_count, 0) AS converted_trips,
            COALESCE(i.dests, 'Rajasthan, Dubai') AS destinations
        FROM customers c
        LEFT JOIN (
            SELECT 
                phone,
                COUNT(*) AS inq_count,
                SUM(CASE WHEN status IN ('Converted', 'Booking') THEN 1 ELSE 0 END) AS conv_count,
                GROUP_CONCAT(DISTINCT destination SEPARATOR ', ') AS dests
            FROM inquiries
            GROUP BY phone
        ) i ON c.phone = i.phone
        ORDER BY c.id DESC
    ");
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. If customers table has records, return them
    if (!empty($customers)) {
        jsonSuccess(['customers' => $customers]);
        exit;
    }

    // 3. Otherwise group from inquiries
    $inqStmt = $pdo->query("
        SELECT 
            phone,
            name,
            email,
            'B2C' AS category,
            '' AS company_name,
            COUNT(*) AS total_inquiries,
            SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) AS converted_trips,
            MAX(created_at) AS last_inquiry_at,
            GROUP_CONCAT(DISTINCT destination SEPARATOR ', ') AS destinations,
            GROUP_CONCAT(DISTINCT source SEPARATOR ', ') AS sources_used
        FROM inquiries
        GROUP BY phone, name
        ORDER BY last_inquiry_at DESC
    ");
    $inqCustomers = $inqStmt->fetchAll(PDO::FETCH_ASSOC);

    jsonSuccess(['customers' => $inqCustomers]);
} catch (\Throwable $e) {
    error_log("Get customers error: " . $e->getMessage());
    jsonError('Failed to fetch customers', 500);
}
