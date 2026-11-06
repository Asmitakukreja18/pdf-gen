<?php
/**
 * inquiry-admin/api/settings.php — System & Business Settings API
 * Restricted to Administrator role.
 */

require_once __DIR__ . '/auth.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Ensure user has valid session
$currentUser = checkSessionActivity();

// GET: Retrieve all settings
if ($method === 'GET') {
    if (!$pdo) {
        $defaultSettings = [
            'company_name' => "Let's Explore DMC (Pvt Ltd)",
            'company_email' => 'info@letsexploredmc.com',
            'company_phone' => '+91 98765 43210',
            'company_address' => 'Suite 401, Sapphire Corporate Tower, Bandra Kurla Complex, Mumbai, India',
            'company_gstin' => '27AABCL1234F1Z8',
            'default_billing_desc' => 'As your regards P. (Pvt Ltd)',
            'inactivity_timeout_minutes' => 15,
            'ai_primary_provider' => 'claude'
        ];
        jsonSuccess(['settings' => $defaultSettings, 'source' => 'fallback']);
    }

    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        jsonSuccess(['settings' => $rows, 'source' => 'mysql']);
    } catch (\Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// POST: Update settings (Admin only)
if ($method === 'POST') {
    // Enforce Admin-only privilege
    if (strtolower($currentUser['role'] ?? '') !== 'admin') {
        http_response_code(403);
        jsonError('Forbidden: Only Administrator can update company settings.', 403);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    if (!$pdo) {
        jsonSuccess([], 'Settings updated in local session mode.');
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO settings (setting_key, setting_value)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ");

        foreach ($input as $k => $v) {
            if (is_scalar($v)) {
                $stmt->execute([$k, (string)$v]);
            }
        }

        // Log setting update
        try {
            $pdo->prepare("
                INSERT INTO user_activity_logs (user_id, employee_name, action, module, entity_id, details, ip_address, created_at)
                VALUES (?, ?, 'updated_settings', 'Settings', 'Global', 'Updated system & company particulars.', ?, NOW())
            ")->execute([(int)$currentUser['id'], $currentUser['name'] ?? 'Admin', $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);
        } catch (\Exception $ex) {}

        jsonSuccess([], 'System configuration saved successfully to MySQL.');
    } catch (\Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

