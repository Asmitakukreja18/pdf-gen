<?php
/**
 * inquiry-admin/api/documents.php — Centralized Documents Management Gateway
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$activeUser = checkSessionActivity(); // Ensure authenticated & within 15-minute activity window
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

// 1. LIST DOCUMENTS
if ($method === 'GET' || $action === 'list') {
    $search = trim($_GET['search'] ?? '');
    $docType = $_GET['doc_type'] ?? 'all';

    $sql = "SELECT * FROM `documents` WHERE 1=1";
    $params = [];

    if ($docType !== 'all' && !empty($docType)) {
        $sql .= " AND `doc_type` = ?";
        $params[] = $docType;
    }

    if (!empty($search)) {
        $sql .= " AND (`title` LIKE ? OR `customer_name` LIKE ? OR `destination` LIKE ? OR `doc_no` LIKE ?)";
        $term = "%$search%";
        $params = array_merge($params, [$term, $term, $term, $term]);
    }

    $sql .= " ORDER BY `created_at` DESC";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonSuccess(['documents' => $docs, 'total' => count($docs)]);
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 2. UPLOAD EXISTING PDF
if ($action === 'upload' && !empty($_FILES['pdf_file'])) {
    $file = $_FILES['pdf_file'];
    $title = trim($_POST['title'] ?? 'Uploaded Travel Document');
    $customerName = trim($_POST['customer_name'] ?? 'Direct Client');
    $destination = trim($_POST['destination'] ?? 'Custom');
    $docType = trim($_POST['doc_type'] ?? 'quotation');
    $createdByName = trim($_POST['created_by_name'] ?? 'Main Admin');

    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonError('Upload error code: ' . $file['error']);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'pdf') {
        jsonError('Only valid PDF files are allowed.');
    }

    $uploadDir = __DIR__ . '/../../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $docNo = 'LEDMC-DOC-' . strtoupper(substr(uniqid(), -5));
    $safeName = 'doc_' . time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $file['name']);
    $destPath = $uploadDir . $safeName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        jsonError('Failed to save file to server storage.');
    }

    $dbFilePath = 'uploads/' . $safeName;
    $fileSize = $file['size'];

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `documents` 
            (`doc_no`, `title`, `description`, `doc_type`, `customer_name`, `destination`, `file_name`, `file_path`, `file_size`, `mime_type`, `created_by_name`, `status`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'application/pdf', ?, 'Final', NOW())
        ");
        $stmt->execute([
            $docNo, $title, "Uploaded by $createdByName", $docType, $customerName, $destination, $file['name'], $dbFilePath, $fileSize, $createdByName
        ]);
        $docId = $pdo->lastInsertId();

        // Audit log
        $pdo->prepare("
            INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
            VALUES (1, ?, 'uploaded_document', 'Documents', ?, ?, NOW())
        ")->execute([$createdByName, $docNo, "Uploaded PDF '$title' for $customerName"]);

        jsonSuccess([
            'doc_id' => $docId,
            'doc_no' => $docNo,
            'file_path' => $dbFilePath
        ], 'Document uploaded successfully!');
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

