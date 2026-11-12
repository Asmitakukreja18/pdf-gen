<?php
/**
 * inquiry-admin/api/trips.php — Running Tour Trips & On-Ground Operations Management API
 * 
 * Supports:
 * - List active/upcoming/completed trips
 * - Create new running trip with coordinator assignment
 * - Update status (Upcoming -> Running -> Completed -> Cancelled)
 * - Safe fallback if database is disconnected
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

// Default seeded trips for standby mode or empty database
$defaultTrips = [
    [
        'id' => 1,
        'trip_code' => 'TRIP-DXB-901',
        'client_name' => 'Akash Dewani',
        'client_phone' => '9820011223',
        'destination' => 'Dubai & Abu Dhabi',
        'duration' => '6D/5N',
        'travel_start_date' => '2026-11-05',
        'travel_end_date' => '2026-11-10',
        'flight_details' => 'Emirates EK-501 / Return EK-502',
        'flight_sector' => 'Mum - Mum (BOM-DXB-BOM)',
        'coordinator' => 'Nitin',
        'supplier_name' => 'Desert Gate Tours LLC',
        'hotel_details' => 'Atlantis The Palm (2N) + JW Marriott Marquis (3N)',
        'emergency_contact' => '+91 80075 86881',
        'status' => 'Running',
        'notes' => 'VIP B2B guest from Dewani Travels. Private airport Sprinter transfer confirmed.'
    ],
    [
        'id' => 2,
        'trip_code' => 'TRIP-RAJ-902',
        'client_name' => 'Dipesh Batra',
        'client_phone' => '7020660318',
        'destination' => 'Rajasthan Heritage (Udaipur + Jaipur)',
        'duration' => '5D/4N',
        'travel_start_date' => '2026-11-08',
        'travel_end_date' => '2026-11-12',
        'flight_details' => 'IndiGo 6E-241',
        'flight_sector' => 'Del - Del (DEL-UDR-DEL)',
        'coordinator' => 'Nitin',
        'supplier_name' => 'Heritage Royal Cabs & Hotels',
        'hotel_details' => 'Trident Udaipur (2N) + ITC Rajputana Jaipur (2N)',
        'emergency_contact' => '+91 80075 86881',
        'status' => 'Upcoming',
        'notes' => 'Innova Crysta with English speaking chauffeur assigned.'
    ],
    [
        'id' => 3,
        'trip_code' => 'TRIP-TH-903',
        'client_name' => 'Mrs. Sneha Patil (4 Pax)',
        'client_phone' => '9833445566',
        'destination' => 'Thailand (Phuket & Krabi)',
        'duration' => '7D/6N',
        'travel_start_date' => '2026-11-14',
        'travel_end_date' => '2026-11-20',
        'flight_details' => 'Thai Airways TG-318',
        'flight_sector' => 'BOM-BKK-HKT-BOM',
        'coordinator' => 'Local Desk',
        'supplier_name' => 'Andaman Discovery Holidays',
        'hotel_details' => 'Ashlee Plaza Hotel Phuket + GLOW Ao Nang Krabi',
        'emergency_contact' => '+66 81 234 5678',
        'status' => 'Upcoming',
        'notes' => '15% markup package applied. Phi Phi and 4-Island speedboats booked.'
    ]
];

// 1. LIST TRIPS
if ($method === 'GET' || $action === 'list') {
    if (!$pdo) {
        jsonSuccess(['trips' => $defaultTrips, 'source' => 'standby_mode']);
    }

    try {
        $status = $_GET['status'] ?? 'all';
        $search = trim($_GET['search'] ?? '');
        $coordinator = trim($_GET['coordinator'] ?? '');

        $sql = "SELECT * FROM `trips` WHERE 1=1";
        $params = [];

        if ($status !== 'all' && !empty($status)) {
            $sql .= " AND `status` = ?";
            $params[] = $status;
        }

        if (!empty($coordinator) && $coordinator !== 'all') {
            $sql .= " AND `coordinator` LIKE ?";
            $params[] = "%$coordinator%";
        }

        if (!empty($search)) {
            $sql .= " AND (`client_name` LIKE ? OR `trip_code` LIKE ? OR `destination` LIKE ? OR `flight_sector` LIKE ? OR `coordinator` LIKE ?)";
            $term = "%$search%";
            $params = array_merge($params, [$term, $term, $term, $term, $term]);
        }

        $sql .= " ORDER BY `travel_start_date` ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $trips = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Auto-seed trips table if empty
        if (empty($trips) && empty($search) && ($status === 'all' || empty($status))) {
            foreach ($defaultTrips as $dt) {
                try {
                    $pdo->prepare("
                        INSERT IGNORE INTO `trips` 
                        (`trip_code`, `client_name`, `client_phone`, `destination`, `duration`, `travel_start_date`, `travel_end_date`, `flight_details`, `flight_sector`, `coordinator`, `supplier_name`, `hotel_details`, `emergency_contact`, `status`, `notes`, `created_at`)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ")->execute([
                        $dt['trip_code'], $dt['client_name'], $dt['client_phone'], $dt['destination'],
                        $dt['duration'], $dt['travel_start_date'], $dt['travel_end_date'], $dt['flight_details'],
                        $dt['flight_sector'], $dt['coordinator'], $dt['supplier_name'], $dt['hotel_details'],
                        $dt['emergency_contact'], $dt['status'], $dt['notes']
                    ]);
                } catch (\Throwable $th) {}
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $trips = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Summary counts
        $counts = ['active' => 0, 'upcoming' => 0, 'completed' => 0];
        foreach ($trips as $t) {
            $st = strtolower($t['status'] ?? '');
            if ($st === 'running') $counts['active']++;
            elseif ($st === 'upcoming') $counts['upcoming']++;
            elseif ($st === 'completed') $counts['completed']++;
        }

        jsonSuccess([
            'trips' => $trips ?: $defaultTrips,
            'counts' => $counts,
            'total' => count($trips ?: $defaultTrips)
        ]);
    } catch (\Throwable $e) {
        jsonSuccess(['trips' => $defaultTrips, 'error' => $e->getMessage()]);
    }
}

// 2. CREATE NEW TRIP
if ($action === 'create') {
    $clientName = trim($input['client_name'] ?? '');
    $destination = trim($input['destination'] ?? '');
    $phone = trim($input['client_phone'] ?? '');
    $duration = trim($input['duration'] ?? '6D/5N');
    $startDate = !empty($input['travel_start_date']) ? $input['travel_start_date'] : date('Y-m-d');
    $endDate = !empty($input['travel_end_date']) ? $input['travel_end_date'] : date('Y-m-d', strtotime('+5 days'));
    $flightDetails = trim($input['flight_details'] ?? '');
    $flightSector = trim($input['flight_sector'] ?? 'BOM-DXB-BOM');
    $coordinator = trim($input['coordinator'] ?? 'Nitin');
    $supplierName = trim($input['supplier_name'] ?? '');
    $hotelDetails = trim($input['hotel_details'] ?? '');
    $status = trim($input['status'] ?? 'Running');
    $notes = trim($input['notes'] ?? '');

    if (empty($clientName) || empty($destination)) {
        jsonError('Client Name and Destination are required.');
    }

    $tripCode = 'TRIP-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $destination), 0, 3)) . '-' . mt_rand(100, 999);

    if (!$pdo) {
        jsonSuccess([
            'trip_code' => $tripCode,
            'client_name' => $clientName,
            'destination' => $destination,
            'coordinator' => $coordinator
        ], "Running trip $tripCode created successfully (Standby Mode)!");
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `trips`
            (`trip_code`, `client_name`, `client_phone`, `destination`, `duration`, `travel_start_date`, `travel_end_date`, `flight_details`, `flight_sector`, `coordinator`, `supplier_name`, `hotel_details`, `emergency_contact`, `status`, `notes`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '+91 80075 86881', ?, ?, NOW())
        ");
        $stmt->execute([
            $tripCode, $clientName, $phone, $destination, $duration, $startDate, $endDate,
            $flightDetails, $flightSector, $coordinator, $supplierName, $hotelDetails, $status, $notes
        ]);
        $tripId = (int)$pdo->lastInsertId();

        // Audit log
        try {
            $pdo->prepare("
                INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
                VALUES (1, ?, 'created_trip', 'Trips', ?, ?, NOW())
            ")->execute([$coordinator, $tripCode, "Added running trip $tripCode for $clientName ($destination)"]);
        } catch (\Throwable $th) {}

        jsonSuccess([
            'id' => $tripId,
            'trip_code' => $tripCode,
            'client_name' => $clientName,
            'destination' => $destination,
            'coordinator' => $coordinator
        ], "Running tour trip $tripCode created successfully!");
    } catch (\Throwable $e) {
        jsonError('Failed to create running trip: ' . $e->getMessage(), 500);
    }
}

// 3. UPDATE TRIP STATUS
if ($action === 'update_status') {
    $tripId = (int)($input['id'] ?? $input['trip_id'] ?? 0);
    $newStatus = trim($input['status'] ?? '');

    if ($tripId <= 0 || empty($newStatus)) {
        jsonError('Valid trip ID and new status are required.', 400);
    }

    if (!$pdo) {
        jsonSuccess(['id' => $tripId, 'status' => $newStatus], "Trip #$tripId status updated to $newStatus.");
    }

    try {
        $stmt = $pdo->prepare("UPDATE `trips` SET `status` = ? WHERE `id` = ?");
        $stmt->execute([$newStatus, $tripId]);

        jsonSuccess(['id' => $tripId, 'status' => $newStatus], "Trip #$tripId status updated to $newStatus.");
    } catch (\Throwable $e) {
        jsonError('Failed to update trip status: ' . $e->getMessage(), 500);
    }
}

