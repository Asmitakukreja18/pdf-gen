<?php
/**
 * inquiry-admin/api/get_inquiries.php — Retrieve Inquiries with Filters & Counts
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$activeUser = checkSessionActivity(); // Ensure authenticated & within 15-minute activity window

function getInquiriesJsonPath() {
    $dir = __DIR__ . '/../../data';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir . '/inquiries.json';
}

function loadLocalInquiries() {
    $file = getInquiriesJsonPath();
    if (file_exists($file)) {
        $json = @file_get_contents($file);
        $arr = json_decode($json, true);
        if (is_array($arr)) return $arr;
    }
    return [];
}

$status = trim($_GET['status'] ?? '');
$source = trim($_GET['source'] ?? '');
$search = trim($_GET['search'] ?? '');
$limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;

$pdo = getDb();
if (!$pdo) {
    $all = loadLocalInquiries();
    $counts = ['all' => count($all), 'new' => 0, 'contacted' => 0, 'quoted' => 0, 'converted' => 0, 'closed' => 0];
    foreach ($all as $item) {
        $st = strtolower($item['status'] ?? 'new');
        if (isset($counts[$st])) $counts[$st]++;
    }
    $filtered = array_filter($all, function($item) use ($status, $source, $search) {
        if (!empty($status) && $status !== 'all' && strtolower($item['status'] ?? '') !== strtolower($status)) return false;
        if (!empty($source) && $source !== 'all' && strtolower($item['source'] ?? '') !== strtolower($source)) return false;
        if (!empty($search)) {
            $s = strtolower($search);
            $target = strtolower(($item['name'] ?? '') . ' ' . ($item['phone'] ?? '') . ' ' . ($item['email'] ?? '') . ' ' . ($item['destination'] ?? ''));
            if (strpos($target, $s) === false) return false;
        }
        return true;
    });
    jsonSuccess([
        'inquiries' => array_values(array_slice($filtered, 0, $limit)),
        'total' => count($filtered),
        'counts' => $counts,
        'source' => 'local_storage'
    ]);
}

$where = ["1=1"];
$params = [];

if (!empty($status) && $status !== 'all') {
    $where[] = "status = ?";
    $params[] = $status;
}

if (!empty($source) && $source !== 'all') {
    $where[] = "source = ?";
    $params[] = $source;
}

if (!empty($search)) {
    $where[] = "(name LIKE ? OR phone LIKE ? OR email LIKE ? OR destination LIKE ? OR message LIKE ?)";
    $term = "%{$search}%";
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
}

$whereClause = implode(" AND ", $where);

try {
    // 1. Fetch Inquiries List
    $sql = "SELECT * FROM inquiries WHERE {$whereClause} ORDER BY id DESC LIMIT {$limit}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $inquiries = $stmt->fetchAll();

    // 2. Fetch Stat Counts
    $countsStmt = $pdo->query("
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status IN ('New', 'Fresh') THEN 1 ELSE 0 END) AS total_fresh,
            SUM(CASE WHEN status IN ('Contacted', 'Followup', 'Follow-up') THEN 1 ELSE 0 END) AS total_followup,
            SUM(CASE WHEN status = 'Prospect' THEN 1 ELSE 0 END) AS total_prospect,
            SUM(CASE WHEN status = 'Opportunity' THEN 1 ELSE 0 END) AS total_opportunity,
            SUM(CASE WHEN status IN ('Converted', 'Booking') THEN 1 ELSE 0 END) AS total_booking,
            SUM(CASE WHEN status IN ('Lost', 'Loss') THEN 1 ELSE 0 END) AS total_loss,
            SUM(CASE WHEN status = 'Complete' THEN 1 ELSE 0 END) AS total_complete
        FROM inquiries
    ");
    $stats = $countsStmt->fetch();

    // 3. Breakdown by Source
    $sourceStmt = $pdo->query("
        SELECT source, COUNT(*) AS count 
        FROM inquiries 
        GROUP BY source 
        ORDER BY count DESC
    ");
    $sourceBreakdown = $sourceStmt->fetchAll();

    jsonSuccess([
        'inquiries' => $inquiries,
        'stats' => [
            'total'       => (int)($stats['total'] ?? 0),
            'fresh'       => (int)($stats['total_fresh'] ?? 0),
            'new'         => (int)($stats['total_fresh'] ?? 0),
            'followup'    => (int)($stats['total_followup'] ?? 0),
            'prospect'    => (int)($stats['total_prospect'] ?? 0),
            'opportunity' => (int)($stats['total_opportunity'] ?? 0),
            'booking'     => (int)($stats['total_booking'] ?? 0),
            'converted'   => (int)($stats['total_booking'] ?? 0),
            'loss'        => (int)($stats['total_loss'] ?? 0),
            'lost'        => (int)($stats['total_loss'] ?? 0),
            'complete'    => (int)($stats['total_complete'] ?? 0)
        ],
        'sources' => $sourceBreakdown
    ]);

} catch (\PDOException $e) {
    error_log("Get inquiries error: " . $e->getMessage());
    jsonError("Failed to fetch inquiries", 500);
}
