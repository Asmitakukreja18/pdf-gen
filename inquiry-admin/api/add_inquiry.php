<?php
/**
 * inquiry-admin/api/add_inquiry.php — Add Inquiry from Website Form or Admin Panel
 * 
 * Supports both JSON body and standard Form POST.
 * CORS is enabled so your public Let's Explore website forms can submit directly.
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$name = trim($input['name'] ?? '');
$phone = trim($input['phone'] ?? '');
$email = trim($input['email'] ?? '');
$source = trim($input['source'] ?? 'Website');
$destination = trim($input['destination'] ?? $input['package'] ?? '');
$message = trim($input['message'] ?? $input['notes'] ?? '');
$status = trim($input['status'] ?? 'New');

if (empty($name) || empty($phone)) {
    jsonError('Name and Phone number are required.', 400);
}

// Normalize source
$validSources = ['Website', 'WhatsApp', 'Instagram', 'Facebook', 'Walk-in', 'Referral', 'Other'];
if (!in_array($source, $validSources)) {
    $source = 'Website';
}

function getInquiriesJsonPath() {
    $dir = __DIR__ . '/../../data';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir . '/inquiries.json';
}

function loadLocalInquiries() {
    $file = getInquiriesJsonPath();
    if (file_exists($file)) {
        $json = @file_get_contents($file);
        $arr = json_decode($json, true);
        if (is_array($arr)) return $arr;
    }
    return [];
}

function saveLocalInquiries($items) {
    $file = getInquiriesJsonPath();
    @file_put_contents($file, json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

$newInquiry = [
    'id' => time(),
    'name' => $name,
    'phone' => $phone,
    'email' => $email,
    'source' => $source,
    'destination' => $destination,
    'message' => $message,
    'status' => $status,
    'created_at' => date('Y-m-d H:i:s')
];

$pdo = getDb();
if (!$pdo) {
    $all = loadLocalInquiries();
    array_unshift($all, $newInquiry);
    saveLocalInquiries($all);
    jsonSuccess(['inquiry' => $newInquiry], 'Inquiry recorded successfully (Local Storage Sync).');
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO inquiries (name, phone, email, source, destination, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$name, $phone, $email, $source, $destination, $message, $status]);
    $newId = $pdo->lastInsertId();
    $newInquiry['id'] = (int)$newId;

    // Sync to local json cache as well
    $all = loadLocalInquiries();
    array_unshift($all, $newInquiry);
    saveLocalInquiries($all);

    jsonSuccess([
        'inquiry' => $newInquiry
    ], 'Inquiry recorded successfully.');

} catch (\Throwable $e) {
    error_log("Add inquiry DB error: " . $e->getMessage());
    $all = loadLocalInquiries();
    array_unshift($all, $newInquiry);
    saveLocalInquiries($all);
    jsonSuccess(['inquiry' => $newInquiry], 'Inquiry recorded successfully (Fallback Storage).');
}
