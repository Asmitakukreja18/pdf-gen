<?php
/**
 * api/auth.php — Authentication Middleware and Session Helpers
 */

require_once __DIR__ . '/db.php';

/**
 * Check if the user is logged in
 */
function isAuthenticated() {
    return !empty($_SESSION['admin_user']) && !empty($_SESSION['admin_user']['id']);
}

/**
 * Require authentication or terminate with 401 Unauthorized
 */
function requireAuth() {
    if (!isAuthenticated()) {
        jsonError('Unauthorized access. Please log in.', 401);
    }
    return $_SESSION['admin_user'];
}

/**
 * Return current logged in user details or null
 */
function getCurrentUser() {
    return isAuthenticated() ? $_SESSION['admin_user'] : null;
}
