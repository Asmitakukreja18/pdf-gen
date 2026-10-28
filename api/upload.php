<?php
/**
 * api/upload.php — Secure PDF Upload Handler
 */

require_once __DIR__ . '/auth.php';

// Authentication is strictly required to upload documents
$currentUser = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed. Use POST.', 405);
}

if (!isset($_FILES['pdf_file']) || $_FILES['pdf_file']['error'] !== UPLOAD_ERR_OK) {
    $code = $_FILES['pdf_file']['error'] ?? -1;
    $errors = [
        UPLOAD_ERR_INI_SIZE   => 'Uploaded file exceeds upload_max_filesize directive in php.ini',
        UPLOAD_ERR_FORM_SIZE  => 'Uploaded file exceeds MAX_FILE_SIZE directive in HTML form',
        UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No PDF file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder on server',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload'
    ];
    jsonError($errors[$code] ?? 'File upload error occurred.', 400);
}

$file = $_FILES['pdf_file'];
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$categoryId = !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null;
$replaceId = !empty($_POST['replace_id']) ? (int)$_POST['replace_id'] : null;

// 1. Validate File Size
if ($file['size'] > MAX_FILE_SIZE) {
    jsonError('File size exceeds the limit of ' . (MAX_FILE_SIZE / (1024 * 1024)) . 'MB.', 400);
}

// 2. Validate File Extension
$originalName = basename($file['name']);
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
if ($extension !== 'pdf') {
    jsonError('Invalid file extension. Only genuine PDF files (.pdf) are allowed.', 400);
}

// 3. Validate MIME Type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = unserialize(ALLOWED_MIMES);
if (!in_array(strtolower($mimeType), $allowedMimes)) {
    jsonError('Invalid file type detected (' . htmlspecialchars($mimeType) . '). Only PDF documents are allowed.', 400);
}

// 4. Validate Magic Bytes: First 5 bytes must be "%PDF-"
$handle = fopen($file['tmp_name'], 'rb');
$magicHeader = fread($handle, 5);
fclose($handle);

if ($magicHeader !== '%PDF-') {
    jsonError('File signature verification failed. The file is corrupted or not a valid PDF.', 400);
}

// 5. Generate Safe, Unique Filename
$cleanBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
$cleanBase = substr($cleanBase, 0, 50);
$uniqueFilename = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '_' . $cleanBase . '.pdf';

// Ensure upload directory exists
$uploadDir = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR;
if (!is_dir($uploadDir)) {
    if (!@mkdir($uploadDir, 0755, true)) {
        jsonError('Upload directory does not exist and could not be created. Please configure cPanel permissions.', 500);
    }
}

$destination = $uploadDir . $uniqueFilename;
$relativePath = 'uploads/' . $uniqueFilename;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    jsonError('Failed to move uploaded file to destination storage on server.', 500);
}

// Default Title if not provided
if (empty($title)) {
    $title = ucwords(str_replace(['_', '-'], ' ', pathinfo($originalName, PATHINFO_FILENAME)));
}

$pdo = getDb();
if (!$pdo) {
    @unlink($destination);
    jsonError('Database connection unavailable. File was not stored.', 500);
}

try {
    if ($replaceId > 0) {
        // Find old file to unlink
        $oldStmt = $pdo->prepare("SELECT file_name FROM documents WHERE id = ?");
        $oldStmt->execute([$replaceId]);
        $oldDoc = $oldStmt->fetch();

        $stmt = $pdo->prepare("
            UPDATE documents 
            SET title = ?, description = ?, category_id = ?, file_name = ?, file_path = ?, file_size = ?, mime_type = ?
            WHERE id = ?
        ");
        $stmt->execute([$title, $description, $categoryId, $uniqueFilename, $relativePath, $file['size'], $mimeType, $replaceId]);

        if ($oldDoc && !empty($oldDoc['file_name'])) {
            $oldPath = $uploadDir . $oldDoc['file_name'];
            if (file_exists($oldPath)) {
                @unlink($oldPath);
            }
        }

        $documentId = $replaceId;
        $msg = 'Document replaced and updated successfully.';
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO documents (title, description, category_id, file_name, file_path, file_size, mime_type, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $description, $categoryId, $uniqueFilename, $relativePath, $file['size'], $mimeType, $currentUser['id']]);
        $documentId = $pdo->lastInsertId();
        $msg = 'PDF uploaded and cataloged successfully.';
    }

    jsonSuccess([
        'document' => [
            'id'           => (int)$documentId,
            'title'        => $title,
            'description'  => $description,
            'category_id'  => $categoryId,
            'file_name'    => $uniqueFilename,
            'file_path'    => $relativePath,
            'file_size'    => (int)$file['size'],
            'created_at'   => date('Y-m-d H:i:s')
        ]
    ], $msg);

} catch (\PDOException $e) {
    @unlink($destination);
    error_log('Document insert error: ' . $e->getMessage());
    jsonError('Failed to record document metadata in database.', 500);
}
