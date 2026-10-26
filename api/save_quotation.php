<?php
/**
 * api/save_quotation.php — Save or update quotation in MySQL or fallback file
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!$payload || !is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload received.']);
    exit;
}

// Extract primary quotation attributes
$quoteRef     = !empty($payload['quoteRef']) ? trim($payload['quoteRef']) : ('LEDMC-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8)));
$clientName   = !empty($payload['client']['name']) ? trim($payload['client']['name']) : (!empty($payload['clientName']) ? trim($payload['clientName']) : 'Guest Traveller');
$clientPhone  = !empty($payload['client']['phone']) ? trim($payload['client']['phone']) : '';
$clientEmail  = !empty($payload['client']['email']) ? trim($payload['client']['email']) : '';
$destination  = !empty($payload['destination']) ? trim($payload['destination']) : 'Custom Destination';
$travelDate   = !empty($payload['client']['travelDate']) ? trim($payload['client']['travelDate']) : '';
$duration     = !empty($payload['client']['duration']) ? trim($payload['client']['duration']) : '';
$paxCount     = !empty($payload['client']['pax']) ? trim($payload['client']['pax']) : '2 Adults';
$hotelName    = !empty($payload['landArrangement']['hotelName']) ? trim($payload['landArrangement']['hotelName']) : '';
$hotelNights  = !empty($payload['landArrangement']['nights']) ? trim($payload['landArrangement']['nights']) : '';
$flightAirline= !empty($payload['flightDetails']['airline']) ? trim($payload['flightDetails']['airline']) : '';
$flightSector = (!empty($payload['flightDetails']['origin']) && !empty($payload['flightDetails']['destination'])) 
                ? ($payload['flightDetails']['origin'] . ' -> ' . $payload['flightDetails']['destination']) : '';

$flightsTotal = isset($payload['flightsTotal']) ? floatval($payload['flightsTotal']) : 0.00;
$landTotal    = isset($payload['landTotal']) ? floatval($payload['landTotal']) : 0.00;
$grandTotal   = isset($payload['grandTotal']) ? floatval($payload['grandTotal']) : ($flightsTotal + $landTotal);
$status       = !empty($payload['status']) ? trim($payload['status']) : 'Confirmed';

$fullDataJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

$pdo = getDatabaseConnection();

if ($pdo) {
    try {
        // Prepare MySQL Insert or Update statement
        $sql = "INSERT INTO `quotations` (
                    `quote_ref`, `client_name`, `client_phone`, `client_email`, 
                    `destination`, `travel_date`, `duration`, `pax_count`, 
                    `hotel_name`, `hotel_nights`, `flight_airline`, `flight_sector`, 
                    `flights_total`, `land_total`, `grand_total`, `status`, `full_data_json`
                ) VALUES (
                    :quote_ref, :client_name, :client_phone, :client_email,
                    :destination, :travel_date, :duration, :pax_count,
                    :hotel_name, :hotel_nights, :flight_airline, :flight_sector,
                    :flights_total, :land_total, :grand_total, :status, :full_data_json
                ) ON DUPLICATE KEY UPDATE 
                    `client_name`   = VALUES(`client_name`),
                    `client_phone`  = VALUES(`client_phone`),
                    `client_email`  = VALUES(`client_email`),
                    `destination`   = VALUES(`destination`),
                    `travel_date`   = VALUES(`travel_date`),
                    `duration`      = VALUES(`duration`),
                    `pax_count`     = VALUES(`pax_count`),
                    `hotel_name`    = VALUES(`hotel_name`),
                    `hotel_nights`  = VALUES(`hotel_nights`),
                    `flight_airline`= VALUES(`flight_airline`),
                    `flight_sector` = VALUES(`flight_sector`),
                    `flights_total` = VALUES(`flights_total`),
                    `land_total`    = VALUES(`land_total`),
                    `grand_total`   = VALUES(`grand_total`),
                    `status`        = VALUES(`status`),
                    `full_data_json`= VALUES(`full_data_json`),
                    `updated_at`    = CURRENT_TIMESTAMP";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':quote_ref'     => $quoteRef,
            ':client_name'   => $clientName,
            ':client_phone'  => $clientPhone,
            ':client_email'  => $clientEmail,
            ':destination'   => $destination,
            ':travel_date'   => $travelDate,
            ':duration'      => $duration,
            ':pax_count'     => $paxCount,
            ':hotel_name'    => $hotelName,
            ':hotel_nights'  => $hotelNights,
            ':flight_airline'=> $flightAirline,
            ':flight_sector' => $flightSector,
            ':flights_total' => $flightsTotal,
            ':land_total'    => $landTotal,
            ':grand_total'   => $grandTotal,
            ':status'        => $status,
            ':full_data_json'=> $fullDataJson
        ]);

        echo json_encode([
            'success'   => true,
            'source'    => 'MySQL (cPanel Database)',
            'quote_ref' => $quoteRef,
            'client'    => $clientName,
            'total'     => $grandTotal,
            'message'   => 'Quotation successfully saved to MySQL database!'
        ]);
        exit;

    } catch (\PDOException $e) {
        error_log("Failed to insert into MySQL: " . $e->getMessage());
        // Fall through to file fallback
    }
}

// Fallback Storage: JSON file in data/saved_quotations.json
$dataDir = dirname(LOCAL_FALLBACK_FILE);
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$existing = [];
if (file_exists(LOCAL_FALLBACK_FILE)) {
    $content = @file_get_contents(LOCAL_FALLBACK_FILE);
    $existing = json_decode($content, true) ?: [];
}

$record = [
    'quote_ref'      => $quoteRef,
    'client_name'    => $clientName,
    'client_phone'   => $clientPhone,
    'client_email'   => $clientEmail,
    'destination'    => $destination,
    'travel_date'    => $travelDate,
    'duration'       => $duration,
    'pax_count'      => $paxCount,
    'hotel_name'     => $hotelName,
    'flight_airline' => $flightAirline,
    'flights_total'  => $flightsTotal,
    'land_total'     => $landTotal,
    'grand_total'    => $grandTotal,
    'status'         => $status,
    'updated_at'     => date('Y-m-d H:i:s'),
    'full_data'      => $payload
];

$existing[$quoteRef] = $record;
@file_put_contents(LOCAL_FALLBACK_FILE, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
    'success'   => true,
    'source'    => 'File Store (Configure MySQL in api/config.php for cPanel)',
    'quote_ref' => $quoteRef,
    'client'    => $clientName,
    'total'     => $grandTotal,
    'message'   => 'Quotation saved successfully in storage file!'
]);
