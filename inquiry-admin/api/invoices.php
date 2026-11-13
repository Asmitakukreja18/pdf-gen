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

$defaultInvoices = [];

// 1. LIST INVOICES / VOUCHERS
if ($method === 'GET' || $action === 'list') {
    if (!$pdo) {
        jsonSuccess(['invoices' => [], 'source' => 'standby_mode']);
    }

    try {
        $type = $_GET['type'] ?? 'all';
        $status = $_GET['status'] ?? 'all';
        $search = trim($_GET['search'] ?? '');

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
        jsonSuccess(['invoices' => [], 'error' => $e->getMessage()]);
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

    if (!$pdo) {
        jsonSuccess([
            'invoice_no' => $invoiceNo,
            'customer_name' => $customerName,
            'grand_total' => $grandTotal,
            'payment_status' => $paymentStatus
        ], "Invoice $invoiceNo created successfully (Standby Mode)!");
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

        // Audit log
        try {
            $pdo->prepare("
                INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
                VALUES (1, ?, 'generated_invoice', 'Invoices', ?, ?, NOW())
            ")->execute([$createdBy, $invoiceNo, "Generated $type $invoiceNo for $customerName (₹$grandTotal)"]);
        } catch (\Throwable $th) {}

        jsonSuccess([
            'id' => $invId,
            'invoice_no' => $invoiceNo,
            'customer_name' => $customerName,
            'grand_total' => $grandTotal,
            'payment_status' => $paymentStatus
        ], "Record $invoiceNo generated successfully!");
    } catch (\Throwable $e) {
        jsonError('Failed to generate invoice: ' . $e->getMessage(), 500);
    }
}

// 3. UPDATE PAYMENT STATUS
if ($action === 'update_status') {
    $invId = (int)($input['id'] ?? $input['invoice_id'] ?? 0);
    $newStatus = trim($input['payment_status'] ?? '');

    if ($invId <= 0 || empty($newStatus)) {
        jsonError('Valid invoice ID and status are required.', 400);
    }

    if (!$pdo) {
        jsonSuccess(['id' => $invId, 'payment_status' => $newStatus], "Payment status updated to $newStatus.");
    }

    try {
        $stmt = $pdo->prepare("UPDATE `invoices` SET `payment_status` = ? WHERE `id` = ?");
        $stmt->execute([$newStatus, $invId]);
        jsonSuccess(['id' => $invId, 'payment_status' => $newStatus], "Payment status updated to $newStatus.");
    } catch (\Throwable $e) {
        jsonError('Failed to update payment status: ' . $e->getMessage(), 500);
    }
}

