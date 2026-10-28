<?php
/**
 * api/comments.php — Document Comments & Internal Notes API
 */

require_once __DIR__ . '/auth.php';

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: Retrieve comments for a document
if ($method === 'GET') {
    $docId = (int)($_GET['document_id'] ?? 0);
    if ($docId <= 0) {
        jsonError('Valid document_id is required', 400);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT cm.id, cm.document_id, cm.comment, cm.created_at,
                   u.username, u.email, u.role
            FROM comments cm
            LEFT JOIN users u ON cm.user_id = u.id
            WHERE cm.document_id = ?
            ORDER BY cm.created_at ASC
        ");
        $stmt->execute([$docId]);
        $comments = $stmt->fetchAll();
        jsonSuccess(['comments' => $comments]);
    } catch (\PDOException $e) {
        error_log('Comments fetch error: ' . $e->getMessage());
        jsonError('Failed to fetch comments', 500);
    }
}

// POST: Add comment (Authentication required)
if ($method === 'POST') {
    $currentUser = requireAuth();
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    $docId = (int)($input['document_id'] ?? 0);
    $comment = trim($input['comment'] ?? '');

    if ($docId <= 0 || empty($comment)) {
        jsonError('Document ID and comment content are required.', 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO comments (document_id, user_id, comment) VALUES (?, ?, ?)");
        $stmt->execute([$docId, $currentUser['id'], $comment]);
        $commentId = $pdo->lastInsertId();

        jsonSuccess([
            'comment' => [
                'id'          => (int)$commentId,
                'document_id' => $docId,
                'user_id'     => $currentUser['id'],
                'username'    => $currentUser['username'],
                'comment'     => $comment,
                'created_at'  => date('Y-m-d H:i:s')
            ]
        ], 'Comment added successfully.');
    } catch (\PDOException $e) {
        error_log('Comment insert error: ' . $e->getMessage());
        jsonError('Failed to save comment', 500);
    }
}

// DELETE: Delete a comment (Admin only)
if ($method === 'DELETE') {
    $currentUser = requireAuth();
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonError('Invalid comment ID', 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM comments WHERE id = ?");
        $stmt->execute([$id]);
        jsonSuccess([], 'Comment deleted successfully.');
    } catch (\PDOException $e) {
        jsonError('Failed to delete comment', 500);
    }
}

jsonError('Method not allowed', 405);
