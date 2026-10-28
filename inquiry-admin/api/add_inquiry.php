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

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO inquiries (name, phone, email, source, destination, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$name, $phone, $email, $source, $destination, $message, $status]);
    $newId = $pdo->lastInsertId();

    jsonSuccess([
        'inquiry' => [
            'id' => (int)$newId,
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'source' => $source,
            'destination' => $destination,
            'message' => $message,
            'status' => $status,
            'created_at' => date('Y-m-d H:i:s')
        ]
    ], 'Inquiry recorded successfully.');

} catch (\PDOException $e) {
    error_log("Add inquiry error: " . $e->getMessage());
    jsonError('Failed to record inquiry in database', 500);
}
