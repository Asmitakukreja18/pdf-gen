<?php
/**
 * inquiry-admin/api/delete_inquiry.php — Delete Inquiry Record
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST' && $method !== 'DELETE') {
    jsonError('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$id = (int)($input['id'] ?? $_GET['id'] ?? 0);

if ($id <= 0) {
    jsonError('Invalid inquiry ID', 400);
}

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

try {
    $stmt = $pdo->prepare("DELETE FROM inquiries WHERE id = ?");
    $stmt->execute([$id]);
    jsonSuccess([], 'Inquiry deleted successfully.');
} catch (\PDOException $e) {
    error_log("Delete inquiry error: " . $e->getMessage());
    jsonError('Failed to delete inquiry', 500);
}
