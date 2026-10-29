<?php
/**
 * api/documents.php — Document Listing, Search, Filter & Metadata Updates
 */

require_once __DIR__ . '/auth.php';

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: Retrieve documents or single document
if ($method === 'GET') {
    // Single document
    if (!empty($_GET['id'])) {
        $id = (int)$_GET['id'];
        $stmt = $pdo->prepare("
            SELECT d.*, c.name AS category_name, u.username AS uploader_username
            FROM documents d
            LEFT JOIN categories c ON d.category_id = c.id
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.id = ?
        ");
        $stmt->execute([$id]);
        $doc = $stmt->fetch();
        if (!$doc) {
            jsonError('Document not found', 404);
        }
        jsonSuccess(['document' => $doc]);
    }

    // List with filters & search
    $categoryId = isset($_GET['category_id']) && $_GET['category_id'] !== '' ? (int)$_GET['category_id'] : null;
    $search = trim($_GET['search'] ?? '');
    
    $query = "
        SELECT d.id, d.title, d.description, d.category_id, d.file_name, d.file_path, 
               d.file_size, d.mime_type, d.created_at, d.updated_at,
               c.name AS category_name,
               u.username AS uploader_username,
               (SELECT COUNT(*) FROM comments cm WHERE cm.document_id = d.id) AS comment_count
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE 1=1
    ";
    $params = [];

    if ($categoryId !== null && $categoryId > 0) {
        $query .= " AND d.category_id = ?";
        $params[] = $categoryId;
    }

    if ($search !== '') {
        $query .= " AND (d.title LIKE ? OR d.description LIKE ? OR d.file_name LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    // Auto-sync any quotations from quotations table into documents table
    try {
        $unsyncedStmt = $pdo->query("
            SELECT q.* FROM `quotations` q
            WHERE NOT EXISTS (
                SELECT 1 FROM `documents` d WHERE d.title LIKE CONCAT('%', q.quote_ref, '%')
            )
        ");
        if ($unsyncedStmt) {
            $unsynced = $unsyncedStmt->fetchAll();
            foreach ($unsynced as $uq) {
                $cId = (stripos($uq['quote_ref'], 'INV') !== false) ? 1 : 2;
                $t = ($uq['client_name'] ?: 'Guest') . ' — ' . ($uq['destination'] ?: 'Holiday') . ' (' . $uq['quote_ref'] . ')';
                $d = ($uq['duration'] ?: 'Custom Tour') . ' | ' . ($uq['pax_count'] ?: '2 Pax') . ' | Total: ₹ ' . number_format($uq['grand_total'], 2);
                $fn = preg_replace('/[^A-Za-z0-9_\-]/', '_', ($uq['client_name'] ?: 'Quotation') . '_' . $uq['quote_ref']) . '.pdf';
                $fp = '../index.html?load=' . urlencode($uq['quote_ref']);
                $ins = $pdo->prepare("INSERT INTO `documents` (`title`, `description`, `category_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `uploaded_by`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, 102400, 'application/pdf', 1, ?, ?)");
                $ins->execute([$t, $d, $cId, $fn, $fp, $uq['created_at'], $uq['updated_at']]);
            }
        }
    } catch (\PDOException $syncErr) {
        // Safe to ignore if quotations table does not exist yet
    }

    $query .= " ORDER BY d.id DESC";

    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $documents = $stmt->fetchAll();
        jsonSuccess([
            'documents' => $documents,
            'total' => count($documents)
        ]);
    } catch (\PDOException $e) {
        error_log('Documents fetch error: ' . $e->getMessage());
        jsonError('Failed to fetch documents', 500);
    }
}

// POST: Update document metadata
if ($method === 'POST') {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    $id = (int)($input['id'] ?? 0);
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $categoryId = !empty($input['category_id']) ? (int)$input['category_id'] : null;

    if ($id <= 0 || empty($title)) {
        jsonError('Document ID and Title are required.', 400);
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE documents 
            SET title = ?, description = ?, category_id = ?
            WHERE id = ?
        ");
        $stmt->execute([$title, $description, $categoryId, $id]);

        jsonSuccess([], 'Document metadata updated successfully.');
    } catch (\PDOException $e) {
        error_log('Document update error: ' . $e->getMessage());
        jsonError('Failed to update document metadata', 500);
    }
}

jsonError('Method not allowed', 405);
