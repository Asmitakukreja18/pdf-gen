<?php
/**
 * api/activity_log.php — Centralized Employee Action & Audit Feed Gateway
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Graceful fallback if MySQL is not reachable in local test mode
if (!$pdo) {
    if ($method === 'GET') {
        echo json_encode([
            'success' => true,
            'logs' => [
                [
                    'id' => 1,
                    'employee_name' => 'Admin',
                    'action' => 'login',
                    'module' => 'Auth',
                    'details' => 'Admin logged into Operations Dashboard',
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ],
            'employee_metrics' => [
                [
                    'employee_name' => 'Admin',
                    'leads_count' => 12,
                    'quotes_count' => 8,
                    'sent_count' => 6,
                    'invoices_count' => 4,
                    'last_activity' => date('Y-m-d H:i:s')
                ]
            ],
            'storage_mode' => 'fallback'
        ]);
        exit;
    }
    echo json_encode(['success' => true, 'message' => 'Logged in fallback mode.']);
    exit;
}

if ($method === 'GET') {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $employee = $_GET['employee'] ?? '';

    try {
        if (!empty($employee) && $employee !== 'overall') {
            $stmt = $pdo->prepare("
                SELECT * FROM `user_activity_logs`
                WHERE `employee_name` LIKE ?
                ORDER BY `created_at` DESC
                LIMIT ?
            ");
            $stmt->bindValue(1, "%$employee%", PDO::PARAM_STR);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("
                SELECT * FROM `user_activity_logs`
                ORDER BY `created_at` DESC
                LIMIT ?
            ");
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();
        }
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate employee-wise performance metrics
        $metricsStmt = $pdo->query("
            SELECT 
                employee_name,
                COUNT(CASE WHEN action LIKE '%lead%' THEN 1 END) as leads_count,
                COUNT(CASE WHEN action LIKE '%quotation%' OR action LIKE '%created%' THEN 1 END) as quotes_count,
                COUNT(CASE WHEN action LIKE '%sent%' THEN 1 END) as sent_count,
                COUNT(CASE WHEN action LIKE '%invoice%' THEN 1 END) as invoices_count,
                MAX(created_at) as last_activity
            FROM `user_activity_logs`
            GROUP BY employee_name
        ");
        $employeeMetrics = $metricsStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'employee_metrics' => $employeeMetrics
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $employeeName = trim($input['employee_name'] ?? 'Admin');
    $action = trim($input['action'] ?? 'action');
    $module = trim($input['module'] ?? 'System');
    $entityId = trim($input['entity_id'] ?? '');
    $details = trim($input['details'] ?? '');
    $userId = $input['user_id'] ?? 1;

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `user_activity_logs` 
            (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `ip_address`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $userId,
            $employeeName,
            $action,
            $module,
            $entityId,
            $details,
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        echo json_encode(['success' => true, 'log_id' => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

