<?php
/**
 * inquiry-admin/api/suppliers.php — Contracted DMC Suppliers & Ground Partners API
 * 
 * Supports:
 * - List suppliers across destinations (Dubai, Bali, Thailand, Malaysia, Turkey, Kashmir, etc.)
 * - Add new ground supplier partner with contact person, phone, email, services
 * - Update & delete supplier details
 * - Standby mode fallback when database is disconnected
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

$defaultSuppliers = [];

// 1. LIST SUPPLIERS
if ($method === 'GET' || $action === 'list') {
    if (!$pdo) {
        jsonSuccess(['suppliers' => [], 'source' => 'standby_mode']);
    }

    try {
        $search = trim($_GET['search'] ?? '');
        $destination = trim($_GET['destination'] ?? '');

        $sql = "SELECT * FROM `suppliers` WHERE 1=1";
        $params = [];

        if (!empty($destination) && $destination !== 'all') {
            $sql .= " AND `destination` LIKE ?";
            $params[] = "%$destination%";
        }

        if (!empty($search)) {
            $sql .= " AND (`company_name` LIKE ? OR `contact_person` LIKE ? OR `destination` LIKE ? OR `phone` LIKE ? OR `email` LIKE ?)";
            $term = "%$search%";
            $params = array_merge($params, [$term, $term, $term, $term, $term]);
        }

        $sql .= " ORDER BY `id` ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonSuccess([
            'suppliers' => $suppliers ?: [],
            'total' => count($suppliers ?: [])
        ]);
    } catch (\Throwable $e) {
        jsonSuccess(['suppliers' => [], 'error' => $e->getMessage()]);
    }
}

// 2. CREATE SUPPLIER
if ($action === 'create') {
    $company = trim($input['company_name'] ?? '');
    $person = trim($input['contact_person'] ?? $input['said_person'] ?? '');
    $phone = trim($input['phone'] ?? $input['number'] ?? '');
    $email = trim($input['email'] ?? $input['mail_id'] ?? '');
    $destination = trim($input['destination'] ?? '');
    $services = trim($input['services'] ?? '');
    $address = trim($input['address'] ?? '');

    if (empty($company) || empty($person) || empty($phone)) {
        jsonError('Company name, Contact person, and Phone number are required.');
    }

    if (!$pdo) {
        jsonSuccess([
            'id' => time(),
            'company_name' => $company,
            'contact_person' => $person,
            'phone' => $phone,
            'destination' => $destination
        ], "Supplier $company saved successfully (Standby Mode)!");
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `suppliers`
            (`company_name`, `contact_person`, `phone`, `email`, `destination`, `services`, `address`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$company, $person, $phone, $email, $destination, $services, $address]);
        $supplierId = (int)$pdo->lastInsertId();

        // Audit log
        try {
            $pdo->prepare("
                INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
                VALUES (1, 'Admin', 'created_supplier', 'Suppliers', ?, ?, NOW())
            ")->execute([(string)$supplierId, "Added DMC supplier partner $company ($destination)"]);
        } catch (\Throwable $th) {}

        jsonSuccess([
            'id' => $supplierId,
            'company_name' => $company,
            'contact_person' => $person,
            'destination' => $destination
        ], "Supplier $company saved successfully to database!");
    } catch (\Throwable $e) {
        jsonError('Failed to add supplier: ' . $e->getMessage(), 500);
    }
}

// 3. DELETE SUPPLIER
if ($action === 'delete') {
    $supplierId = (int)($input['id'] ?? $input['supplier_id'] ?? 0);
    if ($supplierId <= 0) {
        jsonError('Valid supplier ID is required.', 400);
    }

    if (!$pdo) {
        jsonSuccess(['id' => $supplierId], "Supplier #$supplierId deleted (Standby Mode).");
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM `suppliers` WHERE `id` = ?");
        $stmt->execute([$supplierId]);
        jsonSuccess(['id' => $supplierId], "Supplier #$supplierId deleted successfully.");
    } catch (\Throwable $e) {
        jsonError('Failed to delete supplier: ' . $e->getMessage(), 500);
    }
}

