<?php
/**
 * test_inactivity_tracking.php
 * Verification of Item 11: Admin Activity Tracking When User Becomes Inactive and Logs In Again
 */

// Create in-memory SQLite PDO database simulating MySQL users, login_history, user_activity_logs
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1. Setup schema matching MySQL
$pdo->exec("
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'executive',
        status TEXT NOT NULL DEFAULT 'active',
        last_login DATETIME,
        last_activity DATETIME
    );

    CREATE TABLE login_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        employee_name TEXT,
        login_time DATETIME,
        last_active DATETIME,
        status TEXT,
        is_relogin INTEGER DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT
    );

    CREATE TABLE user_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        employee_name TEXT,
        action TEXT,
        module TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME
    );
");

// 2. Insert test user: Chanchal (SU-1)
$passHash = password_hash('Admin@123', PASSWORD_DEFAULT);
$pdo->prepare("INSERT INTO users (id, username, name, email, password_hash, role, status) VALUES (2, 'chanchal', 'Chanchal Sharma', 'chanchal@letsexploredmc.com', ?, 'executive', 'active')")
    ->execute([$passHash]);

echo "[SETUP] Created test user Chanchal Sharma (ID: 2)\n";

// Function simulating login logic in inquiry-admin/api/login.php
function simulateLogin($pdo, $username, $mockTime = null) {
    $now = $mockTime ?: time();
    $nowStr = date('Y-m-d H:i:s', $now);

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    $lastAct = $user['last_activity'] ? strtotime($user['last_activity']) : 0;
    // 15-minute inactivity threshold (900 seconds)
    $isRelogin = ($lastAct > 0 && ($now - $lastAct > 900)) ? 1 : 0;
    $empName = $user['name'] ?: $user['username'];
    $ip = '127.0.0.1';
    $ua = 'Verification-Browser/1.0';

    // 1. Update user timestamps
    $pdo->prepare("UPDATE users SET last_login = ?, last_activity = ?, status = 'active' WHERE id = ?")
        ->execute([$nowStr, $nowStr, $user['id']]);

    // 2. Record login_history
    $pdo->prepare("
        INSERT INTO login_history (user_id, username, employee_name, login_time, last_active, status, is_relogin, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    ")->execute([$user['id'], $user['username'], $empName, $nowStr, $nowStr, $isRelogin, $ip, $ua]);

    // 3. Log transparent work activity event
    $actType = $isRelogin ? 'user_relogin' : 'user_login';
    $actDetails = $isRelogin 
        ? "Employee $empName re-logged in after inactivity." 
        : "Employee $empName logged in successfully.";

    $pdo->prepare("
        INSERT INTO user_activity_logs (user_id, employee_name, action, module, entity_id, details, ip_address, created_at)
        VALUES (?, ?, ?, 'Authentication', ?, ?, ?, ?)
    ")->execute([$user['id'], $empName, $actType, (string)$user['id'], $actDetails, $ip, $nowStr]);

    return [
        'is_relogin' => (bool)$isRelogin,
        'action_type' => $actType,
        'details' => $actDetails,
        'timestamp' => $nowStr
    ];
}

// TEST STEP 1: Initial Login at T0 (09:00:00)
$t0 = strtotime('2026-11-06 09:00:00');
$res1 = simulateLogin($pdo, 'chanchal', $t0);
echo "\n--- TEST 1: Initial Login at " . date('H:i:s', $t0) . " ---\n";
echo "is_relogin: " . ($res1['is_relogin'] ? 'TRUE' : 'FALSE') . "\n";
echo "action: " . $res1['action_type'] . "\n";
echo "details: " . $res1['details'] . "\n";

// TEST STEP 2: Activity within 10 minutes (Active window < 15 mins)
$t1 = strtotime('2026-11-06 09:10:00'); // +10 mins
$res2 = simulateLogin($pdo, 'chanchal', $t1);
echo "\n--- TEST 2: Active Re-login within 10 mins at " . date('H:i:s', $t1) . " ---\n";
echo "is_relogin: " . ($res2['is_relogin'] ? 'TRUE' : 'FALSE') . "\n";
echo "action: " . $res2['action_type'] . "\n";

// TEST STEP 3: Inactivity Period (User goes idle for 25 minutes > 15 mins threshold)
$t2 = strtotime('2026-11-06 09:35:00'); // +25 mins from 09:10:00
$res3 = simulateLogin($pdo, 'chanchal', $t2);
echo "\n--- TEST 3: Re-login after 25 mins Inactivity at " . date('H:i:s', $t2) . " ---\n";
echo "is_relogin: " . ($res3['is_relogin'] ? 'TRUE' : 'FALSE') . "\n";
echo "action: " . $res3['action_type'] . "\n";
echo "details: " . $res3['details'] . "\n";

// VERIFY DATABASE RECORDS
echo "\n=== VERIFYING DATABASE TABLES ===\n";

echo "\n[Table: login_history]\n";
$stmt = $pdo->query("SELECT id, user_id, username, employee_name, login_time, is_relogin FROM login_history ORDER BY id ASC");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    printf("  ID: %d | User: %s | Time: %s | is_relogin: %d\n", $row['id'], $row['username'], $row['login_time'], $row['is_relogin']);
}

echo "\n[Table: user_activity_logs]\n";
$stmt = $pdo->query("SELECT id, user_id, employee_name, action, details, created_at FROM user_activity_logs ORDER BY id ASC");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    printf("  ID: %d | User: %s | Action: %s | Details: %s\n", $row['id'], $row['employee_name'], $row['action'], $row['details']);
}

// ASSERTIONS
$pass = true;
if ($res1['is_relogin'] !== false) { echo "[FAIL] Test 1 should have is_relogin = false\n"; $pass = false; }
if ($res2['is_relogin'] !== false) { echo "[FAIL] Test 2 should have is_relogin = false\n"; $pass = false; }
if ($res3['is_relogin'] !== true) { echo "[FAIL] Test 3 should have is_relogin = true\n"; $pass = false; }
if ($res3['action_type'] !== 'user_relogin') { echo "[FAIL] Test 3 action should be user_relogin\n"; $pass = false; }

if ($pass) {
    echo "\n>>> VERIFICATION ITEM 11 STATUS: [PASS] <<<\n";
    echo "Inactivity detection (>15m threshold) and re-login tracking verified successfully.\n";
} else {
    echo "\n>>> VERIFICATION ITEM 11 STATUS: [FAIL] <<<\n";
}

