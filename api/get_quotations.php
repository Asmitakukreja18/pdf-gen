<?php
/**
 * api/get_quotations.php — Retrieve saved quotations
 */

require_once __DIR__ . '/db.php';

$pdo = getDatabaseConnection();
$results = [];

if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT id, quote_ref, client_name, client_phone, destination, travel_date, duration, pax_count, grand_total, status, updated_at, full_data_json FROM `quotations` ORDER BY `updated_at` DESC LIMIT 100");
        $rows = $stmt->fetchAll();
        foreach ($rows as $row) {
            $row['full_data'] = json_decode($row['full_data_json'], true);
            unset($row['full_data_json']);
            $results[] = $row;
        }

        echo json_encode([
            'success'   => true,
            'source'    => 'MySQL (cPanel Database)',
            'count'     => count($results),
            'quotations'=> $results
        ]);
        exit;
    } catch (\PDOException $e) {
        error_log("Failed to fetch from MySQL: " . $e->getMessage());
    }
}

// Fallback to JSON file
if (file_exists(LOCAL_FALLBACK_FILE)) {
    $content = @file_get_contents(LOCAL_FALLBACK_FILE);
    $data = json_decode($content, true) ?: [];
    $results = array_values($data);
    usort($results, function($a, $b) {
        return strcmp($b['updated_at'] ?? '', $a['updated_at'] ?? '');
    });
}

echo json_encode([
    'success'   => true,
    'source'    => 'File Store (Configure MySQL in api/config.php for cPanel)',
    'count'     => count($results),
    'quotations'=> $results
]);
