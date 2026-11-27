<?php
/**
 * api/whatsapp_cloud.php — Meta WhatsApp Cloud API Production Dispatch Gateway
 * Part of Let's Explore DMC CRM + AI PDF Studio
 * 
 * Capabilities:
 * - Direct official Meta Graph API v21.0 integration
 * - Sends PDF quotations, invoices, vouchers directly to client's WhatsApp (as document attachments)
 * - Sends formatted text messages with itinerary details & tracking links
 * - Phone number sanitization and E.164 international standardization
 * - Fallback to WhatsApp Click-to-Chat if unconfigured or outside 24h window
 * - Secure token storage outside public web directory
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

$reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($reqMethod === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load Secure Settings
$settingsPath = function_exists('getSecureAiSettingsPath') ? getSecureAiSettingsPath(false) : (__DIR__ . '/../data/ai_settings.json');
$settings = file_exists($settingsPath) ? json_decode(@file_get_contents($settingsPath), true) : [];
if (!is_array($settings)) $settings = [];

$waConfig = [
    'enabled'         => !empty($settings['whatsapp_cloud_enabled']) || !empty($settings['whatsapp_access_token']),
    'phone_number_id' => trim($settings['whatsapp_phone_number_id'] ?? ''),
    'access_token'    => trim($settings['whatsapp_access_token'] ?? ''),
    'waba_id'         => trim($settings['whatsapp_business_account_id'] ?? '')
];

/**
 * Standardize phone number into E.164 format (without '+' sign for WhatsApp API)
 * E.g., '9876543210' -> '919876543210', '+91 98765 43210' -> '919876543210'
 */
function standardizePhoneNumber($phone) {
    $clean = preg_replace('/[^0-9]/', '', $phone);
    // If 10 digits and starts with 6-9, assume Indian mobile number (+91)
    if (strlen($clean) === 10 && preg_match('/^[6-9]/', $clean)) {
        return '91' . $clean;
    }
    // If starts with 0 and is 11 digits (e.g. 09876543210), strip 0 and prepend 91
    if (strlen($clean) === 11 && strpos($clean, '0') === 0) {
        return '91' . substr($clean, 1);
    }
    return $clean;
}

/**
 * Call Meta Graph API for WhatsApp Cloud Messages
 */
function callWhatsAppGraphApi($waConfig, $payload) {
    if (empty($waConfig['access_token']) || empty($waConfig['phone_number_id'])) {
        return [
            'success' => false,
            'error' => 'WhatsApp Cloud API is not configured. Access Token and Phone Number ID are required in Settings.',
            'unconfigured' => true
        ];
    }

    $url = "https://graph.facebook.com/v21.0/" . urlencode($waConfig['phone_number_id']) . "/messages";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $waConfig['access_token'],
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return [
            'success' => false,
            'error' => 'WhatsApp Cloud API connection error: ' . $curlErr
        ];
    }

    $json = json_decode($res, true);
    if ($httpCode >= 200 && $httpCode < 300) {
        $msgId = $json['messages'][0]['id'] ?? 'wamid.success';
        return [
            'success' => true,
            'provider' => 'WhatsApp Cloud API',
            'message_id' => $msgId,
            'recipient' => $payload['to'] ?? '',
            'meta' => $json
        ];
    }

    $errorObj = $json['error'] ?? [];
    $errMsg = $errorObj['message'] ?? ("Meta API HTTP $httpCode");
    $errType = $errorObj['type'] ?? 'GraphMethodException';
    $errCode = $errorObj['code'] ?? $httpCode;

    return [
        'success' => false,
        'http_code' => $httpCode,
        'error' => $errMsg,
        'error_code' => $errCode,
        'error_type' => $errType,
        'details' => $errorObj
    ];
}

/**
 * Send PDF Document via WhatsApp Cloud API
 */
function sendWhatsAppDocument($waConfig, $toPhone, $pdfUrl, $fileName, $caption = '') {
    $to = standardizePhoneNumber($toPhone);
    $payload = [
        'messaging_product' => 'whatsapp',
        'recipient_type'    => 'individual',
        'to'                => $to,
        'type'              => 'document',
        'document'          => [
            'link'     => $pdfUrl,
            'filename' => $fileName ?: 'Quotation.pdf'
        ]
    ];
    if (!empty($caption)) {
        $payload['document']['caption'] = mb_substr($caption, 0, 1024); // WhatsApp caption limit
    }
    return callWhatsAppGraphApi($waConfig, $payload);
}

/**
 * Send Formatted Text Message via WhatsApp Cloud API
 */
function sendWhatsAppText($waConfig, $toPhone, $messageText, $previewUrl = true) {
    $to = standardizePhoneNumber($toPhone);
    $payload = [
        'messaging_product' => 'whatsapp',
        'recipient_type'    => 'individual',
        'to'                => $to,
        'type'              => 'text',
        'text'              => [
            'preview_url' => $previewUrl,
            'body'        => $messageText
        ]
    ];
    return callWhatsAppGraphApi($waConfig, $payload);
}

