<?php
/**
 * inquiry-admin/api/members.php — Sub-User & Staff Members Management Gateway
 * 
 * Supports:
 * - Unlimited sub-users (Admin, Chanchal, Ritesh, Ops, etc.)
 * - Role-based permissions (Admin, Manager, Executive, Agent)
 * - Status activation / deactivation
 * - Individual activity & performance tracking
 */

require_once __DIR__ . '/db.php';
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

// 1. LIST ALL MEMBERS
if ($method === 'GET' || $action === 'list') {
    if (!$pdo) {
        $fallbackMembers = [
            ['id' => 1, 'username' => 'admin', 'name' => 'Admin (Administrator)', 'email' => 'admin@letsexploredmc.com', 'phone' => '+91 98765 00001', 'role' => 'admin', 'status' => 'active', 'last_login' => date('Y-m-d 09:15:00'), 'last_activity' => date('Y-m-d H:i:s', time() - 120), 'total_leads' => 45, 'total_quotes' => 38],
            ['id' => 2, 'username' => 'chanchal', 'name' => 'Chanchal Sharma', 'email' => 'chanchal@letsexploredmc.com', 'phone' => '+91 98765 00002', 'role' => 'executive', 'status' => 'active', 'last_login' => date('Y-m-d 09:32:00'), 'last_activity' => date('Y-m-d H:i:s', time() - 300), 'total_leads' => 28, 'total_quotes' => 24],
            ['id' => 3, 'username' => 'ritesh', 'name' => 'Ritesh Verma', 'email' => 'ritesh@letsexploredmc.com', 'phone' => '+91 98765 00003', 'role' => 'executive', 'status' => 'active', 'last_login' => date('Y-m-d 09:40:00'), 'last_activity' => date('Y-m-d H:i:s', time() - 720), 'total_leads' => 19, 'total_quotes' => 15],
            ['id' => 4, 'username' => 'operations', 'name' => 'Operations Team', 'email' => 'operations@letsexploredmc.com', 'phone' => '+91 98765 00004', 'role' => 'agent', 'status' => 'active', 'last_login' => date('Y-m-d 09:50:00'), 'last_activity' => date('Y-m-d H:i:s', time() - 1200), 'total_leads' => 12, 'total_quotes' => 9],
        ];
        jsonSuccess(['members' => $fallbackMembers, 'source' => 'fallback']);
    }

    try {
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
            ORDER BY u.id ASC
        ");
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    try {
        $stmt = $pdo->prepare("UPDATE `users` SET `status` = ?, `updated_at` = NOW() WHERE `id` = ?");
        $stmt->execute([$status, $userId]);

        jsonSuccess(['status' => $status], "Member status updated to $status.");
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 4. EDIT MEMBER
if ($action === 'update') {
    $userId = (int)($input['user_id'] ?? 0);
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $role = trim($input['role'] ?? 'executive');

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

