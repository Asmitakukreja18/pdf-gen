<?php
/**
 * admin/index.php — Server-Side Authentication Guard for Admin Portal
 * 
 * If the user is not logged in, redirects immediately to login.html.
 * If logged in, serves index.html dashboard.
 */

require_once __DIR__ . '/../api/config.php';

if (empty($_SESSION['admin_user']) || empty($_SESSION['admin_user']['id'])) {
    header('Location: login.html');
    exit;
}

// Serve dashboard HTML
readfile(__DIR__ . '/index.html');
exit;
