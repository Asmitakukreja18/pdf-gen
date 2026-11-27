<?php
/**
 * api/extract_document.php — Production Document & Asset Extractor Endpoint
 * Part of Let's Explore DMC AI PDF & DOCX Recreation System (Phase 1)
 * Extracts original embedded images, tables, and structured text from PDF and DOCX.
 * 100% Local Execution, Zero AI API Tokens consumed.
 */

require_once __DIR__ . '/config.php';

if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$sessionId = bin2hex(random_bytes(8));
$baseUploads = rtrim(UPLOAD_DIR, '/\\');
$sessionDir = $baseUploads . DIRECTORY_SEPARATOR . 'sessions' . DIRECTORY_SEPARATOR . $sessionId;
$assetsDir = $sessionDir . DIRECTORY_SEPARATOR . 'assets';

if (!is_dir($assetsDir)) {
    @mkdir($assetsDir, 0755, true);
}

$inputFilePath = null;
$originalName = 'document';

// Case A: Multipart File Upload
if (!empty($_FILES['file']['tmp_name']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
    $originalName = $_FILES['file']['name'];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $inputFilePath = $sessionDir . DIRECTORY_SEPARATOR . 'source_' . time() . '.' . $ext;
    move_uploaded_file($_FILES['file']['tmp_name'], $inputFilePath);
} else {
    // Case B: JSON Payload with serverFilePath
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    
    if (!empty($payload['serverFilePath'])) {
        $candidate = $baseUploads . DIRECTORY_SEPARATOR . basename($payload['serverFilePath']);
        if (file_exists($candidate)) {
            $inputFilePath = $candidate;
            $originalName = $payload['originalName'] ?? basename($candidate);
        }
    }
}

if (!$inputFilePath || !file_exists($inputFilePath)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'No valid document file provided for asset extraction.'
    ]);
    exit;
}

$webPrefix = 'uploads/sessions/' . $sessionId . '/assets';
$scriptPath = realpath(__DIR__ . '/../scripts/extract_assets.py');

$outputJson = null;

// 1. Google Document AI (Tier 1 for PDFs and Scanned Documents if enabled)
$ext = strtolower(pathinfo($inputFilePath, PATHINFO_EXTENSION));
$settingsPath = function_exists('getSecureAiSettingsPath') ? getSecureAiSettingsPath(false) : (__DIR__ . '/../data/ai_settings.json');
$aiSettings = file_exists($settingsPath) ? json_decode(@file_get_contents($settingsPath), true) : [];

if (!empty($aiSettings['document_ai_enabled']) && !empty($aiSettings['document_ai_project_id']) && !empty($aiSettings['document_ai_processor_id'])) {
    if (in_array($ext, ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'webp'])) {
        require_once __DIR__ . '/document_ai.php';
        $b64 = base64_encode(file_get_contents($inputFilePath));
        $mime = getFileMime($inputFilePath);
        $docAiConfig = [
            'enabled'      => true,
            'project_id'   => trim($aiSettings['document_ai_project_id']),
            'location'     => trim($aiSettings['document_ai_location'] ?? 'us'),
            'processor_id' => trim($aiSettings['document_ai_processor_id']),
            'api_key'      => trim($aiSettings['document_ai_api_key'] ?? ''),
            'service_account_json' => trim($aiSettings['document_ai_service_account_json'] ?? '')
        ];
        $docAiRes = callGoogleDocumentAi($docAiConfig, $b64, $mime);
        if ($docAiRes && !empty($docAiRes['success'])) {
            $outputJson = [
                'success' => true,
                'provider' => 'Google Document AI',
                'format' => $ext,
                'file_name' => $originalName,
                'page_count' => $docAiRes['page_count'] ?? 1,
                'character_count' => $docAiRes['character_count'] ?? 0,
                'tables' => $docAiRes['tables'] ?? [],
                'form_fields' => $docAiRes['form_fields'] ?? [],
                'full_text' => $docAiRes['text'] ?? ''
            ];
        }
    }
}

// 2. Python Extractor Engine (Tier 2 / Local Standard)
if (!$outputJson && $scriptPath && file_exists($scriptPath)) {
    $pythonCmd = 'python';
    $cmd = escapeshellcmd($pythonCmd) . ' ' . 
           escapeshellarg($scriptPath) . ' --input ' . 
           escapeshellarg($inputFilePath) . ' --outdir ' . 
           escapeshellarg($assetsDir) . ' --webpath ' . 
           escapeshellarg($webPrefix);

    $rawOutput = @shell_exec($cmd . ' 2>&1');
    if ($rawOutput) {
        $parsed = json_decode(trim($rawOutput), true);
        if ($parsed && !empty($parsed['success'])) {
            $outputJson = $parsed;
        }
    }
}

