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

        // 2. Ensure documents table has all modern columns
        $hasDocs = $pdo->query("SHOW TABLES LIKE 'documents'")->fetch();
        if ($hasDocs) {
            $docCols = $pdo->query("SHOW COLUMNS FROM `documents`")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('doc_no', $docCols)) {
                $pdo->exec("ALTER TABLE `documents` 
                    ADD COLUMN `doc_no` VARCHAR(60) DEFAULT NULL AFTER `id`,
                    ADD COLUMN `doc_type` VARCHAR(50) NOT NULL DEFAULT 'quotation' AFTER `category_id`,
                    ADD COLUMN `customer_id` INT UNSIGNED DEFAULT NULL AFTER `doc_type`,
                    ADD COLUMN `customer_name` VARCHAR(150) DEFAULT NULL AFTER `customer_id`,
                    ADD COLUMN `destination` VARCHAR(150) DEFAULT NULL AFTER `customer_name`,
                    ADD COLUMN `created_by_name` VARCHAR(100) DEFAULT 'Admin' AFTER `uploaded_by`,
                    ADD COLUMN `last_updated_by` VARCHAR(100) DEFAULT 'Admin' AFTER `created_by_name`,
                    ADD COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'Draft' AFTER `last_updated_by`");
            }
            if (!in_array('uploaded_by', $docCols)) {
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

        // 4. Ensure inquiries table exists for website and CRM inquiries
        $hasInquiries = $pdo->query("SHOW TABLES LIKE 'inquiries'")->fetch();
        if (!$hasInquiries) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `inquiries` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(150) NOT NULL DEFAULT '',
                `phone` VARCHAR(30) NOT NULL,
                `email` VARCHAR(120) DEFAULT NULL,
                `source` VARCHAR(50) NOT NULL DEFAULT 'Website',
                `destination` VARCHAR(150) DEFAULT NULL,
                `message` TEXT DEFAULT NULL,
                `status` ENUM('New', 'Fresh', 'Contacted', 'Followup', 'Follow-up', 'Prospect', 'Opportunity', 'Booking', 'Converted', 'Loss', 'Lost', 'Complete') NOT NULL DEFAULT 'New',
                `assigned_to` VARCHAR(100) DEFAULT NULL,
                `notes` TEXT DEFAULT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_inq_phone` (`phone`),
                INDEX `idx_inq_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        }

        // 5. Ensure packages table exists with all rich fields
        $hasPackages = $pdo->query("SHOW TABLES LIKE 'packages'")->fetch();
        if (!$hasPackages) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `packages` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `package_code` VARCHAR(50) NOT NULL UNIQUE,
                `name` VARCHAR(200) NOT NULL,
                `country` VARCHAR(100) NOT NULL,
                `destination` VARCHAR(150) NOT NULL,
                `duration_days` INT NOT NULL DEFAULT 6,
                `duration_nights` INT NOT NULL DEFAULT 5,
                `hotel_category` VARCHAR(100) DEFAULT '4 Star Deluxe',
                `hotel_details` TEXT DEFAULT NULL,
                `inclusions` TEXT DEFAULT NULL,
                `exclusions` TEXT DEFAULT NULL,
                `highlights` TEXT DEFAULT NULL,
                `itinerary_json` LONGTEXT DEFAULT NULL,
                `pricing_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                `pricing_usd` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                `markup_percent` DECIMAL(5,2) DEFAULT 10.00,
                `client_name` VARCHAR(150) DEFAULT 'Valued Traveler',
                `client_phone` VARCHAR(40) DEFAULT NULL,
                `client_email` VARCHAR(120) DEFAULT NULL,
                `doc_type` VARCHAR(50) NOT NULL DEFAULT 'quotation',
                `version` INT UNSIGNED NOT NULL DEFAULT 1,
                `full_data` LONGTEXT DEFAULT NULL,
                `file_path` VARCHAR(500) DEFAULT NULL,
                `source_drive_file` VARCHAR(255) DEFAULT NULL,
                `original_pdf_url` VARCHAR(500) DEFAULT NULL,
                `image_url` VARCHAR(500) DEFAULT NULL,
                `is_published` TINYINT(1) NOT NULL DEFAULT 1,
                `status` ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_pkg_code` (`package_code`),
                INDEX `idx_country` (`country`),
                INDEX `idx_destination` (`destination`),
                INDEX `idx_pkg_published` (`is_published`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        } else {
            $pkgCols = $pdo->query("SHOW COLUMNS FROM `packages`")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('itinerary_json', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `itinerary_json` LONGTEXT DEFAULT NULL AFTER `highlights`");
            }
            if (!in_array('full_data', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `full_data` LONGTEXT DEFAULT NULL AFTER `itinerary_json`");
            }
            if (!in_array('client_name', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `client_name` VARCHAR(150) DEFAULT 'Valued Traveler' AFTER `markup_percent`");
            }
            if (!in_array('client_phone', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `client_phone` VARCHAR(40) DEFAULT NULL AFTER `client_name`");
            }
            if (!in_array('client_email', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `client_email` VARCHAR(120) DEFAULT NULL AFTER `client_phone`");
            }
            if (!in_array('doc_type', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `doc_type` VARCHAR(50) NOT NULL DEFAULT 'quotation' AFTER `client_email`");
            }
            if (!in_array('version', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `version` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `doc_type`");
            }
            if (!in_array('file_path', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `file_path` VARCHAR(500) DEFAULT NULL AFTER `full_data`");
            }
            if (!in_array('source_drive_file', $pkgCols)) {
                $pdo->exec("ALTER TABLE `packages` ADD COLUMN `source_drive_file` VARCHAR(255) DEFAULT NULL AFTER `file_path`");
            }
        }

        // 6. Ensure package_versions table exists for complete audit trail & version rollback
        $hasVersions = $pdo->query("SHOW TABLES LIKE 'package_versions'")->fetch();
        if (!$hasVersions) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `package_versions` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `package_id` INT UNSIGNED NOT NULL,
                `package_code` VARCHAR(50) NOT NULL,
                `version` INT UNSIGNED NOT NULL DEFAULT 1,
                `change_summary` VARCHAR(255) DEFAULT NULL,
                `doc_type` VARCHAR(50) DEFAULT 'quotation',
                `full_data` LONGTEXT NOT NULL,
                `pricing_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                `pricing_usd` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                `created_by` VARCHAR(100) DEFAULT 'AI Studio',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_pv_pkg` (`package_id`),
                INDEX `idx_pv_ver` (`package_id`, `version`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
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

