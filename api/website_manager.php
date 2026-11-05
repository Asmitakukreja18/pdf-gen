<?php
/**
 * api/website_manager.php — Public Website CMS Content Management API
 * 
 * Manages live public website content from inquiry-admin/website.html
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? ($_POST['action'] ?? 'get');

if (!$pdo) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Database connection unavailable.']);
    exit;
}

if ($method === 'GET' || $action === 'get') {
    try {
        $stmt = $pdo->query("SELECT * FROM `website_content`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $content = [];
        foreach ($rows as $row) {
            $content[$row['section_key']] = [
                'name' => $row['section_name'],
                'data' => json_decode($row['content_json'], true) ?? $row['content_json'],
                'is_published' => (int)$row['is_published'],
                'updated_at' => $row['updated_at']
            ];
        }

        // Also fetch published packages for website display
        $pkgStmt = $pdo->query("SELECT * FROM `packages` WHERE `is_published` = 1 AND `status` = 'active' ORDER BY `id` ASC");
        $packages = $pkgStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'content' => $content,
            'packages' => $packages
        ]);
    } catch (\Throwable $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $sectionKey = trim($input['section_key'] ?? '');
    $sectionData = $input['data'] ?? null;
    $sessionUser = $_SESSION['admin_user'] ?? 'Admin';
    $defaultUser = is_array($sessionUser) ? ($sessionUser['name'] ?? $sessionUser['username'] ?? 'Admin') : (string)$sessionUser;
    $updatedBy = trim($input['updated_by'] ?? $defaultUser);

    if (empty($sectionKey) || $sectionData === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Section key and data are required.']);
        exit;
    }

    $jsonStr = is_string($sectionData) ? $sectionData : json_encode($sectionData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `website_content` (`section_key`, `section_name`, `content_json`, `is_published`, `updated_by`, `updated_at`)
            VALUES (?, ?, ?, 1, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                `content_json` = VALUES(`content_json`),
                `updated_by` = VALUES(`updated_by`),
                `updated_at` = NOW()
        ");
        $stmt->execute([
            $sectionKey,
            ucwords(str_replace('_', ' ', $sectionKey)),
            $jsonStr,
            $updatedBy
        ]);

        // Audit log
        $pdo->prepare("
            INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
            VALUES (1, ?, 'updated_website', 'Website', ?, ?, NOW())
        ")->execute([$updatedBy, $sectionKey, "Updated website section '$sectionKey'"]);

        echo json_encode([
            'success' => true,
            'message' => "Website section '$sectionKey' updated and published successfully!"
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

