<?php
/**
 * api/delete.php — Secure Document Deletion
 */

require_once __DIR__ . '/auth.php';

// Authentication strictly required
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST' && $method !== 'DELETE') {
    jsonError('Method not allowed. Use POST or DELETE.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$id = (int)($input['id'] ?? $_GET['id'] ?? 0);

if ($id <= 0) {
    jsonError('Invalid document ID provided.', 400);
}

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

try {
    // 1. Get file information first
    $stmt = $pdo->prepare("SELECT file_name FROM documents WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();

    if (!$doc) {
        jsonError('Document not found or already deleted.', 404);
    }

    // 2. Delete database record (foreign keys cascade comments)
    $delStmt = $pdo->prepare("DELETE FROM documents WHERE id = ?");
    $delStmt->execute([$id]);

    // 3. Remove physical file from server storage
    if (!empty($doc['file_name'])) {
        $uploadDir = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR;
        $filePath = $uploadDir . $doc['file_name'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    jsonSuccess([], 'Document and associated file deleted successfully.');

} catch (\PDOException $e) {
    error_log('Delete document error: ' . $e->getMessage());
    jsonError('Failed to delete document from database.', 500);
}
