<?php
/**
 * inquiry-admin/api/logout.php — Destroy Admin & Staff Session with Audit Trail
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$userId = $_SESSION['inquiry_admin']['id'] ?? null;
$empName = $_SESSION['inquiry_admin']['name'] ?? ($_SESSION['inquiry_admin']['username'] ?? 'User');

if ($pdo && $userId) {
    try {
        // Record logout timestamp and session duration in login_history
        $pdo->prepare("
            UPDATE login_history 
            SET logout_time = NOW(), 
                status = 'logged_out', 
                session_duration_mins = TIMESTAMPDIFF(MINUTE, login_time, NOW())
            WHERE user_id = ? AND status = 'active'
            ORDER BY id DESC LIMIT 1
        ")->execute([(int)$userId]);

        // Record logout in activity log
        $pdo->prepare("
            INSERT INTO user_activity_logs (user_id, employee_name, action, module, entity_id, details, ip_address, created_at)
            VALUES (?, ?, 'user_logout', 'Authentication', ?, ?, ?, NOW())
        ")->execute([(int)$userId, $empName, (string)$userId, "Employee $empName logged out.", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

        // Update user status
        $pdo->prepare("UPDATE users SET status = 'inactive' WHERE id = ?")->execute([(int)$userId]);
    } catch (\Exception $e) {}
}

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

if (isset($_GET['redirect']) || empty($_SERVER['HTTP_ACCEPT']) || strpos($_SERVER['HTTP_ACCEPT'], 'application/json') === false) {
    header('Location: ../../index.html');
    exit;
}

jsonSuccess(['redirect' => '../../index.html'], 'Logged out successfully.');

