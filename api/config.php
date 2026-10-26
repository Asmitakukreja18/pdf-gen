<?php
/**
 * api/config.php — Database Configuration for cPanel MySQL
 * 
 * Instructions for RazorHost / cPanel:
 * 1. Go to cPanel -> Databases -> Database Wizard
 * 2. Create database name (e.g., u123456_quotes)
 * 3. Create user (e.g., u123456_user) with strong password
 * 4. Assign ALL PRIVILEGES to user on that database
 * 5. Update the 4 constants below with those details
 */

// Database Host (usually 'localhost' in cPanel)
define('DB_HOST', 'localhost');

// Database Name created in cPanel
define('DB_NAME', 'letsexplore_quotes');

// Database Username created in cPanel
define('DB_USER', 'letsexplore_dbuser');

// Database Password
define('DB_PASS', 'YourStrongPasswordHere');

// Character Set
define('DB_CHARSET', 'utf8mb4');

// Fallback file path if MySQL connection is not configured yet
define('LOCAL_FALLBACK_FILE', __DIR__ . '/../data/saved_quotations.json');
