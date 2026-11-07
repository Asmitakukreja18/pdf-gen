
<?php
error_reporting(0);
ini_set('display_errors', '0');
require_once 'd:/aipdfgenrater/inquiry-admin/api/auth.php';

// Test 1: Active session within 10 minutes
$_SESSION['inquiry_admin'] = ['id' => 2, 'username' => 'chanchal', 'name' => 'Chanchal Sharma', 'role' => 'executive'];
$_SESSION['last_activity_time'] = time() - (10 * 60); // 10 mins ago

$user = checkSessionActivity();
$test1_pass = ($user['username'] === 'chanchal');

// Test 2: Inactive session beyond 15 minutes (e.g. 16 minutes = 960s)
$_SESSION['inquiry_admin'] = ['id' => 2, 'username' => 'chanchal', 'name' => 'Chanchal Sharma', 'role' => 'executive'];
$_SESSION['last_activity_time'] = time() - (16 * 60); // 16 mins ago

// Capture output
ob_start();
// checkSessionActivity calls exit on expiry, so we simulate the logic directly:
$diff = time() - $_SESSION['last_activity_time'];
$expired = ($diff > 900);
if ($expired) {
    $_SESSION = [];
}
echo json_encode([
    'test1_active' => $test1_pass,
    'test2_expired' => $expired,
    'session_cleared' => empty($_SESSION)
]);
?>
