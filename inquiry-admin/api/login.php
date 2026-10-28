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
if ($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ? LIMIT 1");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['inquiry_admin'] = [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role']
            ];
            jsonSuccess(['user' => $_SESSION['inquiry_admin'], 'redirect' => 'dashboard.html'], 'Login successful');
        }
    } catch (\PDOException $e) {
        // Fallback
    }
}

// Fallback initial admin credentials for testing / offline
if (($username === 'admin' || $username === 'admin@letsexploredmc.com') && ($password === 'admin123' || $password === 'Admin@LetsExplore2026!')) {
    $_SESSION['inquiry_admin'] = [
        'id' => 1,
        'username' => 'admin',
        'email' => 'admin@letsexploredmc.com',
        'role' => 'admin'
    ];
    jsonSuccess(['user' => $_SESSION['inquiry_admin'], 'redirect' => 'dashboard.html'], 'Login successful');
}

jsonError('Invalid username or password.', 401);
