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
            PDO::ATTR_TIMEOUT            => 2,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        ensureDatabaseSchemaSynced($pdo);
        return $pdo;
    } catch (\PDOException $e) {
        error_log("Database connection failure: " . $e->getMessage());
        return null;
    }
}

/**
 * Automatically sync and upgrade schema columns in background
 */
function ensureDatabaseSchemaSynced(\PDO $pdo) {
    static $synced = false;
    if ($synced) return;
    $synced = true;

    try {
        // 1. Ensure users table has all modern CRM columns
        $hasUsers = $pdo->query("SHOW TABLES LIKE 'users'")->fetch();
        if ($hasUsers) {
            $userCols = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'name'")->fetchAll();
            if (empty($userCols)) {
                $pdo->exec("ALTER TABLE `users` 
                    ADD COLUMN `name` VARCHAR(100) NOT NULL DEFAULT '' AFTER `username`,
                    ADD COLUMN `phone` VARCHAR(30) DEFAULT NULL AFTER `email`,
                    ADD COLUMN `permissions` TEXT DEFAULT NULL AFTER `role`,
                    ADD COLUMN `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER `permissions`,
                    ADD COLUMN `last_login` DATETIME DEFAULT NULL AFTER `status`,
                    ADD COLUMN `last_activity` DATETIME DEFAULT NULL AFTER `last_login`");
            }
        }

        // 2. Ensure documents table has uploaded_by column
        $hasDocs = $pdo->query("SHOW TABLES LIKE 'documents'")->fetch();
        if ($hasDocs) {
            $docCols = $pdo->query("SHOW COLUMNS FROM `documents` LIKE 'uploaded_by'")->fetchAll();
            if (empty($docCols)) {
                $pdo->exec("ALTER TABLE `documents` ADD COLUMN `uploaded_by` INT UNSIGNED DEFAULT 1 AFTER `mime_type`");
            }
        }

        // 3. Ensure quotations table has 6 additional tour columns
        $hasQuotes = $pdo->query("SHOW TABLES LIKE 'quotations'")->fetch();
        if ($hasQuotes) {
            $quoteCols = $pdo->query("SHOW COLUMNS FROM `quotations` LIKE 'hotel_name'")->fetchAll();
            if (empty($quoteCols)) {
                $pdo->exec("ALTER TABLE `quotations` 
                    ADD COLUMN `hotel_name` VARCHAR(150) DEFAULT NULL AFTER `pax_count`,
                    ADD COLUMN `hotel_nights` VARCHAR(50) DEFAULT NULL AFTER `hotel_name`,
                    ADD COLUMN `flight_airline` VARCHAR(100) DEFAULT NULL AFTER `hotel_nights`,
                    ADD COLUMN `flight_sector` VARCHAR(100) DEFAULT NULL AFTER `flight_airline`,
                    ADD COLUMN `flights_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `flight_sector`,
                    ADD COLUMN `land_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `flights_total`");
            }
        }

        // 4. Ensure inquiries compatibility view exists
        $hasLeads = $pdo->query("SHOW TABLES LIKE 'leads'")->fetch();
        if ($hasLeads) {
            $pdo->exec("CREATE OR REPLACE VIEW `inquiries` AS SELECT * FROM `leads`");
        }
    } catch (\Throwable $e) {
        error_log("Schema auto-sync notice: " . $e->getMessage());
    }
}

/**
 * Compatibility aliases
 */
function getDatabaseConnection() {
    return getDb();
}

function getDbConnection() {
    return getDb();
}

