<?php
/**
 * api/db.php — Secure Database Connection & JSON Response Helpers
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * Return JSON response and exit
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send JSON error response
 */
function jsonError($message, $statusCode = 400, $extra = []) {
    $payload = array_merge(['success' => false, 'error' => $message], $extra);
    jsonResponse($payload, $statusCode);
}

/**
 * Send JSON success response
 */
function jsonSuccess($data = [], $message = 'Success') {
    $payload = array_merge(['success' => true, 'message' => $message], $data);
    jsonResponse($payload, 200);
}

/**
 * Get PDO database instance
 */
function getDb() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

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
        error_log("Database connection failure: " . $e->getMessage());
        return null;
    }
}
