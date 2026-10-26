<?php
/**
 * api/db.php — Database Connection Handler with Graceful Fallback
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function getDatabaseConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // Check if placeholder password hasn't been changed yet
    if (DB_PASS === 'YourStrongPasswordHere' || DB_NAME === 'letsexplore_quotes') {
        return null; // Will trigger fallback mode
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
        // Return null to let the API fallback to JSON store instead of crashing
        error_log("Database connection error: " . $e->getMessage());
        return null;
    }
}
