<?php
/**
 * inquiry-admin/api/invoices.php — Invoices, Hotel Vouchers & Transport Vouchers Management API
 * 
 * Supports:
 * - Tax Invoices (GST 5%, HSN 998555)
 * - Hotel Vouchers (Check-in, Check-out, Room Type, Meal Plan)
 * - Cab & Transfer Vouchers (Vehicle Type, Driver, Pickup Time, Sector)
 * - Seamless syncing with cPanel MySQL database
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

function getInvoicesJsonPath() {
    $dir = __DIR__ . '/../../data';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir . '/invoices.json';
}

function loadLocalInvoices() {
    $file = getInvoicesJsonPath();
    if (file_exists($file)) {
        $json = @file_get_contents($file);
        $arr = json_decode($json, true);
        if (is_array($arr)) return $arr;
    }
    return [];
}

function saveLocalInvoices($invoices) {
    $file = getInvoicesJsonPath();
    @file_put_contents($file, json_encode(array_values($invoices), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

// 1. LIST INVOICES / VOUCHERS
if ($method === 'GET' || $action === 'list') {
    $type = $_GET['type'] ?? 'all';
    $status = $_GET['status'] ?? 'all';
    $search = trim($_GET['search'] ?? '');

    if (!$pdo) {
        $all = loadLocalInvoices();
        $filtered = array_filter($all, function($inv) use ($type, $status, $search) {
            if ($type !== 'all' && !empty($type) && ($inv['invoice_type'] ?? '') !== $type) return false;
            if ($status !== 'all' && !empty($status) && ($inv['payment_status'] ?? '') !== $status) return false;
            if (!empty($search)) {
                $s = strtolower($search);
                $target = strtolower(($inv['invoice_no'] ?? '') . ' ' . ($inv['customer_name'] ?? '') . ' ' . ($inv['billing_description'] ?? ''));
                if (strpos($target, $s) === false) return false;
            }
            return true;
        });
        jsonSuccess([
            'invoices' => array_values($filtered),
            'total' => count($filtered),
            'source' => 'local_storage'
        ]);
    }

    try {
        $sql = "SELECT * FROM `invoices` WHERE 1=1";
        $params = [];

        if ($type !== 'all' && !empty($type)) {
            $sql .= " AND `invoice_type` = ?";
            $params[] = $type;
        }

        if ($status !== 'all' && !empty($status)) {
            $sql .= " AND `payment_status` = ?";
            $params[] = $status;
        }

        if (!empty($search)) {
            $sql .= " AND (`invoice_no` LIKE ? OR `customer_name` LIKE ? OR `billing_description` LIKE ?)";
            $term = "%$search%";
            $params = array_merge($params, [$term, $term, $term]);
        }

        $sql .= " ORDER BY `invoice_date` DESC, `id` DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonSuccess([
            'invoices' => $invoices ?: [],
            'total' => count($invoices ?: [])
        ]);
    } catch (\Throwable $e) {
        $all = loadLocalInvoices();
        jsonSuccess(['invoices' => $all, 'total' => count($all), 'source' => 'fallback']);
    }
}

// 2. CREATE INVOICE OR VOUCHER
if ($action === 'create') {
    $type = trim($input['invoice_type'] ?? 'billing');
    $customerName = trim($input['customer_name'] ?? '');
    $invDate = !empty($input['invoice_date']) ? $input['invoice_date'] : date('Y-m-d');
    $dueDate = !empty($input['due_date']) ? $input['due_date'] : date('Y-m-d', strtotime('+7 days'));
    $desc = trim($input['billing_description'] ?? 'Tour & Travel Services');
    $grandTotal = (float)($input['grand_total'] ?? 0);
    $gstRate = (float)($input['gst_rate'] ?? ($type === 'billing' ? 5.00 : 0.00));
    $currency = trim($input['currency'] ?? 'INR');
    $paymentStatus = trim($input['payment_status'] ?? 'Unpaid');
    $createdBy = trim($input['created_by'] ?? 'Admin');
    $particulars = $input['particulars_json'] ?? null;

    if (empty($customerName) || $grandTotal <= 0) {
        jsonError('Customer name and valid grand total amount are required.');
    }

    // Calculate subtotal & tax if 5% GST is applied
    if ($gstRate > 0) {
        $subtotal = round($grandTotal / (1 + ($gstRate / 100)), 2);
        $taxAmount = round($grandTotal - $subtotal, 2);
    } else {
        $subtotal = $grandTotal;
        $taxAmount = 0.00;
    }

    $prefix = ($type === 'billing') ? 'LEDMC-INV-' : 'LEDMC-VCH-';
    $invoiceNo = $prefix . date('Y') . '-' . mt_rand(100, 999);

    $newRecord = [
        'id' => time(),
        'invoice_no' => $invoiceNo,
        'invoice_type' => $type,
        'customer_name' => $customerName,
        'invoice_date' => $invDate,
        'due_date' => $dueDate,
        'billing_description' => $desc,
        'hsn_code' => '998555',
        'gst_rate' => $gstRate,
        'subtotal' => $subtotal,
        'tax_amount' => $taxAmount,
        'grand_total' => $grandTotal,
        'currency' => $currency,
        'particulars_json' => is_array($particulars) ? json_encode($particulars) : $particulars,
        'payment_status' => $paymentStatus,
        'created_by' => $createdBy,
        'created_at' => date('Y-m-d H:i:s')
    ];

    if (!$pdo) {
        $all = loadLocalInvoices();
        array_unshift($all, $newRecord);
        saveLocalInvoices($all);
        jsonSuccess($newRecord, "Invoice $invoiceNo created successfully!");
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `invoices`
            (`invoice_no`, `invoice_type`, `customer_name`, `invoice_date`, `due_date`, `billing_description`, `hsn_code`, `gst_rate`, `subtotal`, `tax_amount`, `grand_total`, `currency`, `particulars_json`, `payment_status`, `created_by`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, '998555', ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $invoiceNo, $type, $customerName, $invDate, $dueDate, $desc,
            $gstRate, $subtotal, $taxAmount, $grandTotal, $currency,
            is_array($particulars) ? json_encode($particulars) : $particulars,
            $paymentStatus, $createdBy
        ]);
        $invId = (int)$pdo->lastInsertId();
        $newRecord['id'] = $invId;

        // Also sync local json cache
        $all = loadLocalInvoices();
        array_unshift($all, $newRecord);
        saveLocalInvoices($all);

        // Audit log
        try {
            $pdo->prepare("
                INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
                VALUES (1, ?, 'generated_invoice', 'Invoices', ?, ?, NOW())
            ")->execute([$createdBy, $invoiceNo, "Generated $type $invoiceNo for $customerName (₹$grandTotal)"]);
        } catch (\Throwable $th) {}

        jsonSuccess($newRecord, "Record $invoiceNo generated successfully!");
    } catch (\Throwable $e) {
        $all = loadLocalInvoices();
        array_unshift($all, $newRecord);
        saveLocalInvoices($all);
        jsonSuccess($newRecord, "Invoice $invoiceNo created successfully (Local Storage Sync)!");
    }
}

// 3. UPDATE PAYMENT STATUS
if ($action === 'update_status') {
    $invId = (int)($input['id'] ?? $input['invoice_id'] ?? 0);
    $newStatus = trim($input['payment_status'] ?? '');

    if ($invId <= 0 || empty($newStatus)) {
        jsonError('Valid invoice ID and status are required.', 400);
    }

    $all = loadLocalInvoices();
    foreach ($all as &$inv) {
        if (($inv['id'] ?? 0) == $invId || ($inv['invoice_no'] ?? '') === (string)$invId) {
            $inv['payment_status'] = $newStatus;
            $inv['updated_at'] = date('Y-m-d H:i:s');
        }
    }
    saveLocalInvoices($all);

    if (!$pdo) {
        jsonSuccess(['id' => $invId, 'payment_status' => $newStatus], "Payment status updated to $newStatus.");
    }

    try {
        $stmt = $pdo->prepare("UPDATE `invoices` SET `payment_status` = ? WHERE `id` = ?");
        $stmt->execute([$newStatus, $invId]);
        jsonSuccess(['id' => $invId, 'payment_status' => $newStatus], "Payment status updated to $newStatus.");
    } catch (\Throwable $e) {
        jsonSuccess(['id' => $invId, 'payment_status' => $newStatus], "Payment status updated to $newStatus.");
    }
}

// 4. DELETE INVOICE OR VOUCHER
if ($action === 'delete') {
    $invId = (int)($input['id'] ?? $input['invoice_id'] ?? ($_GET['id'] ?? 0));
    $invoiceNo = trim($input['invoice_no'] ?? ($_GET['invoice_no'] ?? ''));

    if ($invId <= 0 && empty($invoiceNo)) {
        jsonError('Valid invoice ID or number is required to delete.', 400);
    }

    $all = loadLocalInvoices();
    $remaining = array_filter($all, function($i) use ($invId, $invoiceNo) {
        if ($invId > 0 && ($i['id'] ?? 0) == $invId) return false;
        if (!empty($invoiceNo) && ($i['invoice_no'] ?? '') === $invoiceNo) return false;
        return true;
    });
    saveLocalInvoices(array_values($remaining));

    if (!$pdo) {
        jsonSuccess(['id' => $invId, 'invoice_no' => $invoiceNo], 'Record deleted successfully.');
    }

    try {
        if ($invId > 0) {
            $stmt = $pdo->prepare("DELETE FROM `invoices` WHERE `id` = ?");
            $stmt->execute([$invId]);
        } else {
            $stmt = $pdo->prepare("DELETE FROM `invoices` WHERE `invoice_no` = ?");
            $stmt->execute([$invoiceNo]);
        }
        jsonSuccess(['id' => $invId, 'invoice_no' => $invoiceNo], 'Record deleted from database successfully.');
    } catch (\Throwable $e) {
        jsonSuccess(['id' => $invId, 'invoice_no' => $invoiceNo], 'Record deleted successfully (Local Storage Sync).');
    }
}


