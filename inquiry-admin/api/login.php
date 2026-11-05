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
        jsonSuccess(['user' => $_SESSION['inquiry_admin'], 'redirect' => 'dashboard.html'], 'Login successful (Standby Mode)');
    } else {
        jsonError('Invalid username or password.', 401);
    }
}

try {
    $stmt = $pdo->prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ? LIMIT 1");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
        $_SESSION['inquiry_admin'] = [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        jsonSuccess(['user' => $_SESSION['inquiry_admin'], 'redirect' => 'dashboard.html'], 'Login successful');
    } else {
        jsonError('Invalid username or password.', 401);
    }
} catch (\PDOException $e) {
    error_log('Inquiry admin login error: ' . $e->getMessage());
    jsonError('Authentication error occurred.', 500);
}
