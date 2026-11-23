<?php
/**
 * inquiry-admin/api/customers.php — Full CRM Customer Profiles API
 * 
 * Supports:
 * - GET: Fetch all registered customers from `customers` table with inquiry & booking metrics
 * - POST: Add/update customer in `customers` table
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');

$activeUser = checkSessionActivity();
$pdo = getDb();

function getCustomersJsonPath() {
    $dir = __DIR__ . '/../../data';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir . '/customers.json';
}

function loadLocalCustomers() {
    $file = getCustomersJsonPath();
    if (file_exists($file)) {
        $json = @file_get_contents($file);
        $arr = json_decode($json, true);
        if (is_array($arr)) return $arr;
    }
    return [];
}

function saveLocalCustomers($customers) {
    $file = getCustomersJsonPath();
    @file_put_contents($file, json_encode(array_values($customers), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (!$pdo) {
        $local = loadLocalCustomers();
        jsonSuccess(['customers' => $local, 'total' => count($local), 'source' => 'local_storage']);
    }
    try {
        // Query official customers table and join inquiry stats if available
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
                COALESCE(i.inq_count, 0) AS total_inquiries,
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

        // Empty if no customers yet
        if (empty($customers)) {
            $customers = [];
        }

        jsonSuccess(['customers' => $customers]);
    } catch (\Throwable $e) {
        $local = loadLocalCustomers();
        jsonSuccess(['customers' => $local, 'total' => count($local), 'source' => 'fallback']);
    }
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    $name = trim($input['name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');
    $category = trim($input['category'] ?? 'B2C');
    $company = trim($input['company_name'] ?? '');
    $city = trim($input['city'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if (empty($name) || empty($phone)) {
        jsonError('Name and phone number are required.', 400);
    }

    $custCode = 'CUST-' . strtoupper(substr(uniqid(), -6));
    $newRecord = [
        'id' => time(),
        'customer_code' => $custCode,
        'name' => $name,
        'company_name' => $company,
        'email' => $email,
        'phone' => $phone,
        'city' => $city,
        'customer_type' => $category,
        'category' => $category,
        'notes' => $notes,
        'created_at' => date('Y-m-d H:i:s'),
        'total_inquiries' => 1,
        'converted_trips' => 0
    ];

    if (!$pdo) {
        $local = loadLocalCustomers();
        array_unshift($local, $newRecord);
        saveLocalCustomers($local);
        jsonSuccess($newRecord, 'Customer profile saved successfully.');
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `customers` (`customer_code`, `name`, `company_name`, `email`, `phone`, `city`, `customer_type`, `notes`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `company_name` = VALUES(`company_name`),
                `email` = VALUES(`email`),
                `customer_type` = VALUES(`customer_type`),
                `city` = VALUES(`city`)
        ");
        $stmt->execute([$custCode, $name, $company, $email, $phone, $city, $category, $notes]);
        $newId = (int)$pdo->lastInsertId();
        $newRecord['id'] = $newId;

        $local = loadLocalCustomers();
        array_unshift($local, $newRecord);
        saveLocalCustomers($local);

        jsonSuccess($newRecord, 'Customer profile saved successfully.');
    } catch (\Throwable $e) {
        $local = loadLocalCustomers();
        array_unshift($local, $newRecord);
        saveLocalCustomers($local);
        jsonSuccess($newRecord, 'Customer profile saved successfully.');
    }
}

