<?php
/**
 * api/logout.php — Destroy Admin Session
 */

require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_ACTIVE) {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    session_destroy();
}

jsonSuccess(['redirect' => 'login.html'], 'Logged out successfully.');
