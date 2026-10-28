<?php
/**
 * inquiry-admin/api/update_inquiry.php — Update Inquiry Status & Notes
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$id = (int)($input['id'] ?? 0);

if ($id <= 0) {
    jsonError('Invalid inquiry ID', 400);
}

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

$updates = [];
$params = [];

if (isset($input['status'])) {
    $validStatuses = ['New', 'Contacted', 'Follow-up', 'Converted', 'Lost'];
    if (in_array($input['status'], $validStatuses)) {
        $updates[] = "status = ?";
        $params[] = $input['status'];
    }
}

if (isset($input['notes'])) {
    $updates[] = "notes = ?";
    $params[] = trim($input['notes']);
}

if (isset($input['destination'])) {
    $updates[] = "destination = ?";
    $params[] = trim($input['destination']);
}

if (isset($input['assigned_to'])) {
    $updates[] = "assigned_to = ?";
    $params[] = trim($input['assigned_to']);
}

if (empty($updates)) {
    jsonError('No fields provided to update', 400);
}

$params[] = $id;
$sql = "UPDATE inquiries SET " . implode(", ", $updates) . " WHERE id = ?";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonSuccess([], 'Inquiry updated successfully.');
} catch (\PDOException $e) {
    error_log("Update inquiry error: " . $e->getMessage());
    jsonError('Failed to update inquiry', 500);
}
