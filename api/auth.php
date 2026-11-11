<?php
/**
 * api/auth.php — Authentication Middleware and Session Helpers
 */

require_once __DIR__ . '/db.php';

/**
 * Check if user is logged in and session is active
 */
function isAuthenticated() {
    $user = $_SESSION['admin_user'] ?? $_SESSION['inquiry_admin'] ?? null;
    if (empty($user) || empty($user['id'])) {
        return false;
    }

    // Check if user is Admin: Admin NEVER times out due to inactivity!
    $userRole = strtolower($user['role'] ?? '');
    $userName = strtolower($user['username'] ?? '');
    $isAdmin = ($userRole === 'admin' || $userName === 'admin');

    if (!$isAdmin) {
        // 15-minute inactivity check (900 seconds) for non-admin staff
        $lastActive = $_SESSION['last_activity_time'] ?? time();
        if ((time() - $lastActive) > 900) {
            $_SESSION = [];
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_destroy();
            }
            return false;
        }
    }

    // Update active timestamp
    $_SESSION['last_activity_time'] = time();
    return true;
}

/**
 * Require authentication or terminate with 401 Unauthorized
 */
function requireAuth($requiredRole = null) {
    if (!isAuthenticated()) {
        jsonError('Unauthorized access or session expired due to inactivity. Please log in.', 401, ['code' => 'SESSION_EXPIRED']);
    }

    $user = getCurrentUser();
    if ($requiredRole !== null) {
        $userRole = strtolower($user['role'] ?? 'executive');
        if ($requiredRole === 'admin' && $userRole !== 'admin') {
            jsonError('Access denied. Administrator privileges required.', 403, ['code' => 'FORBIDDEN']);
        }
    }

    return $user;
}

/**
 * Return current logged in user details or null
 */
function getCurrentUser() {
    return $_SESSION['admin_user'] ?? $_SESSION['inquiry_admin'] ?? null;
}
