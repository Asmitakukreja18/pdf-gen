<?php
/**
 * inquiry-admin/api/get_customers.php — Grouped Customer Profiles & Booking History
 */

require_once __DIR__ . '/db.php';

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

try {
    $stmt = $pdo->query("
        SELECT 
            phone,
            name,
            email,
            COUNT(*) AS total_inquiries,
            SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) AS total_converted,
            MAX(created_at) AS last_inquiry_at,
            GROUP_CONCAT(DISTINCT destination SEPARATOR ', ') AS destinations_interested,
            GROUP_CONCAT(DISTINCT source SEPARATOR ', ') AS sources_used
        FROM inquiries
        GROUP BY phone, name
        ORDER BY last_inquiry_at DESC
    ");
    $customers = $stmt->fetchAll();

    jsonSuccess(['customers' => $customers]);
} catch (\PDOException $e) {
    error_log("Get customers error: " . $e->getMessage());
    jsonError('Failed to fetch customers', 500);
}