// Only execute HTTP request routing if called directly as an endpoint
$isDirectCall = (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'whatsapp_cloud.php');
if (!$isDirectCall && php_sapi_name() === 'cli' && defined('WHATSAPP_LIB_ONLY')) {
    return;
}

// ── GET: Check Status or Test ──
if ($reqMethod === 'GET') {
    $action = $_GET['action'] ?? 'status';

    if ($action === 'status') {
        echo json_encode([
            'success' => true,
            'service' => 'WhatsApp Cloud API',
            'configured' => (!empty($waConfig['access_token']) && !empty($waConfig['phone_number_id'])),
            'phone_number_id' => $waConfig['phone_number_id'] ? (substr($waConfig['phone_number_id'], 0, 4) . '***') : '',
            'has_token' => !empty($waConfig['access_token']),
            'waba_id' => $waConfig['waba_id'] ? (substr($waConfig['waba_id'], 0, 4) . '***') : '',
            'enabled' => $waConfig['enabled']
        ]);
        exit;
    }

    if ($action === 'test') {
        $testPhone = $_GET['phone'] ?? '919876543210';
        $testMsg = "Hello from Let's Explore DMC! ✈️ This is a test confirmation from your AI PDF Studio WhatsApp Cloud API integration.";
        $res = sendWhatsAppText($waConfig, $testPhone, $testMsg, false);
        echo json_encode($res);
        exit;
    }
}

// ── POST: Send Document or Message ──
if ($reqMethod === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? $_POST;

    $recipientPhone = $input['recipient_phone'] ?? ($input['phone'] ?? '');
    if (empty($recipientPhone)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Recipient phone number is required.'
        ]);
        exit;
    }

    $toStandard = standardizePhoneNumber($recipientPhone);
    $pdfUrl = $input['pdf_url'] ?? ($input['document_url'] ?? '');
    $docRef = $input['doc_no'] ?? ($input['doc_ref'] ?? 'Quotation');
    $caption = $input['caption'] ?? ($input['message'] ?? "Greetings from Let's Explore DMC! Please find your travel document attached ($docRef).");
    $fileName = $input['file_name'] ?? ($docRef . '.pdf');

    // Case 1: WhatsApp Cloud API is configured -> Attempt direct dispatch
    if (!empty($waConfig['access_token']) && !empty($waConfig['phone_number_id'])) {
        $result = null;
        if (!empty($pdfUrl)) {
            $result = sendWhatsAppDocument($waConfig, $toStandard, $pdfUrl, $fileName, $caption);
        } else {
            $result = sendWhatsAppText($waConfig, $toStandard, $caption);
        }

        if ($result && !empty($result['success'])) {
            echo json_encode([
                'success' => true,
                'method' => 'whatsapp_cloud_api',
                'message' => "Quotation PDF dispatched directly to client on WhatsApp (+{$toStandard})!",
                'message_id' => $result['message_id'],
                'recipient' => $toStandard,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit;
        }

        // If Cloud API returned an error (e.g. 24h window closed or token expired), log and provide seamless click-to-chat fallback
        $apiError = $result['error'] ?? 'Cloud API dispatch error';
        $waText = "Hello!\n\n" . $caption . (!empty($pdfUrl) ? "\n\n📄 Download Quotation: " . $pdfUrl : '');
        $clickToChatUrl = "https://api.whatsapp.com/send?phone=" . urlencode($toStandard) . "&text=" . urlencode($waText);

        echo json_encode([
            'success' => true,
            'method' => 'click_to_chat_fallback',
            'warning' => 'WhatsApp Cloud API notice: ' . $apiError . '. Switched to 1-Click WhatsApp Chat.',
            'whatsapp_url' => $clickToChatUrl,
            'recipient' => $toStandard,
            'message' => 'Opened 1-Click WhatsApp dispatch window.'
        ]);
        exit;
    }

    // Case 2: WhatsApp Cloud API not yet configured -> Instant 1-Click WhatsApp Click-to-Chat
    $waText = "Hello!\n\n" . $caption . (!empty($pdfUrl) ? "\n\n📄 Download Quotation: " . $pdfUrl : '');
    $clickToChatUrl = "https://api.whatsapp.com/send?phone=" . urlencode($toStandard) . "&text=" . urlencode($waText);

    echo json_encode([
        'success' => true,
        'method' => 'click_to_chat',
        'whatsapp_url' => $clickToChatUrl,
        'recipient' => $toStandard,
        'message' => 'WhatsApp Cloud API unconfigured. Ready to send via 1-Click WhatsApp Chat.'
    ]);
}
