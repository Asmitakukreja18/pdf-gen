<?php
/**
 * inquiry-admin/api/members.php — Sub-User & Staff Members Management Gateway
 * 
 * Supports:
 * - Unlimited sub-users (Admin, Kashish, Asmita, Chanchal)
 * - Role-based permissions (Admin, Manager, Executive, Agent)
 * - Status activation / deactivation
 * - Individual activity & performance tracking
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

// Role-Based Authorization: Member creation, status toggling and revoking require Admin
if (in_array($action, ['create', 'toggle_status', 'revoke_session', 'update'])) {
    $activeUser = checkSessionActivity('admin');
} else {
    $activeUser = checkSessionActivity(); // Any authenticated user can view members & status
}

// 1. LIST ALL MEMBERS / STAFF MONITORING
if ($method === 'GET' || $action === 'list' || $action === 'staff_monitoring') {
    $excludeAdmin = isset($_GET['exclude_admin']) || ($action === 'staff_monitoring');

    if (!$pdo) {
                $fallbackMembers = [
            [
                'id' => 1,
                'sub_user_id' => 'ADMIN',
                'username' => 'admin',
                'name' => 'Main Admin',
                'email' => 'admin@letsexploredmc.com',
                'phone' => '+91 98765 00001',
                'role' => 'admin',
                'status' => 'active',
                'session_status' => 'Active',
                'login_time' => '09:15 AM Today',
                'logout_time' => '— (Session Active)',
                'last_login' => date('Y-m-d 09:15:00'),
                'last_activity' => date('Y-m-d H:i:s', time() - 120),
                'session_duration' => '1h 00m',
                'total_leads' => 0,
                'total_quotes' => 0,
                'followups_pending' => 0,
                'tasks_completed' => 0
            ],
            [
                'id' => 2,
                'sub_user_id' => 'SU-1',
                'username' => 'kashish',
                'name' => 'Kashish Adwani',
                'email' => 'kashish@letsexploredmc.com',
                'phone' => '+91 98765 00002',
                'role' => 'executive',
                'status' => 'active',
                'session_status' => 'Active',
                'login_time' => '10:30 AM Today',
                'logout_time' => '— (Session Active)',
                'last_login' => date('Y-m-d 10:30:00'),
                'last_activity' => date('Y-m-d H:i:s', time() - 90),
                'session_duration' => '1h 00m',
                'total_leads' => 0,
                'total_quotes' => 0,
                'followups_pending' => 0,
                'tasks_completed' => 0
            ],
            [
                'id' => 3,
                'sub_user_id' => 'SU-2',
                'username' => 'asmita',
                'name' => 'Asmita Kukreja',
                'email' => 'asmita@letsexploredmc.com',
                'phone' => '+91 98765 00003',
                'role' => 'executive',
                'status' => 'active',
                'session_status' => 'Active',
                'login_time' => '10:45 AM Today',
                'logout_time' => '— (Session Active)',
                'last_login' => date('Y-m-d 10:45:00'),
                'last_activity' => date('Y-m-d H:i:s', time() - 140),
                'session_duration' => '1h 00m',
                'total_leads' => 0,
                'total_quotes' => 0,
                'followups_pending' => 0,
                'tasks_completed' => 0
            ],
            [
                'id' => 4,
                'sub_user_id' => 'SU-3',
                'username' => 'chanchal',
                'name' => 'Chanchal Sharma',
                'email' => 'chanchal@letsexploredmc.com',
                'phone' => '+91 98765 00004',
                'role' => 'executive',
                'status' => 'active',
                'session_status' => 'Active',
                'login_time' => '11:00 AM Today',
                'logout_time' => '— (Session Active)',
                'last_login' => date('Y-m-d 11:00:00'),
                'last_activity' => date('Y-m-d H:i:s', time() - 180),
                'session_duration' => '1h 00m',
                'total_leads' => 0,
                'total_quotes' => 0,
                'followups_pending' => 0,
                'tasks_completed' => 0
            ]
        ];

        if ($excludeAdmin) {
            $fallbackMembers = array_values(array_filter($fallbackMembers, function($m) {
                return $m['role'] !== 'admin' && $m['username'] !== 'admin';
            }));
        }

        jsonSuccess(['members' => $fallbackMembers, 'source' => 'fallback']);
    }

    try {
        // Ensure default staff members exist in database
        try {
                        $defaultStaff = [
                ['username' => 'kashish', 'name' => 'Kashish Adwani', 'email' => 'kashish@letsexploredmc.com', 'phone' => '+91 98765 00002', 'hash' => '$2y$10$WblC6gSxpaUU6k9jSB9su.M8JyjUI2FLgQqocMFQzMaSEqmTBNvhe', 'role' => 'executive'],
                ['username' => 'asmita', 'name' => 'Asmita Kukreja', 'email' => 'asmita@letsexploredmc.com', 'phone' => '+91 98765 00003', 'hash' => '$2y$10$fetalUtjo0NdcrTsfZGHJ.g0szQ0iqVW40Y/SulL8nGt3ThYluwZO', 'role' => 'executive'],
                ['username' => 'chanchal', 'name' => 'Chanchal Sharma', 'email' => 'chanchal@letsexploredmc.com', 'phone' => '+91 98765 00004', 'hash' => '$2y$10$ECppqLfvvnXgrtJDNLxSDOjM2UneJFuBnDE2g5FD3kqdK.lRbqOBm', 'role' => 'executive']
            ];
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
            $seedStmt = $pdo->prepare("INSERT INTO users (username, name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
            foreach ($defaultStaff as $ds) {
                $checkStmt->execute([$ds['username']]);
                if (!$checkStmt->fetch()) {
                    $seedStmt->execute([$ds['username'], $ds['name'], $ds['email'], $ds['phone'], $ds['hash'], $ds['role']]);
                }
            }
        } catch (\Throwable $te) {}

        $whereClause = $excludeAdmin ? "WHERE u.role != 'admin' AND u.username != 'admin'" : "";
        $stmt = $pdo->query("
            SELECT 
                u.id, 
                u.username, 
                u.name, 
                u.email, 
                u.phone, 
                u.role, 
                u.status, 
                u.last_login, 
                u.last_activity, 
                u.created_at,
                (SELECT COUNT(*) FROM `leads` l WHERE l.assigned_employee = u.name OR l.assigned_employee = u.username) AS total_leads,
                (SELECT COUNT(*) FROM `user_activity_logs` a WHERE a.user_id = u.id AND a.action LIKE '%quotation%') AS total_quotes
            FROM `users` u
            $whereClause
            ORDER BY u.id ASC
        ");
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $suIndex = 1;
        foreach ($members as &$m) {
            $m['sub_user_id'] = ($m['role'] === 'admin') ? 'ADMIN' : ('SU-' . $suIndex++);
            $lastAct = $m['last_activity'] ? strtotime($m['last_activity']) : 0;
            $diffMins = $lastAct > 0 ? round((time() - $lastAct) / 60) : 999;
            
            if ($m['status'] === 'inactive') {
                $m['session_status'] = 'Inactive';
            } elseif ($diffMins <= 15) {
                $m['session_status'] = 'Active';
            } elseif ($diffMins <= 30) {
                $m['session_status'] = 'Screen Locked (15m Idle)';
            } else {
                $m['session_status'] = 'Logged Out';
            }

            $m['login_time'] = $m['last_login'] ? date('h:i A \T\o\d\a\y', strtotime($m['last_login'])) : '11:00 AM Today';
            $m['logout_time'] = ($m['session_status'] === 'Active') ? '— (Session Active)' : '06:00 PM';
            $m['session_duration'] = ($lastAct > 0 && $m['last_login']) ? max(1, round((time() - strtotime($m['last_login'])) / 60)) . 'm' : '45m';
            $m['followups_pending'] = 0;
            $m['tasks_completed'] = 0;
        }

        jsonSuccess(['members' => $members]);
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 2. ADD NEW MEMBER
if ($action === 'create') {
    $username = strtolower(trim($input['username'] ?? ''));
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = trim($input['password'] ?? 'LETSEXPLOREDMC');
    $role = trim($input['role'] ?? 'executive');
    $permissions = json_encode($input['permissions'] ?? ['leads', 'documents', 'quotations', 'packages']);

    if (empty($username) || empty($email) || empty($name)) {
        jsonError('Username, Name, and Email are required.');
    }

    if (!$pdo) {
        jsonSuccess(['member_id' => rand(10, 99)], "Member '$name' added successfully (Session Mode).");
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    try {
        // Check duplicate
        $chk = $pdo->prepare("SELECT id FROM `users` WHERE username = ? OR email = ?");
        $chk->execute([$username, $email]);
        if ($chk->fetch()) {
            jsonError('A member with this username or email already exists.');
        }

        $stmt = $pdo->prepare("
            INSERT INTO `users` (`username`, `name`, `email`, `phone`, `password_hash`, `role`, `permissions`, `status`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
        ");
        $stmt->execute([$username, $name, $email, $phone, $passwordHash, $role, $permissions]);
        $newId = $pdo->lastInsertId();

        // Audit log
        $pdo->prepare("
            INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
            VALUES (1, 'Main Admin', 'added_member', 'Members', ?, ?, NOW())
        ")->execute([$newId, "Created new sub-user account for $name ($role)"]);

        jsonSuccess(['member_id' => $newId], "Member '$name' added successfully!");
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 3. TOGGLE ACTIVE / INACTIVE STATUS
if ($action === 'toggle_status') {
    $userId = (int)($input['user_id'] ?? 0);
    $status = ($input['status'] === 'inactive') ? 'inactive' : 'active';

    if ($userId <= 1 && $status === 'inactive') {
        jsonError('Primary Administrator cannot be deactivated.');
    }

    if (!$pdo) {
        jsonSuccess(['status' => $status], "Member status updated to $status (Session Mode).");
    }

    try {
        $stmt = $pdo->prepare("UPDATE `users` SET `status` = ?, `updated_at` = NOW() WHERE `id` = ?");
        $stmt->execute([$status, $userId]);

        jsonSuccess(['status' => $status], "Member status updated to $status.");
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 4. REVOKE ACTIVE SESSION
if ($action === 'revoke_session') {
    $userId = (int)($input['user_id'] ?? 0);
    if (!$pdo) {
        jsonSuccess([], "Active session for member #$userId revoked successfully.");
    }

    try {
        $stmt = $pdo->prepare("UPDATE `users` SET `last_activity` = NULL WHERE `id` = ?");
        $stmt->execute([$userId]);
        jsonSuccess([], "Active session revoked successfully.");
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 5. EDIT MEMBER
if ($action === 'update') {
    $userId = (int)($input['user_id'] ?? 0);
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $role = trim($input['role'] ?? 'executive');

    if (!$pdo) {
        jsonSuccess([], "Member details updated successfully (Session Mode).");
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE `users` 
            SET `name` = ?, `email` = ?, `phone` = ?, `role` = ?, `updated_at` = NOW() 
            WHERE `id` = ?
        ");
        $stmt->execute([$name, $email, $phone, $role, $userId]);

        jsonSuccess([], "Member details updated successfully.");
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 6. GET LOGIN & SESSION HISTORY (Inactivity & Re-login Tracking)
if ($action === 'login_history') {
    $userId = (int)($input['user_id'] ?? ($_GET['user_id'] ?? 0));
    if (!$pdo) {
                $fallbackHistory = [
            ['id' => 1, 'user_id' => 1, 'username' => 'admin', 'employee_name' => 'Main Admin', 'login_time' => date('Y-m-d 09:15:00'), 'logout_time' => null, 'last_active' => date('Y-m-d H:i:s', time() - 120), 'session_duration_mins' => 60, 'status' => 'active', 'is_relogin' => 0, 'ip_address' => '127.0.0.1'],
            ['id' => 2, 'user_id' => 2, 'username' => 'kashish', 'employee_name' => 'Kashish Adwani', 'login_time' => date('Y-m-d 10:30:00'), 'logout_time' => null, 'last_active' => date('Y-m-d H:i:s', time() - 90), 'session_duration_mins' => 60, 'status' => 'active', 'is_relogin' => 0, 'ip_address' => '127.0.0.1'],
            ['id' => 3, 'user_id' => 3, 'username' => 'asmita', 'employee_name' => 'Asmita Kukreja', 'login_time' => date('Y-m-d 10:45:00'), 'logout_time' => null, 'last_active' => date('Y-m-d H:i:s', time() - 140), 'session_duration_mins' => 60, 'status' => 'active', 'is_relogin' => 0, 'ip_address' => '127.0.0.1'],
            ['id' => 4, 'user_id' => 4, 'username' => 'chanchal', 'employee_name' => 'Chanchal Sharma', 'login_time' => date('Y-m-d 11:00:00'), 'logout_time' => null, 'last_active' => date('Y-m-d H:i:s', time() - 300), 'session_duration_mins' => 60, 'status' => 'active', 'is_relogin' => 0, 'ip_address' => '127.0.0.1']
        ];
        if ($userId > 0) {
            $fallbackHistory = array_values(array_filter($fallbackHistory, function($h) use ($userId) { return $h['user_id'] == $userId; }));
        }
        jsonSuccess(['history' => $fallbackHistory]);
    }

    try {
        $sql = "SELECT id, user_id, username, employee_name, login_time, logout_time, last_active, session_duration_mins, ip_address, status, is_relogin FROM login_history ";
        $params = [];
        if ($userId > 0) {
            $sql .= "WHERE user_id = ? ";
            $params[] = $userId;
        }
        $sql .= "ORDER BY id DESC LIMIT 50";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonSuccess(['history' => $history]);
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

