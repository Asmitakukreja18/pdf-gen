<?php
/**
 * api/setup.php — Turnkey cPanel Database & Admin Initializer
 * 
 * Run once via browser or CLI to test connection, initialize tables,
 * and generate initial admin account with exact bcrypt password hash.
 */

require_once __DIR__ . '/db.php';

$pdo = getDb();
if (!$pdo) {
    jsonError("Database connection failed. Please ensure DB credentials in api/config.php match your cPanel MySQL settings.", 500);
}

try {
    // 1. Create tables if they do not exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `users` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `username` VARCHAR(50) NOT NULL UNIQUE,
          `email` VARCHAR(100) NOT NULL UNIQUE,
          `password_hash` VARCHAR(255) NOT NULL,
          `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `categories` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `name` VARCHAR(100) NOT NULL UNIQUE,
          `description` VARCHAR(255) DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `documents` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `title` VARCHAR(255) NOT NULL,
          `description` TEXT DEFAULT NULL,
          `category_id` INT UNSIGNED DEFAULT NULL,
          `file_name` VARCHAR(255) NOT NULL,
          `file_path` VARCHAR(500) NOT NULL,
          `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
          `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
          `uploaded_by` INT UNSIGNED DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `comments` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `document_id` INT UNSIGNED NOT NULL,
          `user_id` INT UNSIGNED DEFAULT NULL,
          `comment` TEXT NOT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. Ensure default categories
    $categories = [
        ['Invoices', 'Client billing invoices, tax invoices, and payment receipts'],
        ['Quotations', 'DMC travel tour proposals, itineraries, and cost sheets'],
        ['Hotel Vouchers', 'Hotel booking confirmations, room allocations, and check-in vouchers'],
        ['Flight & Transport', 'Airline booking tickets, visa paperwork, and private transport vouchers'],
        ['Marketing & Guides', 'Destination brochures, travel guides, and marketing collaterals']
    ];

    $catStmt = $pdo->prepare("INSERT IGNORE INTO `categories` (`name`, `description`) VALUES (?, ?)");
    foreach ($categories as $cat) {
        $catStmt->execute([$cat[0], $cat[1]]);
    }

    // 3. Ensure default admin user
    $defaultUser = 'admin';
    $defaultEmail = 'admin@letsexploredmc.com';
    $defaultPass = 'Admin@LetsExplore2026!';
    $passHash = password_hash($defaultPass, PASSWORD_BCRYPT);

    $checkUser = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $checkUser->execute([$defaultUser, $defaultEmail]);
    $existing = $checkUser->fetch();

    if (!$existing) {
        $userStmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')");
        $userStmt->execute([$defaultUser, $defaultEmail, $passHash]);
        $statusUser = "Created default admin user: '$defaultUser' / Password: '$defaultPass'";
    } else {
        // Update hash to ensure matching password
        $updStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $updStmt->execute([$passHash, $existing['id']]);
        $statusUser = "Admin user updated: '$defaultUser' / Password: '$defaultPass'";
    }

    // 4. Verify uploads directory
    $uploadDir = UPLOAD_DIR;
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }
    $isWritable = is_writable($uploadDir);

    jsonSuccess([
        'database_status' => 'Connected and initialized successfully',
        'tables_created'  => ['users', 'categories', 'documents', 'comments'],
        'admin_account'   => $statusUser,
        'uploads_dir'     => $uploadDir,
        'uploads_writable'=> $isWritable ? 'Yes' : 'No (Please set chmod 755 or 775 in cPanel)'
    ], 'Let\'s Explore PDF System initialized successfully.');

} catch (\PDOException $e) {
    jsonError("Database setup error: " . $e->getMessage(), 500);
}
