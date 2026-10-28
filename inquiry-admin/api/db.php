<?php
/**
 * inquiry-admin/api/db.php — Database Connector for Inquiry Admin Module
 */

// Inherit settings from root api/config.php if available, else define defaults
$rootConfig = __DIR__ . '/../../api/config.php';
if (file_exists($rootConfig)) {
    require_once $rootConfig;
} else {
    defined('DB_HOST') or define('DB_HOST', 'localhost');
    defined('DB_NAME') or define('DB_NAME', 'letsexplore_pdf');
    defined('DB_USER') or define('DB_USER', 'letsexplore_admin');
    defined('DB_PASS') or define('DB_PASS', 'AdminPass_2026!');
    defined('DB_CHARSET') or define('DB_CHARSET', 'utf8mb4');
}

// Session security
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError($message, $statusCode = 400, $extra = []) {
    $payload = array_merge(['success' => false, 'error' => $message], $extra);
    jsonResponse($payload, $statusCode);
}

function jsonSuccess($data = [], $message = 'Success') {
    $payload = array_merge(['success' => true, 'message' => $message], $data);
    jsonResponse($payload, 200);
}

function getDb() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (\PDOException $e) {
        error_log("Inquiry DB error: " . $e->getMessage());
        return null;
    }
}
