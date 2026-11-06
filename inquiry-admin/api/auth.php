<?php
/**
 * inquiry-admin/api/auth.php — Centralized Role-Based Auth & 15-Minute Inactivity Middleware
 */

require_once __DIR__ . '/db.php';

function checkSessionActivity($requiredRole = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $user = $_SESSION['inquiry_admin'] ?? $_SESSION['admin_user'] ?? null;
    if (!$user || empty($user['id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Authentication required. Please log in.',
            'code' => 'UNAUTHENTICATED'
        ]);
        exit;
    }

    // 15-minute inactivity check (900 seconds)
    $lastActive = $_SESSION['last_activity_time'] ?? time();
    $inactivityLimit = 900; // 15 mins

    if ((time() - $lastActive) > $inactivityLimit) {
        $pdo = getDb();
        if ($pdo && !empty($user['id'])) {
            try {
                $pdo->prepare("
                    UPDATE login_history 
                    SET status = 'expired', 
                        logout_time = NOW(),
                        session_duration_mins = TIMESTAMPDIFF(MINUTE, login_time, NOW())
                    WHERE user_id = ? AND status = 'active'
                    ORDER BY id DESC LIMIT 1
                ")->execute([(int)$user['id']]);

                $pdo->prepare("UPDATE users SET status = 'inactive' WHERE id = ?")
                    ->execute([(int)$user['id']]);
            } catch (\Exception $e) {}
        }

        // Clear session
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();

        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Session expired due to 15 minutes of inactivity. Please log in again.',
            'code' => 'SESSION_EXPIRED',
            'is_relogin_needed' => true
        ]);
        exit;
    }

    // Update active timestamp
    $_SESSION['last_activity_time'] = time();

    // Check Role if specified (e.g. 'admin')
    if ($requiredRole !== null) {
        $userRole = strtolower($user['role'] ?? 'executive');
        if ($requiredRole === 'admin' && $userRole !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Access denied. Administrator privileges required.',
                'code' => 'FORBIDDEN'
            ]);
            exit;
        }
    }

    return $user;
}

function getActiveUser() {
    return $_SESSION['inquiry_admin'] ?? $_SESSION['admin_user'] ?? null;
}
