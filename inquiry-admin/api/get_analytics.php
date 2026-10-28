<?php
/**
 * inquiry-admin/api/get_analytics.php — Detailed Lead Performance & Source Metrics
 */

require_once __DIR__ . '/db.php';

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

try {
    // 1. By Source
    $sourceStmt = $pdo->query("SELECT source, COUNT(*) AS count FROM inquiries GROUP BY source ORDER BY count DESC");
    $bySource = $sourceStmt->fetchAll();

    // 2. By Status
    $statusStmt = $pdo->query("SELECT status, COUNT(*) AS count FROM inquiries GROUP BY status ORDER BY count DESC");
    $byStatus = $statusStmt->fetchAll();

    // 3. Overall Totals
    $totalStmt = $pdo->query("
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) AS converted,
            SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) AS new_leads,
            SUM(CASE WHEN status = 'Follow-up' THEN 1 ELSE 0 END) AS in_followup
        FROM inquiries
    ");
    $totals = $totalStmt->fetch();

    $conversionRate = 0;
    if ($totals && $totals['total'] > 0) {
        $conversionRate = round(($totals['converted'] / $totals['total']) * 100, 1);
    }

    // 4. Top Destinations Inquired
    $destStmt = $pdo->query("
        SELECT destination, COUNT(*) AS count 
        FROM inquiries 
        WHERE destination IS NOT NULL AND destination != ''
        GROUP BY destination 
        ORDER BY count DESC 
        LIMIT 5
    ");
    $topDestinations = $destStmt->fetchAll();

    jsonSuccess([
        'total' => (int)($totals['total'] ?? 0),
        'converted' => (int)($totals['converted'] ?? 0),
        'new_leads' => (int)($totals['new_leads'] ?? 0),
        'in_followup' => (int)($totals['in_followup'] ?? 0),
        'conversion_rate' => $conversionRate,
        'by_source' => $bySource,
        'by_status' => $byStatus,
        'top_destinations' => $topDestinations
    ]);

} catch (\PDOException $e) {
    error_log("Analytics error: " . $e->getMessage());
    jsonError('Failed to fetch analytics', 500);
}
