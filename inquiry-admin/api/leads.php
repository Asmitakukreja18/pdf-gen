<?php
/**
 * inquiry-admin/api/leads.php — High-Performance Lead Pipeline Gateway
 * 
 * Supports stages:
 * - New Lead, Fresh, Follow-up, In Review, Opportunity, Quotation Sent, Confirmed, Lost
 * - Direct "CREATE QUOTATION" data transfer into AI Studio
 * - Real-time activity logging
 */

require_once __DIR__ . '/db.php';
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

function getLeadsJsonPath() {
    $dir = __DIR__ . '/../../data';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir . '/leads.json';
}

function loadLocalLeads() {
    $file = getLeadsJsonPath();
    if (file_exists($file)) {
        $json = @file_get_contents($file);
        $arr = json_decode($json, true);
        if (is_array($arr)) return $arr;
    }
    return [];
}

function saveLocalLeads($leads) {
    $file = getLeadsJsonPath();
    @file_put_contents($file, json_encode(array_values($leads), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

// 1. LIST LEADS
if ($method === 'GET' || $action === 'list') {
    $status = $_GET['status'] ?? 'all';
    $search = trim($_GET['search'] ?? '');
    $assigned = $_GET['assigned'] ?? '';

    if (!$pdo) {
        $all = loadLocalLeads();
        $filtered = array_filter($all, function($ld) use ($status, $search, $assigned) {
            if ($status !== 'all' && !empty($status) && ($ld['status'] ?? '') !== $status) return false;
            if (!empty($assigned) && $assigned !== 'all' && stripos($ld['assigned_employee'] ?? '', $assigned) === false) return false;
            if (!empty($search)) {
                $s = strtolower($search);
                $target = strtolower(($ld['customer_name'] ?? '') . ' ' . ($ld['phone'] ?? '') . ' ' . ($ld['destination'] ?? '') . ' ' . ($ld['lead_no'] ?? ''));
                if (strpos($target, $s) === false) return false;
            }
            return true;
        });

        $statusCounts = [];
        foreach ($all as $ld) {
            $st = $ld['status'] ?? 'Fresh';
            $statusCounts[$st] = ($statusCounts[$st] ?? 0) + 1;
        }

        jsonSuccess([
            'leads' => array_values($filtered),
            'status_counts' => $statusCounts,
            'counts' => $statusCounts,
            'total' => count($filtered),
            'source' => 'local_storage'
        ]);
    }

    $sql = "SELECT * FROM `leads` WHERE 1=1";
    $params = [];

    if ($status !== 'all' && !empty($status)) {
        $sql .= " AND `status` = ?";
        $params[] = $status;
    }

    if (!empty($assigned) && $assigned !== 'all') {
        $sql .= " AND `assigned_employee` LIKE ?";
        $params[] = "%$assigned%";
    }

    if (!empty($search)) {
        $sql .= " AND (`customer_name` LIKE ? OR `phone` LIKE ? OR `email` LIKE ? OR `destination` LIKE ? OR `lead_no` LIKE ?)";
        $term = "%$search%";
        $params = array_merge($params, [$term, $term, $term, $term, $term]);
    }

    $sql .= " ORDER BY `created_at` DESC";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch count by status
        $countsStmt = $pdo->query("
            SELECT `status`, COUNT(*) as count 
            FROM `leads` 
            GROUP BY `status`
        ");
        $statusCounts = [];
        while ($row = $countsStmt->fetch(PDO::FETCH_ASSOC)) {
            $statusCounts[$row['status']] = (int)$row['count'];
        }

        jsonSuccess([
            'leads' => $leads,
            'status_counts' => $statusCounts,
            'counts' => $statusCounts,
            'total' => count($leads)
        ]);
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 2. CREATE NEW LEAD
if ($action === 'create') {
    $name = trim($input['customer_name'] ?? $input['name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');
    $destination = trim($input['destination'] ?? 'Custom Tour');
    $adults = (int)($input['adults'] ?? 2);
    $children = (int)($input['children'] ?? 0);
    $rooms = (int)($input['rooms'] ?? 1);
    $budget = (float)($input['budget'] ?? 0);
    $source = trim($input['lead_source'] ?? $input['source'] ?? 'Website Form');
    $assigned = trim($input['assigned_employee'] ?? $input['assigned_to'] ?? 'Admin');
    $followup = !empty($input['followup_date']) ? $input['followup_date'] : (!empty($input['follow_up_date']) ? $input['follow_up_date'] : null);
    $status = trim($input['status'] ?? 'Fresh');
    $notes = trim($input['internal_notes'] ?? $input['notes'] ?? '');

    if (empty($name) || empty($phone)) {
        jsonError('Customer Name and Phone Number are required.');
    }

    $leadNo = 'LEDMC-LEAD-' . strtoupper(substr(uniqid(), -5));

    $newRecord = [
        'id' => time(),
        'lead_no' => $leadNo,
        'customer_name' => $name,
        'phone' => $phone,
        'email' => $email,
        'destination' => $destination,
        'adults' => $adults,
        'children' => $children,
        'rooms' => $rooms,
        'budget' => $budget,
        'lead_source' => $source,
        'assigned_employee' => $assigned,
        'followup_date' => $followup,
        'status' => $status,
        'internal_notes' => $notes,
        'created_at' => date('Y-m-d H:i:s')
    ];

    if (!$pdo) {
        $all = loadLocalLeads();
        array_unshift($all, $newRecord);
        saveLocalLeads($all);
        jsonSuccess([
            'id' => $newRecord['id'],
            'lead_id' => $newRecord['id'],
            'lead_no' => $leadNo
        ], "Lead $leadNo created successfully!");
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `leads` 
            (`lead_no`, `customer_name`, `phone`, `email`, `destination`, `adults`, `children`, `rooms`, `budget`, `lead_source`, `assigned_employee`, `followup_date`, `status`, `internal_notes`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $leadNo, $name, $phone, $email, $destination, $adults, $children, $rooms, $budget, $source, $assigned, $followup, $status, $notes
        ]);
        $leadId = (int)$pdo->lastInsertId();
        $newRecord['id'] = $leadId;

        // Also sync local storage
        $all = loadLocalLeads();
        array_unshift($all, $newRecord);
        saveLocalLeads($all);

        // Also add or update in customers table
        try {
            $custStmt = $pdo->prepare("
                INSERT INTO `customers` (`name`, `phone`, `email`, `category`, `destinations_history`, `created_at`)
                VALUES (?, ?, ?, 'B2C', ?, NOW())
                ON DUPLICATE KEY UPDATE `destinations_history` = CONCAT(IFNULL(`destinations_history`,''), ', ', VALUES(`destinations_history`))
            ");
            $custStmt->execute([$name, $phone, $email, $destination]);
        } catch (\Throwable $ce) {}

        // Audit log
        try {
            $pdo->prepare("
                INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
                VALUES (1, ?, 'created_lead', 'Leads', ?, ?, NOW())
            ")->execute([$assigned, $leadNo, "New lead created for $name ($destination)"]);
        } catch (\Throwable $ae) {}

        jsonSuccess([
            'id' => $leadId,
            'lead_id' => $leadId,
            'lead_no' => $leadNo
        ], "Lead $leadNo created successfully!");
    } catch (Exception $e) {
        $all = loadLocalLeads();
        array_unshift($all, $newRecord);
        saveLocalLeads($all);
        jsonSuccess([
            'id' => $newRecord['id'],
            'lead_id' => $newRecord['id'],
            'lead_no' => $leadNo
        ], "Lead $leadNo created successfully!");
    }
}

// 3. UPDATE LEAD (STATUS, ASSIGNMENT, FOLLOW-UP)
if ($action === 'update' || $action === 'update_status') {
    $leadId = (int)($input['lead_id'] ?? $input['id'] ?? 0);
    if ($leadId <= 0) {
        jsonError('Valid lead_id or id is required.', 400);
    }

    $newStatus = trim($input['status'] ?? '');
    $assigned  = trim($input['assigned_employee'] ?? $input['assigned_to'] ?? '');
    $followup  = !empty($input['followup_date']) ? $input['followup_date'] : (!empty($input['follow_up_date']) ? $input['follow_up_date'] : null);
    $notes     = trim($input['internal_notes'] ?? $input['notes'] ?? '');
    $employee  = trim($input['employee_name'] ?? 'Admin');

    if (!$pdo) {
        $all = loadLocalLeads();
        $updated = false;
        foreach ($all as &$ld) {
            if (($ld['id'] ?? 0) == $leadId || ($ld['lead_id'] ?? 0) == $leadId) {
                if (!empty($newStatus)) $ld['status'] = $newStatus;
                if (!empty($assigned))  $ld['assigned_employee'] = $assigned;
                if ($followup !== null) $ld['followup_date'] = $followup;
                if (!empty($notes))     $ld['internal_notes'] = $notes;
                $ld['updated_at'] = date('Y-m-d H:i:s');
                $updated = true;
                break;
            }
        }
        if ($updated) saveLocalLeads($all);
        jsonSuccess(['lead_id' => $leadId, 'status' => $newStatus, 'assigned' => $assigned], "Lead #$leadId updated successfully.");
    }

    try {
        $updates = [];
        $params = [];

        if (!empty($newStatus)) {
            $updates[] = "`status` = ?";
            $params[] = $newStatus;
        }
        if (!empty($assigned)) {
            $updates[] = "`assigned_employee` = ?";
            $params[] = $assigned;
        }
        if ($followup !== null) {
            $updates[] = "`followup_date` = ?";
            $params[] = $followup;
        }
        if (!empty($notes)) {
            $updates[] = "`internal_notes` = ?";
            $params[] = $notes;
        }

        if (empty($updates)) {
            $updates[] = "`updated_at` = NOW()";
        } else {
            $updates[] = "`updated_at` = NOW()";
        }

        $params[] = $leadId;
        $sql = "UPDATE `leads` SET " . implode(', ', $updates) . " WHERE `id` = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Audit log
        $pdo->prepare("
            INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
            VALUES (1, ?, 'updated_status', 'Leads', ?, ?, NOW())
        ")->execute([$employee, "Lead #$leadId", "Lead updated: " . ($newStatus ? "status -> $newStatus" : "assigned -> $assigned")]);

        jsonSuccess(['lead_id' => $leadId, 'status' => $newStatus, 'assigned' => $assigned], "Lead #$leadId updated successfully.");
    } catch (Exception $e) {
        $all = loadLocalLeads();
        $updated = false;
        foreach ($all as &$ld) {
            if (($ld['id'] ?? 0) == $leadId || ($ld['lead_id'] ?? 0) == $leadId) {
                if (!empty($newStatus)) $ld['status'] = $newStatus;
                if (!empty($assigned))  $ld['assigned_employee'] = $assigned;
                if ($followup !== null) $ld['followup_date'] = $followup;
                if (!empty($notes))     $ld['internal_notes'] = $notes;
                $ld['updated_at'] = date('Y-m-d H:i:s');
                $updated = true;
                break;
            }
        }
        if ($updated) saveLocalLeads($all);
        jsonSuccess(['lead_id' => $leadId, 'status' => $newStatus, 'assigned' => $assigned], "Lead #$leadId updated successfully.");
    }
}

// 4. DELETE LEAD
if ($action === 'delete') {
    $leadId = (int)($input['lead_id'] ?? $input['id'] ?? 0);
    $leadNo = trim($input['lead_no'] ?? '');

    $all = loadLocalLeads();
    $filtered = array_filter($all, function($ld) use ($leadId, $leadNo) {
        if ($leadId > 0 && (($ld['id'] ?? 0) == $leadId || ($ld['lead_id'] ?? 0) == $leadId)) return false;
        if (!empty($leadNo) && ($ld['lead_no'] ?? '') === $leadNo) return false;
        return true;
    });
    saveLocalLeads(array_values($filtered));

    if ($pdo) {
        try {
            if ($leadId > 0) {
                $stmt = $pdo->prepare("DELETE FROM `leads` WHERE `id` = ?");
                $stmt->execute([$leadId]);
            } else if (!empty($leadNo)) {
                $stmt = $pdo->prepare("DELETE FROM `leads` WHERE `lead_no` = ?");
                $stmt->execute([$leadNo]);
            }
        } catch (\Throwable $e) {}
    }

    jsonSuccess([], "Lead deleted successfully.");
}

