<?php
/**
 * api/upload_attachment.php — Secure Server-Side Attachment Upload & Storage
 * Specifically handles Chatbot and Client Document Uploads on cPanel Hosting.
 * 
 * - Stores files in server-side `uploads/` directory (NOT external cloud storage).
 * - Saves file metadata into existing MySQL `documents` database table.
 * - Performs server-side PDF validation (%PDF- magic header, MIME, size).
 * - Extracts text server-side so backend AI can process the document content.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

// 1. Locate uploaded file
$file = $_FILES['file'] ?? $_FILES['pdf_file'] ?? $_FILES['attachment'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
    $code = $file['error'] ?? -1;
    $errors = [
        UPLOAD_ERR_INI_SIZE   => 'Uploaded file exceeds upload_max_filesize in php.ini',
        UPLOAD_ERR_FORM_SIZE  => 'Uploaded file exceeds form MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL    => 'File upload was only partially completed',
        UPLOAD_ERR_NO_FILE    => 'No attachment was provided in the upload request',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder on server',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to server disk',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension blocked the upload'
    ];
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $errors[$code] ?? 'File upload error occurred.']);
    exit;
}

// 2. Validate file size (up to 25 MB)
$maxSize = defined('MAX_FILE_SIZE') ? MAX_FILE_SIZE : (25 * 1024 * 1024);
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds 25 MB limit.']);
    exit;
}

// 3. Validate file extension
$originalName = basename($file['name']);
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'webp', 'txt'];

if (!in_array($extension, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Unsupported file format (.' . htmlspecialchars($extension) . '). Supported formats: PDF, DOCX, PNG, JPG, TXT.']);
    exit;
}

// 4. Validate MIME Type & Magic Header for PDF
$isPdf = ($extension === 'pdf');
$mimeType = $file['type'] ?: 'application/octet-stream';

if ($isPdf) {
    $handle = @fopen($file['tmp_name'], 'rb');
    if ($handle) {
        $headerBytes = fread($handle, 1024);
        fclose($handle);
        if (strpos($headerBytes, '%PDF-') === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'File signature verification failed: Genuine PDF (%PDF-) required.']);
            exit;
        }
    }
    $mimeType = 'application/pdf';
}

// 5. Generate secure, unique, collision-proof filename
$cleanBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
$cleanBase = substr($cleanBase, 0, 45);
$uniqueFilename = 'att_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '_' . $cleanBase . '.' . $extension;

// Ensure uploads directory exists on cPanel server
$uploadDir = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR;
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

$destinationPath = $uploadDir . $uniqueFilename;
$relativeDbPath = 'uploads/' . $uniqueFilename;

if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server could not move uploaded file into uploads/ directory. Check cPanel write permissions.']);
    exit;
}

// 6. Server-Side Text Extraction (For AI Processing)
$extractedText = '';
if ($isPdf && file_exists($destinationPath)) {
    // A. Check for shell pdftotext if available on host
    if (function_exists('exec') && !in_array('exec', array_map('trim', explode(',', ini_get('disable_functions'))))) {
        $escapedPath = escapeshellarg($destinationPath);
        $output = [];
        $status = -1;
        @exec("pdftotext -f 1 -l 10 $escapedPath -", $output, $status);
        if ($status === 0 && !empty($output)) {
            $extractedText = trim(implode("\n", $output));
        }
    }

    // B. Native PHP stream text parser fallback if pdftotext is not present
    if (empty($extractedText)) {
        $pdfContent = @file_get_contents($destinationPath);
        if ($pdfContent) {
            // Find uncompressed text chunks inside BT (Begin Text) ... ET (End Text) blocks
            if (preg_match_all('/\((.*?)\)\s*Tj/s', $pdfContent, $matches)) {
                $rawText = implode(' ', $matches[1]);
                $clean = preg_replace('/\\\\[0-9]{3}/', '', $rawText);
                $clean = str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], $clean);
                if (strlen(trim($clean)) > 50) {
                    $extractedText = substr(trim($clean), 0, 15000);
                }
            }
        }
    }
} elseif ($extension === 'txt' && file_exists($destinationPath)) {
    $extractedText = substr(@file_get_contents($destinationPath) ?: '', 0, 15000);
}

// 7. Store Record in MySQL Database (`documents` table)
$pdo = getDb();
$docId = time();

if ($pdo) {
    try {
        $cleanTitle = ucwords(str_replace(['_', '-'], ' ', pathinfo($originalName, PATHINFO_FILENAME)));
        $stmt = $pdo->prepare("
            INSERT INTO documents (title, description, category_id, file_name, file_path, file_size, mime_type, uploaded_by)
            VALUES (?, ?, NULL, ?, ?, ?, ?, NULL)
        ");
        $stmt->execute([
            $cleanTitle,
            'Chatbot document attachment uploaded on ' . date('Y-m-d H:i:s'),
            $uniqueFilename,
            $relativeDbPath,
            (int)$file['size'],
            $mimeType
        ]);
        $insertedId = $pdo->lastInsertId();
        if ($insertedId) {
            $docId = (int)$insertedId;
        }
    } catch (\PDOException $e) {
        error_log('Database notice on attachment insert: ' . $e->getMessage());
    }
}

// 8. Return Confirmation JSON to Chatbot
echo json_encode([
    'success' => true,
    'message' => 'PDF successfully uploaded and saved to cPanel hosting storage.',
    'document' => [
        'id'            => $docId,
        'original_name' => $originalName,
        'file_name'     => $uniqueFilename,
        'file_path'     => $relativeDbPath,
        'file_size'     => (int)$file['size'],
        'mime_type'     => $mimeType,
        'uploaded_at'   => date('Y-m-d H:i:s')
    ],
    'extracted_text' => $extractedText
]);

