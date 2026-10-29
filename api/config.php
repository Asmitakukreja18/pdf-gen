<?php
/**
 * api/config.php — Database & Server Configuration for cPanel
 * 
 * Configured for cPanel database: ihpyruhe_pdf_generator
 * Database user: ihpyruhe_pdf_admin
 */

// Database Host (usually 'localhost' in cPanel)
defined('DB_HOST') or define('DB_HOST', 'localhost');

// Database Name created in cPanel
defined('DB_NAME') or define('DB_NAME', 'ihpyruhe_pdf_generator');

// Database Username created in cPanel
defined('DB_USER') or define('DB_USER', 'ihpyruhe_pdf_admin');

// Database Password (configure your actual password here in cPanel File Manager)
defined('DB_PASS') or define('DB_PASS', 'YOUR_CPANEL_DATABASE_PASSWORD_HERE');

// Character Set
defined('DB_CHARSET') or define('DB_CHARSET', 'utf8mb4');

// Physical server upload directory for PDF documents
defined('UPLOAD_DIR') or define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// Web-accessible URL path for previewing/downloading PDFs
defined('UPLOAD_URL') or define('UPLOAD_URL', '../uploads/');

// Maximum upload file size (25 MB)
defined('MAX_FILE_SIZE') or define('MAX_FILE_SIZE', 25 * 1024 * 1024);

// Allowed MIME types for uploaded files
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
