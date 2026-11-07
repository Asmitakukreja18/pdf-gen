<?php
/**
 * api/documents.php — Document Listing, Search, Filter & Metadata Updates
 * With graceful disk scanning fallback if database setup is pending
 */

require_once __DIR__ . '/auth.php';

$pdo = getDb();
$method = $_SERVER['REQUEST_METHOD'];

// Graceful fallback if database is not yet connected
if (!$pdo) {
    if ($method === 'GET') {
        $fallbackDocs = [];

        // 1. Load from saved_quotations.json if present
        if (defined('LOCAL_FALLBACK_FILE') && file_exists(LOCAL_FALLBACK_FILE)) {
            $saved = json_decode(file_get_contents(LOCAL_FALLBACK_FILE), true) ?: [];
            foreach ($saved as $q) {
                $ref = $q['quote_ref'] ?? 'LEDMC-QTN-001';
                $client = $q['client_name'] ?? 'Valued Guest';
                $dest = $q['destination'] ?? 'Holiday Tour';
                $fallbackDocs[] = [
                    'id' => $ref,
                    'doc_no' => $ref,
                    'title' => "{$client} — {$dest} ({$ref})",
                    'description' => ($q['duration'] ?? 'Custom Tour') . ' | Total: ₹ ' . number_format($q['grand_total'] ?? 0, 2),
                    'customer_name' => $client,
                    'destination' => $dest,
                    'file_name' => preg_replace('/[^A-Za-z0-9_\-]/', '_', "{$client}_{$ref}") . '.pdf',
                    'file_path' => '../view.html?ref=' . urlencode($ref),
                    'created_at' => $q['updated_at'] ?? date('Y-m-d H:i:s'),
                    'created_by_name' => 'Dipesh Batra (Staff)',
                    'doc_type' => 'Quotation',
                    'status' => $q['status'] ?? 'Approved'
                ];
            }
        }

        // 2. Scan physical uploads directory
        $uploadDir = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR;
        if (is_dir($uploadDir)) {
            $files = glob($uploadDir . '*.pdf');
            if ($files) {
                foreach ($files as $idx => $fpath) {
                    $bname = basename($fpath);
                    $fsize = filesize($fpath);
                    $ftime = date('Y-m-d H:i:s', filemtime($fpath));
                    $cleanTitle = ucwords(preg_replace('/^\d+_[0-9a-f]+_/', '', pathinfo($bname, PATHINFO_FILENAME)));
                    $cleanTitle = str_replace(['_', '-'], ' ', $cleanTitle);
                    $fallbackDocs[] = [
                        'id' => $idx + 100,
                        'doc_no' => 'LEDMC-PDF-' . ($idx + 1),
                        'title' => $cleanTitle,
                        'description' => 'Stored PDF Document in cPanel storage',
                        'customer_name' => 'Corporate Partner',
                        'destination' => 'International',
                        'category_id' => null,
                        'file_name' => $bname,
                        'file_path' => 'uploads/' . $bname,
                        'file_size' => $fsize,
                        'mime_type' => 'application/pdf',
                        'created_at' => $ftime,
                        'updated_at' => $ftime,
                        'category_name' => 'General',
                        'doc_type' => 'General',
                        'created_by_name' => 'Admin',
                        'uploader_username' => 'Admin',
                        'status' => 'Approved',
                        'comment_count' => 0
                    ];
                }
            }
        }
        jsonSuccess([
            'documents' => $fallbackDocs,
            'total' => count($fallbackDocs),
            'note' => 'Storage disk mode active. Import database.sql into phpMyAdmin for full relational tagging.'
        ]);
    }
    jsonError('Database connection unavailable. Please verify api/config.php database settings.', 500);
}

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
                $fp = '../view.html?ref=' . urlencode($uq['quote_ref']);
                $ins = $pdo->prepare("INSERT INTO `documents` (`title`, `description`, `category_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `uploaded_by`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, 102400, 'application/pdf', 1, ?, ?)");
                $ins->execute([$t, $d, $cId, $fn, $fp, $uq['created_at'], $uq['updated_at']]);
            }
        }

        // Migrate any existing documents pointing to index.html?load= over to view.html?ref=
        $pdo->exec("UPDATE `documents` SET `file_path` = REPLACE(`file_path`, 'index.html?load=', 'view.html?ref=') WHERE `file_path` LIKE '%index.html?load=%'");
    } catch (\PDOException $syncErr) {
        // Safe to ignore if quotations table does not exist yet
    }

    $query .= " ORDER BY d.id DESC";

    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $documents = $stmt->fetchAll();

        // Enrich fields for Admin & Staff Table View
        foreach ($documents as &$doc) {
            $title = $doc['title'] ?? '';
            $desc = $doc['description'] ?? '';

            // Extract Ref Code
            if (preg_match('/(LEDMC-[A-Za-z0-9_\-]+)/', $title, $m)) {
                $doc['doc_no'] = $m[1];
            } else {
                $doc['doc_no'] = 'LEDMC-DOC-' . str_pad($doc['id'], 4, '0', STR_PAD_LEFT);
            }

            // Extract Customer & Destination
            if (strpos($title, '—') !== false) {
                $parts = explode('—', $title);
                $doc['customer_name'] = trim($parts[0]);
                $after = trim($parts[1] ?? '');
                $doc['destination'] = trim(preg_replace('/\s*\(.*?\)\s*/', '', $after)) ?: 'International';
            } elseif (strpos($title, '-') !== false) {
                $parts = explode('-', $title);
                $doc['customer_name'] = trim($parts[0]);
                $doc['destination'] = trim($parts[1] ?? 'International');
            } else {
                $doc['customer_name'] = 'Valued Guest';
                $doc['destination'] = 'International';
            }

            $doc['doc_type'] = $doc['category_name'] ?: 'Quotation';
            $doc['created_by_name'] = !empty($doc['uploader_username']) ? ucwords($doc['uploader_username']) : 'Admin';
            $doc['status'] = 'Approved';
        }
        unset($doc);

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
        jsonSuccess(null, 'Document details updated successfully.');
    } catch (\PDOException $e) {
        error_log('Document update error: ' . $e->getMessage());
        jsonError('Failed to update document details.', 500);
    }
}

// DELETE: Remove document
if ($method === 'DELETE') {
    requireAuth();
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonError('Document ID is required.', 400);
    }

    try {
        $stmt = $pdo->prepare("SELECT file_name FROM documents WHERE id = ?");
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        if ($doc) {
            $delStmt = $pdo->prepare("DELETE FROM documents WHERE id = ?");
            $delStmt->execute([$id]);

            if (!empty($doc['file_name'])) {
                $filePath = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR . $doc['file_name'];
                if (file_exists($filePath)) {
                    @unlink($filePath);
                }
            }
            jsonSuccess(null, 'Document permanently deleted.');
        } else {
            jsonError('Document not found.', 404);
        }
    } catch (\PDOException $e) {
        error_log('Document delete error: ' . $e->getMessage());
        jsonError('Failed to delete document.', 500);
    }
}
