<?php
/**
 * api/get_quotations.php — Retrieve saved quotations
 */

require_once __DIR__ . '/db.php';

$pdo = getDatabaseConnection();
$results = [];

if ($pdo) {
    try {
        // Safe reconciliation: If local fallback JSON has records not yet in MySQL, import them safely
        if (file_exists(LOCAL_FALLBACK_FILE)) {
            $fallbackContent = @file_get_contents(LOCAL_FALLBACK_FILE);
            $fallbackData = json_decode($fallbackContent, true) ?: [];
            if (!empty($fallbackData)) {
                $insStmt = $pdo->prepare("
                    INSERT IGNORE INTO `quotations` (
                        `quote_ref`, `client_name`, `client_phone`, `client_email`,
                        `destination`, `travel_date`, `duration`, `pax_count`,
                        `hotel_name`, `flight_airline`, `flights_total`, `land_total`,
                        `grand_total`, `status`, `full_data_json`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                foreach ($fallbackData as $ref => $q) {
                    $insStmt->execute([
                        $ref,
                        $q['client_name'] ?? 'Guest Traveller',
                        $q['client_phone'] ?? '',
                        $q['client_email'] ?? '',
                        $q['destination'] ?? 'Tour',
                        $q['travel_date'] ?? '',
                        $q['duration'] ?? '',
                        $q['pax_count'] ?? '2 Adults',
                        $q['hotel_name'] ?? '',
                        $q['flight_airline'] ?? '',
                        floatval($q['flights_total'] ?? 0),
                        floatval($q['land_total'] ?? 0),
                        floatval($q['grand_total'] ?? 0),
                        $q['status'] ?? 'Confirmed',
                        json_encode($q['full_data'] ?? $q, JSON_UNESCAPED_UNICODE)
                    ]);
                }
            }
        }

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
