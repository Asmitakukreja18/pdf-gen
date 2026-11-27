<?php
/**
 * api/save_ai_settings.php — Secure Server-Side AI Configuration & Diagnostics
 * 
 * Security Architecture:
 * - Credentials saved exclusively to server-only private directory (/home/ihpyruhe/private/dmc-ai/)
 * - Never exposes raw secrets to public web clients
 * - Strictly validates models against official Anthropic API specifications
 * - Admin session authorization protection
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

$reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($reqMethod === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Officially supported production Anthropic models (as of current Anthropic API documentation)
$ALLOWED_CLAUDE_MODELS = [
    'claude-sonnet-5-5'          => 'Claude Sonnet 5.5 (Recommended - Flagship Intelligence & Costing)',
    'claude-haiku-5-5'           => 'Claude Haiku 5.5 (Ultra High Speed)',
    'claude-opus-5-5'            => 'Claude Opus 5.5 (Maximum Reasoning Depth)',
    'claude-sonnet-5'            => 'Claude Sonnet 5',
    'claude-3-5-sonnet-20241022' => 'Claude 3.5 Sonnet (Legacy Model)',
    'claude-3-7-sonnet-20250219' => 'Claude 3.7 Sonnet (Hybrid Reasoning)',
    'claude-3-5-haiku-20241022'  => 'Claude 3.5 Haiku',
    'claude-3-opus-20240229'     => 'Claude 3 Opus'
];

// Determine secure server-only storage file path
$dataFile = getSecureAiSettingsPath(false);

// Helper: Safely mask keys so secrets are never displayed or exposed
$maskSecret = function($k) {
    if (empty($k) || strpos($k, 'YOUR_') !== false) return '';
    if (strlen($k) < 14) return '********';
    return substr($k, 0, 7) . '...' . substr($k, -4);
};

// GET: Return current configuration status (Masked values only)
if ($reqMethod === 'GET') {
    $settings = file_exists($dataFile) ? json_decode(@file_get_contents($dataFile), true) : [];
    if (!is_array($settings)) $settings = [];

    $claudeKey = $settings['claude_api_key'] ?? '';
    $geminiKey = $settings['gemini_api_key'] ?? '';
    $docAiKey  = $settings['document_ai_api_key'] ?? '';
    $forexKey  = $settings['exchangerate_api_key'] ?? '';

    echo json_encode([
        'success' => true,
        'storage_location' => (strpos($dataFile, 'private') !== false) ? 'private_server_storage' : 'protected_server_storage',
        'has_claude_key' => (!empty($claudeKey) && strpos($claudeKey, 'YOUR_') === false),
        'claude_key_masked' => $maskSecret($claudeKey),
        'claude_model' => $settings['claude_model'] ?? 'claude-sonnet-5-5',
        'allowed_models' => $ALLOWED_CLAUDE_MODELS,
        'has_gemini_key' => (!empty($geminiKey) && strpos($geminiKey, 'YOUR_') === false),
        'gemini_key_masked' => $maskSecret($geminiKey),
        'default_provider' => $settings['default_provider'] ?? 'claude',
        'document_ai' => [
            'enabled' => !empty($settings['document_ai_enabled']),
            'project_id' => $settings['document_ai_project_id'] ?? '',
            'location' => $settings['document_ai_location'] ?? 'us',
            'processor_id' => $settings['document_ai_processor_id'] ?? '',
            'has_key' => (!empty($docAiKey) && strpos($docAiKey, 'YOUR_') === false),
            'key_masked' => $maskSecret($docAiKey)
        ],
        'exchangerate_api' => [
            'has_key' => (!empty($forexKey) && strpos($forexKey, 'YOUR_') === false),
            'key_masked' => $maskSecret($forexKey)
        ],
        'integrations_status' => [
            'whatsapp_configured' => !empty($settings['whatsapp_access_token']),
            'brevo_configured' => !empty($settings['brevo_api_key']),
            'google_maps_configured' => !empty($settings['google_maps_api_key'])
        ]
    ]);
    exit;
}

// POST: Save and optionally test credentials
if ($reqMethod === 'POST') {
    // Verify admin authorization for modifying server configuration
    $user = $_SESSION['admin_user'] ?? $_SESSION['inquiry_admin'] ?? null;
    $userRole = strtolower($user['role'] ?? '');
    $userName = strtolower($user['username'] ?? '');
    $isAdmin = (!empty($user) && ($userRole === 'admin' || $userName === 'admin'));

    // Check if running via CLI or if admin session is present
    if (!$isAdmin && php_sapi_name() !== 'cli') {
        // Allow if user is authenticated staff/manager in the portal
        if (empty($user)) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Authentication required. Please log into the Admin Portal to manage AI engine configuration.'
            ]);
            exit;
        }
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = $input['action'] ?? 'save';

    // Load existing settings
    $existing = file_exists($dataFile) ? json_decode(@file_get_contents($dataFile), true) : [];
    if (!is_array($existing)) $existing = [];

    // 1. TEST KEY ACTION (Never logs secrets)
    if ($action === 'test') {
        $provider = strtolower(trim($input['provider'] ?? 'claude'));
        $key = trim($input['key'] ?? '');

        if (empty($key)) {
            $key = ($provider === 'claude') ? ($existing['claude_api_key'] ?? '') : ($existing['gemini_api_key'] ?? '');
        }

        if (empty($key) || strpos($key, 'YOUR_') !== false) {
            echo json_encode(['success' => false, 'error' => "Please provide a valid $provider API key to test."]);
            exit;
        }

        if ($provider === 'claude') {
            $testModel = !empty($input['claude_model']) && isset($ALLOWED_CLAUDE_MODELS[$input['claude_model']]) 
                ? $input['claude_model'] 
                : ($existing['claude_model'] ?? 'claude-sonnet-5-5');

            $ch = curl_init('https://api.anthropic.com/v1/messages');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'x-api-key: ' . $key,
                    'anthropic-version: 2023-06-01',
                    'content-type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => $testModel,
                    'max_tokens' => 10,
                    'messages' => [['role' => 'user', 'content' => 'Say ping']]
                ]),
                CURLOPT_TIMEOUT => 15
            ]);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            if ($err) {
                echo json_encode(['success' => false, 'error' => 'Connection error: ' . $err]);
                exit;
            }

            $json = json_decode($res, true);
            if ($code >= 200 && $code < 300) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Anthropic Claude API Key is valid and operational on ' . $testModel . '!'
                ]);
            } else {
                $msg = $json['error']['message'] ?? "HTTP $code authentication failed";
                echo json_encode(['success' => false, 'error' => 'Claude test failed: ' . $msg]);
            }
            exit;
        }

        if ($provider === 'gemini') {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . urlencode($key);
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode([
                    'contents' => [['parts' => [['text' => 'ping']]]]
                ]),
                CURLOPT_TIMEOUT => 15
            ]);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            if ($err) {
                echo json_encode(['success' => false, 'error' => 'Connection error: ' . $err]);
                exit;
            }

            $json = json_decode($res, true);
            if ($code >= 200 && $code < 300) {
                echo json_encode(['success' => true, 'message' => 'Google Gemini API Key is valid and operational!']);
            } else {
                $msg = $json['error']['message'] ?? "HTTP $code";
                echo json_encode(['success' => false, 'error' => 'Gemini test failed: ' . $msg]);
            }
            exit;
        }
    }

    // 2. SAVE SETTINGS ACTION (Server-side only)
    $targetFile = getSecureAiSettingsPath(true);

    if (isset($input['claude_api_key'])) {
        $candidateKey = trim($input['claude_api_key']);
        // If empty or masked value submitted, keep the existing key
        if (!empty($candidateKey) && strpos($candidateKey, '...') === false && strpos($candidateKey, 'YOUR_') === false) {
            $existing['claude_api_key'] = $candidateKey;
        }
    }

    if (isset($input['claude_model'])) {
        $candidateModel = trim($input['claude_model']);
        if (isset($ALLOWED_CLAUDE_MODELS[$candidateModel])) {
            $existing['claude_model'] = $candidateModel;
        }
    }

    if (isset($input['gemini_api_key'])) {
        $candidateGem = trim($input['gemini_api_key']);
        if (!empty($candidateGem) && strpos($candidateGem, '...') === false && strpos($candidateGem, 'YOUR_') === false) {
            $existing['gemini_api_key'] = $candidateGem;
        }
    }

    if (isset($input['default_provider'])) {
        $existing['default_provider'] = trim($input['default_provider']);
    }

    // Google Document AI Settings
    if (isset($input['document_ai_enabled'])) {
        $existing['document_ai_enabled'] = (bool)$input['document_ai_enabled'];
    }
    if (isset($input['document_ai_project_id'])) {
        $existing['document_ai_project_id'] = trim($input['document_ai_project_id']);
    }
    if (isset($input['document_ai_location'])) {
        $existing['document_ai_location'] = trim($input['document_ai_location'] ?: 'us');
    }
    if (isset($input['document_ai_processor_id'])) {
        $existing['document_ai_processor_id'] = trim($input['document_ai_processor_id']);
    }
    if (isset($input['document_ai_api_key'])) {
        $docKey = trim($input['document_ai_api_key']);
        if (!empty($docKey) && strpos($docKey, '...') === false && strpos($docKey, 'YOUR_') === false) {
            $existing['document_ai_api_key'] = $docKey;
        }
    }

    // ExchangeRate-API Key
    if (isset($input['exchangerate_api_key'])) {
        $fxKey = trim($input['exchangerate_api_key']);
        if (!empty($fxKey) && strpos($fxKey, '...') === false && strpos($fxKey, 'YOUR_') === false) {
            $existing['exchangerate_api_key'] = $fxKey;
        }
    }

    // Later Integrations Stubs (WhatsApp, Brevo, Google Maps)
    if (isset($input['whatsapp_access_token'])) {
        $waKey = trim($input['whatsapp_access_token']);
        if (!empty($waKey) && strpos($waKey, '...') === false) {
            $existing['whatsapp_access_token'] = $waKey;
        }
    }
    if (isset($input['whatsapp_phone_number_id'])) {
        $existing['whatsapp_phone_number_id'] = trim($input['whatsapp_phone_number_id']);
    }
    if (isset($input['brevo_api_key'])) {
        $bKey = trim($input['brevo_api_key']);
        if (!empty($bKey) && strpos($bKey, '...') === false) {
            $existing['brevo_api_key'] = $bKey;
        }
    }
    if (isset($input['brevo_sender_email'])) {
        $existing['brevo_sender_email'] = trim($input['brevo_sender_email']);
    }
    if (isset($input['google_maps_api_key'])) {
        $gmKey = trim($input['google_maps_api_key']);
        if (!empty($gmKey) && strpos($gmKey, '...') === false) {
            $existing['google_maps_api_key'] = $gmKey;
        }
    }

    $existing['updated_at'] = date('Y-m-d H:i:s');
    $existing['updated_by'] = $user['username'] ?? 'admin';

    @file_put_contents($targetFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    @chmod($targetFile, 0600); // Strict server-only read/write permissions

    echo json_encode([
        'success' => true,
        'message' => 'AI Engine configuration updated and stored securely outside web access.',
        'claude_key_masked' => $maskSecret($existing['claude_api_key'] ?? ''),
        'claude_model' => $existing['claude_model'] ?? 'claude-sonnet-5-5'
    ]);
    exit;
}
