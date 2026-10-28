<?php
/**
 * api/config.php — Configuration for Let's Explore DMC Private PDF System
 * 
 * cPanel Setup:
 * 1. cPanel -> MySQL Databases -> Create database: letsexplore_pdf
 * 2. Create MySQL user: letsexplore_admin (with strong password)
 * 3. Add user to database with ALL PRIVILEGES
 * 4. Update DB_USER, DB_PASS, DB_NAME below
 */

// Database Host
defined('DB_HOST') or define('DB_HOST', 'localhost');

// Database Name
defined('DB_NAME') or define('DB_NAME', 'letsexplore_pdf');

// Database Username
defined('DB_USER') or define('DB_USER', 'letsexplore_admin');

// Database Password
defined('DB_PASS') or define('DB_PASS', 'AdminPass_2026!');

// Character Set
defined('DB_CHARSET') or define('DB_CHARSET', 'utf8mb4');

// Upload Directory (Physical file storage on cPanel server)
defined('UPLOAD_DIR') or define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// Upload URL path (Relative to web root for download/view)
defined('UPLOAD_URL') or define('UPLOAD_URL', '../uploads/');

// Maximum upload file size in bytes (25MB)
defined('MAX_FILE_SIZE') or define('MAX_FILE_SIZE', 25 * 1024 * 1024);

// Allowed MIME types
defined('ALLOWED_MIMES') or define('ALLOWED_MIMES', serialize([
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',
    'applications/vnd.pdf',
    'text/pdf',
    'text/x-pdf'
]));

// Session Security Configuration
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}
