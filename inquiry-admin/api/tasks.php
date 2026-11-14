<?php
/**
 * inquiry-admin/api/tasks.php — Staff Task Assignment & Workflow Management
 * Lets Explore DMC Luxury Travel ERP
 * 
 * Actions:
 * - list: Get all assigned tasks (or filtered by staff_name / status)
 * - create: Admin assigns a new task to a staff member
 * - update_status: Staff or Admin marks task as 'Pending', 'In Progress', 'Completed'
 * - delete: Remove task
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=UTF-8');

$backupFile = __DIR__ . '/../../data/staff_tasks.json';
if (!file_exists(dirname($backupFile))) {
    @mkdir(dirname($backupFile), 0777, true);
}

function getTasksFromJson($backupFile) {
    if (file_exists($backupFile)) {
        $content = @file_get_contents($backupFile);
        $arr = json_decode($content, true);
        if (is_array($arr)) return $arr;
    }
    return [];
}

function saveTasksToJson($backupFile, $tasks) {
    @file_put_contents($backupFile, json_encode(array_values($tasks), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$pdo = getDb();
if ($pdo) {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `staff_tasks` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `task_code` VARCHAR(50) NOT NULL,
                `title` VARCHAR(255) NOT NULL,
                `category` VARCHAR(100) DEFAULT 'General',
                `assigned_to` VARCHAR(100) NOT NULL,
                `staff_code` VARCHAR(50) DEFAULT 'SU-1',
                `assigned_by` VARCHAR(100) DEFAULT 'Admin (Let\'s Explore DMC)',
                `priority` ENUM('Normal', 'High', 'Urgent') DEFAULT 'Normal',
                `due_date` DATE DEFAULT NULL,
                `instructions` TEXT DEFAULT NULL,
                `related_entity` VARCHAR(100) DEFAULT NULL,
                `status` ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending',
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (`assigned_to`),
                INDEX (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } catch (Exception $e) {}
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
if (!empty($input['action'])) {
    $action = $input['action'];
}

if ($action === 'list') {
    $filterStaff = trim($_GET['staff'] ?? $input['staff'] ?? '');
    $filterStatus = trim($_GET['status'] ?? $input['status'] ?? '');

    $tasks = [];
    if ($pdo) {
        try {
            $sql = "SELECT * FROM staff_tasks WHERE 1=1";
            $params = [];
            if ($filterStaff) {
                $sql .= " AND (assigned_to LIKE ? OR staff_code LIKE ?)";
                $params[] = "%$filterStaff%";
                $params[] = "%$filterStaff%";
            }
            if ($filterStatus) {
                $sql .= " AND status = ?";
                $params[] = $filterStatus;
            }
            $sql .= " ORDER BY id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $tasks = [];
        }
    }

    if (empty($tasks)) {
        $jsonTasks = getTasksFromJson($backupFile);
        if ($filterStaff) {
            $fLower = strtolower($filterStaff);
            $jsonTasks = array_filter($jsonTasks, function($t) use ($fLower) {
                return strpos(strtolower($t['assigned_to'] ?? ''), $fLower) !== false
                    || strpos(strtolower($t['staff_code'] ?? ''), $fLower) !== false;
            });
        }
        if ($filterStatus) {
            $jsonTasks = array_filter($jsonTasks, function($t) use ($filterStatus) {
                return ($t['status'] ?? '') === $filterStatus;
            });
        }
        $tasks = array_values($jsonTasks);
    }

    echo json_encode(['success' => true, 'tasks' => $tasks]);
    exit;
}

if ($action === 'create') {
    $title = trim($input['title'] ?? '');
    $assignedTo = trim($input['assigned_to'] ?? '');
    $category = trim($input['category'] ?? 'General');
    $priority = trim($input['priority'] ?? 'Normal');
    $dueDate = !empty($input['due_date']) ? $input['due_date'] : date('Y-m-d', strtotime('+1 day'));
    $instructions = trim($input['instructions'] ?? '');
    $related = trim($input['related_entity'] ?? '');

    if (!$title || !$assignedTo) {
        echo json_encode(['success' => false, 'error' => 'Title and Staff Assignee are required.']);
        exit;
    }

    $staffCode = 'SU-1';
    if (stripos($assignedTo, 'asmita') !== false) {
        $staffCode = 'SU-2';
    } elseif (stripos($assignedTo, 'chanchal') !== false) {
        $staffCode = 'SU-3';
    }

    $taskCode = 'TSK-' . strtoupper(substr(uniqid(), -5));
    $assignedBy = 'Admin (Let\'s Explore DMC)';

    $saved = false;
    $newId = 0;

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO `staff_tasks` 
                (`task_code`, `title`, `category`, `assigned_to`, `staff_code`, `assigned_by`, `priority`, `due_date`, `instructions`, `related_entity`, `status`, `created_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
            ");
            $stmt->execute([
                $taskCode, $title, $category, $assignedTo, $staffCode, $assignedBy, $priority, $dueDate, $instructions, $related
            ]);
            $newId = $pdo->lastInsertId();
            $saved = true;
        } catch (Exception $e) {}
    }

    // Always mirror to JSON backup
    $all = getTasksFromJson($backupFile);
    if (!$newId) $newId = count($all) + 1;
    $record = [
        'id' => $newId,
        'task_code' => $taskCode,
        'title' => $title,
        'category' => $category,
        'assigned_to' => $assignedTo,
        'staff_code' => $staffCode,
        'assigned_by' => $assignedBy,
        'priority' => $priority,
        'due_date' => $dueDate,
        'instructions' => $instructions,
        'related_entity' => $related,
        'status' => 'Pending',
        'created_at' => date('Y-m-d H:i:s')
    ];
    array_unshift($all, $record);
    saveTasksToJson($backupFile, $all);

    echo json_encode([
        'success' => true,
        'message' => "Task successfully assigned to $assignedTo!",
        'task' => $record
    ]);
    exit;
}

if ($action === 'update_status') {
    $taskId = (int)($input['task_id'] ?? 0);
    $status = trim($input['status'] ?? 'In Progress');

    if ($taskId <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid task ID.']);
        exit;
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE `staff_tasks` SET `status` = ?, `updated_at` = NOW() WHERE `id` = ?");
            $stmt->execute([$status, $taskId]);
        } catch (Exception $e) {}
    }

    $all = getTasksFromJson($backupFile);
    foreach ($all as &$t) {
        if ((int)$t['id'] === $taskId) {
            $t['status'] = $status;
            $t['updated_at'] = date('Y-m-d H:i:s');
            break;
        }
    }
    saveTasksToJson($backupFile, $all);

    echo json_encode(['success' => true, 'message' => "Task status updated to $status."]);
    exit;
}

if ($action === 'delete') {
    $taskId = (int)($input['task_id'] ?? 0);
    if ($pdo) {
        try {
            $pdo->prepare("DELETE FROM `staff_tasks` WHERE `id` = ?")->execute([$taskId]);
        } catch (Exception $e) {}
    }

    $all = getTasksFromJson($backupFile);
    $all = array_filter($all, function($t) use ($taskId) {
        return (int)$t['id'] !== $taskId;
    });
    saveTasksToJson($backupFile, $all);

    echo json_encode(['success' => true, 'message' => 'Task deleted.']);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid action.']);
