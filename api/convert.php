<?php
/**
 * api/convert.php — Headless LibreOffice Document to PDF Converter
 * Part of Let's Explore DMC CRM + AI PDF Studio
 * 
 * Capabilities:
 * - Converts DOCX, DOC, XLSX, XLS, ODT to high-fidelity PDF via LibreOffice headless CLI
 * - Preserves native formatting, tables, fonts, colors, and margins
 * - Fast server-side conversion with secure output sandboxing
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($requestMethod === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Locate LibreOffice binary on Linux/cPanel or Windows
function findLibreOfficeBinary() {
    $candidates = [
        'libreoffice',
        'soffice',
        '/usr/bin/libreoffice',
        '/usr/bin/soffice',
        '/usr/local/bin/libreoffice',
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    ];

    foreach ($candidates as $bin) {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            if (file_exists($bin)) return $bin;
        } else {
            $check = @shell_exec("which " . escapeshellarg($bin) . " 2>/dev/null");
            if (!empty($check)) return trim($check);
            if (file_exists($bin) && is_executable($bin)) return $bin;
        }
    }

    // Try bare command execution
    $out = @shell_exec((strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'where soffice' : 'which libreoffice') . ' 2>&1');
    if (!empty($out) && strpos($out, 'not found') === false && strpos($out, 'Could not find') === false) {
        $lines = explode("\n", trim($out));
        if (!empty($lines[0]) && file_exists(trim($lines[0]))) {
            return trim($lines[0]);
        }
    }

    return null;
}

$loBin = findLibreOfficeBinary();

// GET: Status check
if ($requestMethod === 'GET') {
    echo json_encode([
        'success' => true,
        'service' => 'LibreOffice Document Converter',
        'available' => !empty($loBin),
        'binary_path' => $loBin ?: 'Not installed or not in PATH',
        'supported_formats' => ['docx', 'doc', 'xlsx', 'xls', 'odt', 'rtf', 'txt', 'csv']
    ]);
    exit;
}

// POST: Execute Conversion
if ($requestMethod === 'POST') {
    if (!$loBin) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'error' => 'LibreOffice is not installed on this server environment. Please convert documents via client-side PDF export or install libreoffice package on the host.',
            'libreoffice_missing' => true
        ]);
        exit;
    }

    $outDir = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR . 'converted';
    if (!is_dir($outDir)) {
        @mkdir($outDir, 0755, true);
    }

    $sourcePath = null;
    $originalName = 'document';

    // File upload
    if (!empty($_FILES['file']['tmp_name']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $originalName = $_FILES['file']['name'];
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $sourcePath = $outDir . DIRECTORY_SEPARATOR . 'src_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        move_uploaded_file($_FILES['file']['tmp_name'], $sourcePath);
    } else {
        // JSON with file path
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        if (!empty($input['filePath'])) {
            $candidate = realpath($input['filePath']);
            if ($candidate && file_exists($candidate)) {
                $sourcePath = $candidate;
                $originalName = basename($candidate);
            }
        }
    }

    if (!$sourcePath || !file_exists($sourcePath)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No valid file provided for LibreOffice conversion.'
        ]);
        exit;
    }

    $cmd = escapeshellarg($loBin) . ' --headless --convert-to pdf ' . 
           escapeshellarg($sourcePath) . ' --outdir ' . escapeshellarg($outDir);

    $raw = @shell_exec($cmd . ' 2>&1');

    $baseNoExt = pathinfo($sourcePath, PATHINFO_FILENAME);
    $expectedPdf = $outDir . DIRECTORY_SEPARATOR . $baseNoExt . '.pdf';

    if (file_exists($expectedPdf)) {
        $pdfUrl = rtrim(UPLOAD_URL, '/\\') . '/converted/' . basename($expectedPdf);
        echo json_encode([
            'success' => true,
            'service' => 'LibreOffice',
            'original_file' => $originalName,
            'pdf_file' => basename($expectedPdf),
            'pdf_path' => $expectedPdf,
            'pdf_url' => $pdfUrl,
            'size_bytes' => filesize($expectedPdf)
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Conversion failed: ' . trim($raw)
        ]);
    }
}