// 2b. Native Standalone Image Handler (PNG, JPG, JPEG, WEBP, GIF)
if (!$outputJson && in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'])) {
    $safeName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $originalName);
    $dest = $assetsDir . DIRECTORY_SEPARATOR . $safeName;
    @copy($inputFilePath, $dest);
    $imgInfo = @getimagesize($inputFilePath);
    $w = $imgInfo[0] ?? 800;
    $h = $imgInfo[1] ?? 600;
    $webUrl = $webPrefix . '/' . $safeName;
    $outputJson = [
        'success' => true,
        'format' => $ext,
        'file_name' => $originalName,
        'total_images' => 1,
        'images' => [[
            'name' => $originalName,
            'local_path' => $dest,
            'web_path' => $webUrl,
            'size_bytes' => @filesize($inputFilePath) ?: 0,
            'width' => $w,
            'height' => $h,
            'is_logo' => (stripos($originalName, 'logo') !== false),
            'page' => 1
        ]],
        'tables' => [],
        'full_text' => "[Image Document: {$originalName}]"
    ];
}

// 2. Native PHP ZipArchive Fallback (for DOCX if Python unavailable)
$ext = strtolower(pathinfo($inputFilePath, PATHINFO_EXTENSION));
if (!$outputJson && ($ext === 'docx' || $ext === 'doc') && class_exists('ZipArchive')) {
    $zip = new ZipArchive();
    if ($zip->open($inputFilePath) === TRUE) {
        $extractedImages = [];
        $extractedTables = [];
        $paragraphs = [];
        $structuredParts = [];

        // 1. Extract embedded images
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $entryName = $stat['name'];
            if (strpos($entryName, 'word/media/') === 0 && substr($entryName, -1) !== '/') {
                $base = basename($entryName);
                $dest = $assetsDir . DIRECTORY_SEPARATOR . $base;
                copy("zip://" . $inputFilePath . "#" . $entryName, $dest);
                $webUrl = $webPrefix . '/' . $base;
                $extractedImages[] = [
                    'name' => $base,
                    'local_path' => $dest,
                    'web_path' => $webUrl,
                    'size_bytes' => @filesize($dest) ?: 0,
                    'is_logo' => (stripos($base, 'logo') !== false),
                    'page' => 1
                ];
            }
        }

        // 2. Parse word/document.xml for paragraphs and tables
        if ($zip->locateName('word/document.xml') !== false) {
            $docXml = $zip->getFromName('word/document.xml');
            if ($docXml) {
                $dom = new DOMDocument();
                @$dom->loadXML($docXml);
                $xpath = new DOMXPath($dom);
                $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

                $bodyNodes = $xpath->query('//w:body/*');
                if ($bodyNodes) {
                    foreach ($bodyNodes as $node) {
                        $tag = strtolower($node->localName);
                        if ($tag === 'p') {
                            $tList = [];
                            foreach ($xpath->query('.//w:t', $node) as $t) {
                                $tList[] = $t->nodeValue;
                            }
                            $pText = trim(implode('', $tList));
                            if (!empty($pText)) {
                                $paragraphs[] = $pText;
                                $structuredParts[] = $pText;
                            }
                        } elseif ($tag === 'tbl') {
                            $tblRows = [];
                            foreach ($xpath->query('.//w:tr', $node) as $tr) {
                                $cells = [];
                                foreach ($xpath->query('.//w:tc', $tr) as $tc) {
                                    $cTexts = [];
                                    foreach ($xpath->query('.//w:t', $tc) as $t) {
                                        $cTexts[] = $t->nodeValue;
                                    }
                                    $cells[] = trim(implode('', $cTexts));
                                }
                                if (array_filter($cells)) {
                                    $tblRows[] = $cells;
                                }
                            }
                            if (!empty($tblRows)) {
                                $extractedTables[] = $tblRows;
                                $structuredParts[] = "\n--- [TABLE] ---";
                                foreach ($tblRows as $r) {
                                    $structuredParts[] = implode(' | ', $r);
                                }
                                $structuredParts[] = "--- [END TABLE] ---\n";
                            }
                        }
                    }
                }
            }
        }
        $zip->close();
        
        $outputJson = [
            'success' => true,
            'format' => 'docx',
            'file_name' => $originalName,
            'total_images' => count($extractedImages),
            'images' => $extractedImages,
            'tables' => $extractedTables,
            'paragraphs_count' => count($paragraphs),
            'full_text' => implode("\n", $structuredParts)
        ];
    }
}

if ($outputJson) {
    $outputJson['session_id'] = $sessionId;
    echo json_encode($outputJson);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Asset extraction failed for file: ' . $originalName
    ]);
}
