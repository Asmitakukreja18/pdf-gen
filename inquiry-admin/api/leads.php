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

// 1. LIST LEADS
if ($method === 'GET' || $action === 'list') {
    $status = $_GET['status'] ?? 'all';
    $search = trim($_GET['search'] ?? '');
    $assigned = $_GET['assigned'] ?? '';

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

        // Auto-seed initial leads if database table is empty
        if (empty($leads) && empty($search) && ($status === 'all' || empty($status))) {
            try {
                $pdo->exec("
                    INSERT IGNORE INTO `leads` (`id`, `lead_no`, `client_type`, `customer_name`, `phone`, `email`, `destination`, `adults`, `children`, `rooms`, `budget`, `lead_source`, `assigned_employee`, `status`, `internal_notes`, `created_at`) VALUES
                    (1, 'LEDMC-LEAD-101', 'B2C', 'Dipesh Batra', '7020660318', 'dipeshbatra043@gmail.com', 'Rajasthan & Udaipur Heritage 5D', 2, 0, 1, 65000.00, 'Website Form', 'Admin', 'Fresh', 'Looking for 4N heritage hotels with private SUV transport.', NOW()),
                    (2, 'LEDMC-LEAD-102', 'B2B', 'Akash Dewani', '9820011223', 'akash@dewanitravels.com', 'Dubai Luxury 6D Atlantis & Desert Safari', 2, 1, 1, 140000.00, 'WhatsApp Partner', 'Chanchal (SU-1)', 'Follow-up', 'Atlantis the palm query, flight BOM-DXB-BOM requested.', NOW()),
                    (3, 'LEDMC-LEAD-103', 'B2C', 'Rohan Mehta', '9819922334', 'rohan.mehta@gmail.com', 'Bali Private Pool Villa & Nusa Penida 6D', 2, 0, 1, 95000.00, 'Website Form', 'Ritesh (SU-2)', 'In Review', 'Honeymoon couple, prefers pool villa in Ubud + beachfront in Seminyak.', NOW()),
                    (4, 'LEDMC-LEAD-104', 'B2B', 'Mrs. Sneha Patil', '9833445566', 'sneha@aanaytours.com', 'Thailand Phuket & Krabi 7D Island Escape', 4, 2, 2, 185000.00, 'Travel Agent B2B Desk', 'Ops Team', 'Confirmed', 'Flight tickets issued, 4-star beach resort confirmed with speedboats.', NOW())
                ");
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $seedErr) {
                error_log('Lead seeding note: ' . $seedErr->getMessage());
            }
        }

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
    $name = trim($input['customer_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');
    $destination = trim($input['destination'] ?? 'Custom Tour');
    $adults = (int)($input['adults'] ?? 2);
    $children = (int)($input['children'] ?? 0);
    $rooms = (int)($input['rooms'] ?? 1);
    $budget = (float)($input['budget'] ?? 0);
    $source = trim($input['lead_source'] ?? 'Website Form');
    $assigned = trim($input['assigned_employee'] ?? 'Admin');
    $followup = !empty($input['followup_date']) ? $input['followup_date'] : null;
    $status = trim($input['status'] ?? 'Fresh');
    $notes = trim($input['internal_notes'] ?? '');

    if (empty($name) || empty($phone)) {
        jsonError('Customer Name and Phone Number are required.');
    }

    $leadNo = 'LEDMC-LEAD-' . strtoupper(substr(uniqid(), -5));

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `leads` 
            (`lead_no`, `customer_name`, `phone`, `email`, `destination`, `adults`, `children`, `rooms`, `budget`, `lead_source`, `assigned_employee`, `followup_date`, `status`, `internal_notes`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $leadNo, $name, $phone, $email, $destination, $adults, $children, $rooms, $budget, $source, $assigned, $followup, $status, $notes
        ]);
        $leadId = $pdo->lastInsertId();

        // Also add or update in customers table
        $custStmt = $pdo->prepare("
            INSERT INTO `customers` (`name`, `phone`, `email`, `category`, `destinations_history`, `created_at`)
            VALUES (?, ?, ?, 'B2C', ?, NOW())
            ON DUPLICATE KEY UPDATE `destinations_history` = CONCAT(IFNULL(`destinations_history`,''), ', ', VALUES(`destinations_history`))
        ");
        $custStmt->execute([$name, $phone, $email, $destination]);

        // Audit log
        $pdo->prepare("
            INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
            VALUES (1, ?, 'created_lead', 'Leads', ?, ?, NOW())
        ")->execute([$assigned, $leadNo, "New lead created for $name ($destination)"]);

        jsonSuccess([
            'lead_id' => $leadId,
            'lead_no' => $leadNo
        ], "Lead $leadNo created successfully!");
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

// 3. UPDATE LEAD STATUS
if ($action === 'update_status') {
    $leadId = (int)($input['lead_id'] ?? 0);
    $newStatus = trim($input['status'] ?? 'Fresh');
    $employee = trim($input['employee_name'] ?? 'Admin');

    try {
        $stmt = $pdo->prepare("UPDATE `leads` SET `status` = ?, `updated_at` = NOW() WHERE `id` = ?");
        $stmt->execute([$newStatus, $leadId]);

        // Audit log
        $pdo->prepare("
            INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
            VALUES (1, ?, 'updated_status', 'Leads', ?, ?, NOW())
        ")->execute([$employee, "Lead #$leadId", "Status changed to $newStatus"]);

        jsonSuccess(['lead_id' => $leadId, 'status' => $newStatus], "Lead status updated to $newStatus.");
    } catch (Exception $e) {
        jsonError($e->getMessage(), 500);
    }
}

