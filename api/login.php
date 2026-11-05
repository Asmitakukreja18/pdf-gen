<?php
/**
 * api/login.php — Admin Authentication Endpoint
 * With Resilient Database Fallback & Master Admin Support
 */

require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check current session status
    if (isAuthenticated()) {
        jsonSuccess(['user' => getCurrentUser()], 'Authenticated');
    } else {
        jsonError('Not authenticated', 401);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

// Read JSON or POST body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$identity = trim($input['username'] ?? $input['email'] ?? '');
$password = trim($input['password'] ?? '');

if (empty($identity) || empty($password)) {
    jsonError('Please provide both username/email and password.', 400);
}

// 1. Strict MySQL Database authentication with native bcrypt verification
$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable. Please verify MySQL credentials in api/config.php.', 503);
}

try {
    $stmt = $pdo->prepare('SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ? LIMIT 1');
    $stmt->execute([$identity, $identity]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // Prevent session fixation attacks
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }

        $_SESSION['admin_user'] = [
            'id'       => (int)$user['id'],
            'username' => $user['username'],
            'email'    => $user['email'],
            'role'     => $user['role']
        ];

        jsonSuccess([
            'user' => $_SESSION['admin_user'],
            'redirect' => 'index.html'
        ], 'Login successful.');
    } else {
        jsonError('Invalid credentials. Please verify your username and password.', 401);
    }
} catch (\PDOException $e) {
    error_log('Database authentication error: ' . $e->getMessage());
    jsonError('Authentication system error. Please contact database administrator.', 500);
}
