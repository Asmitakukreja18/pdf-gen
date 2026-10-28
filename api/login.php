<?php
/**
 * api/login.php — Admin Authentication Endpoint
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

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable. Please check cPanel database settings in api/config.php.', 500);
}

try {
    $stmt = $pdo->prepare('SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ? LIMIT 1');
    $stmt->execute([$identity, $identity]);
    $user = $stmt->fetch();

    if (!$user) {
        // Fallback for first-time setup if letsexplore_pdf.sql wasn't imported yet
        jsonError('Invalid credentials. Please verify your username and password.', 401);
    }

    if (!password_verify($password, $user['password_hash'])) {
        jsonError('Invalid credentials. Please check your password.', 401);
    }

    // Login success: Store safe session info
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

} catch (\PDOException $e) {
    error_log('Login query error: ' . $e->getMessage());
    jsonError('An internal server error occurred. Please try again.', 500);
}
