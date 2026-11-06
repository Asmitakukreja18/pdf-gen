<?php
/**
 * inquiry-admin/api/login.php — Admin Authentication
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_SESSION['inquiry_admin'])) {
        jsonSuccess(['user' => $_SESSION['inquiry_admin']], 'Authenticated');
    } else {
        jsonError('Not authenticated', 401);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$username = trim($input['username'] ?? $input['email'] ?? '');
$password = trim($input['password'] ?? '');

if (empty($username) || empty($password)) {
    jsonError('Please provide both username and password.', 400);
}

$pdo = getDb();
if (!$pdo) {
    // Offline / Standby Fallback Authentication for Seeded Accounts
    $staticStaff = [
        'admin' => ['id' => 1, 'username' => 'admin', 'email' => 'admin@letsexploredmc.com', 'role' => 'admin', 'name' => 'Main Admin'],
        'chanchal' => ['id' => 2, 'username' => 'chanchal', 'email' => 'chanchal@letsexploredmc.com', 'role' => 'executive', 'name' => 'Chanchal Sharma'],
        'ritesh' => ['id' => 3, 'username' => 'ritesh', 'email' => 'ritesh@letsexploredmc.com', 'role' => 'executive', 'name' => 'Ritesh Verma'],
        'operations' => ['id' => 4, 'username' => 'operations', 'email' => 'ops@letsexploredmc.com', 'role' => 'agent', 'name' => 'Operations Desk'],
    ];

    $uLower = strtolower($username);
    if (isset($staticStaff[$uLower]) && in_array($password, ['Admin@123', 'LETSEXPLOREDMC'])) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
        $_SESSION['inquiry_admin'] = $staticStaff[$uLower];
        $_SESSION['admin_user'] = $_SESSION['inquiry_admin'];
        $_SESSION['last_activity_time'] = time();
        $redir = ($staticStaff[$uLower]['role'] === 'admin') ? 'dashboard.html' : 'staff.html';
        jsonSuccess(['user' => $_SESSION['inquiry_admin'], 'redirect' => $redir], 'Login successful (Standby Mode)');
    } else {
        jsonError('Invalid username or password.', 401);
    }
}

try {
    $stmt = $pdo->prepare("SELECT id, username, name, email, password_hash, role, status, last_login, last_activity FROM users WHERE username = ? OR email = ? LIMIT 1");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
        $_SESSION['inquiry_admin'] = [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'name' => $user['name'] ?: $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        $_SESSION['admin_user'] = $_SESSION['inquiry_admin'];
        $_SESSION['last_activity_time'] = time();

        // Inactivity & Re-Login Detection (Requirement 6)
        $lastAct = $user['last_activity'] ? strtotime($user['last_activity']) : 0;
        $isRelogin = ($lastAct > 0 && (time() - $lastAct > 900)) ? 1 : 0; // > 15 mins inactivity
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 250);
        $empName = $user['name'] ?: $user['username'];

        // 1. Update user timestamps & active status
        $pdo->prepare("UPDATE users SET last_login = NOW(), last_activity = NOW(), status = 'active' WHERE id = ?")
            ->execute([(int)$user['id']]);

        // 2. Record Login History
        try {
            $pdo->prepare("
                INSERT INTO login_history (user_id, username, employee_name, login_time, last_active, status, is_relogin, ip_address, user_agent)
                VALUES (?, ?, ?, NOW(), NOW(), 'active', ?, ?, ?)
            ")->execute([(int)$user['id'], $user['username'], $empName, $isRelogin, $ip, $ua]);
        } catch (\Exception $ex) {
            // Table may be created or upgraded
        }

        // 3. Log transparent work activity event
        try {
            $actType = $isRelogin ? 'user_relogin' : 'user_login';
            $actDetails = $isRelogin 
                ? "Employee $empName re-logged in after inactivity." 
                : "Employee $empName logged in successfully.";
            $pdo->prepare("
                INSERT INTO user_activity_logs (user_id, employee_name, action, module, entity_id, details, ip_address, created_at)
                VALUES (?, ?, ?, 'Authentication', ?, ?, ?, NOW())
            ")->execute([(int)$user['id'], $empName, $actType, (string)$user['id'], $actDetails, $ip]);
        } catch (\Exception $ex) {}

        $userRole = strtolower($user['role'] ?? 'executive');
        $redir = ($userRole === 'admin') ? 'dashboard.html' : 'staff.html';
        jsonSuccess([
            'user' => $_SESSION['inquiry_admin'],
            'redirect' => $redir,
            'is_relogin' => (bool)$isRelogin
        ], 'Login successful');
    } else {
        jsonError('Invalid username or password.', 401);
    }
} catch (\PDOException $e) {
    error_log('Inquiry admin login error: ' . $e->getMessage());
    jsonError('Authentication error occurred.', 500);
}
