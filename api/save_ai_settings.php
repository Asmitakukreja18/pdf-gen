<?php
/**
 * api/save_ai_settings.php — Secure AI Key Configuration & Connection Tester
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/../data/ai_settings.json';

// GET: Return current configuration status (masking actual keys for security)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $settings = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) : [];
    $claudeKey = $settings['claude_api_key'] ?? '';
    $geminiKey = $settings['gemini_api_key'] ?? '';

    $mask = function($k) {
        if (empty($k) || strpos($k, 'YOUR_') !== false) return '';
        if (strlen($k) < 12) return '********';
        return substr($k, 0, 7) . '...' . substr($k, -4);
    };

    echo json_encode([
        'success' => true,
        'has_claude_key' => (!empty($claudeKey) && strpos($claudeKey, 'YOUR_') === false),
        'claude_key_masked' => $mask($claudeKey),
        'has_gemini_key' => (!empty($geminiKey) && strpos($geminiKey, 'YOUR_') === false),
        'gemini_key_masked' => $mask($geminiKey),
        'default_provider' => $settings['default_provider'] ?? 'auto'
    ]);
    exit;
}

// POST: Save and optionally test credentials
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = $input['action'] ?? 'save';

    $existing = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) : [];
    if (!is_array($existing)) $existing = [];

    // 1. TEST KEY ACTION
    if ($action === 'test') {
        $provider = $input['provider'] ?? 'claude';
        $key = trim($input['key'] ?? '');

        if (empty($key)) {
            // Check if saved key exists
            $key = ($provider === 'claude') ? ($existing['claude_api_key'] ?? '') : ($existing['gemini_api_key'] ?? '');
        }

        if (empty($key) || strpos($key, 'YOUR_') !== false) {
            echo json_encode(['success' => false, 'error' => "Please enter a valid $provider API key to test."]);
            exit;
        }

        if ($provider === 'claude') {
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
                    'model' => 'claude-3-5-haiku-20241022',
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
                echo json_encode(['success' => true, 'message' => 'Anthropic Claude API Key is valid and operational!']);
            } else {
                $msg = $json['error']['message'] ?? "HTTP $code";
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

    // 2. SAVE SETTINGS ACTION
    if (isset($input['claude_api_key']) && !empty(trim($input['claude_api_key']))) {
        $existing['claude_api_key'] = trim($input['claude_api_key']);
    }
    if (isset($input['gemini_api_key']) && !empty(trim($input['gemini_api_key']))) {
        $existing['gemini_api_key'] = trim($input['gemini_api_key']);
    }
    if (isset($input['default_provider'])) {
        $existing['default_provider'] = trim($input['default_provider']);
    }

    $existing['updated_at'] = date('Y-m-d H:i:s');

    @file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    echo json_encode([
        'success' => true,
        'message' => 'AI Engine credentials updated and securely saved.'
    ]);
    exit;
}

