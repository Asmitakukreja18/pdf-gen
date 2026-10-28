<?php
/**
 * inquiry-admin/api/get_inquiries.php — Retrieve Inquiries with Filters & Counts
 */

require_once __DIR__ . '/db.php';

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

$status = trim($_GET['status'] ?? '');
$source = trim($_GET['source'] ?? '');
$search = trim($_GET['search'] ?? '');
$limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;

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
            SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) AS total_new,
            SUM(CASE WHEN status = 'Contacted' THEN 1 ELSE 0 END) AS total_contacted,
            SUM(CASE WHEN status = 'Follow-up' THEN 1 ELSE 0 END) AS total_followup,
            SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) AS total_converted,
            SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) AS total_lost
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
            'total'      => (int)($stats['total'] ?? 0),
            'new'        => (int)($stats['total_new'] ?? 0),
            'contacted'  => (int)($stats['total_contacted'] ?? 0),
            'followup'   => (int)($stats['total_followup'] ?? 0),
            'converted'  => (int)($stats['total_converted'] ?? 0),
            'lost'       => (int)($stats['total_lost'] ?? 0),
        ],
        'sources' => $sourceBreakdown
    ]);

} catch (\PDOException $e) {
    error_log("Get inquiries error: " . $e->getMessage());
    jsonError("Failed to fetch inquiries", 500);
}
