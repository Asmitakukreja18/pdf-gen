<?php
/**
 * api/dashboard_stats.php — Consolidated Real-time Dashboard Metrics
 * Calculates actual metrics from MySQL: leads, quotations, bookings, trips, invoices, activity logs
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
if (!$pdo) {
    echo json_encode([
        'success' => true,
        'metrics' => [
            'total_inquiries' => 0,
            'active_leads' => 0,
            'confirmed_bookings' => 0,
            'mtd_revenue' => 0,
            'running_trips' => 0,
            'pending_followups' => 0,
            'source' => 'db_offline'
        ],
        'recent_inquiries' => [],
        'recent_quotations' => [],
        'upcoming_trips' => [],
        'activity_feed' => []
    ]);
    exit;
}

try {
    // 1. Leads / Inquiries Stats
    $leadStats = [
        'total' => 0,
        'fresh' => 0,
        'followup' => 0,
        'converted' => 0
    ];

    // Check leads table
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status LIKE '%Fresh%' OR status LIKE '%New%' THEN 1 ELSE 0 END) as fresh,
                SUM(CASE WHEN status LIKE '%Follow%' THEN 1 ELSE 0 END) as followup,
                SUM(CASE WHEN status LIKE '%Booking%' OR status LIKE '%Converted%' THEN 1 ELSE 0 END) as converted
            FROM `leads`
        ");
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($res && $res['total'] > 0) {
            $leadStats = [
                'total' => (int)$res['total'],
                'fresh' => (int)$res['fresh'],
                'followup' => (int)$res['followup'],
                'converted' => (int)$res['converted']
            ];
        }
    } catch (Exception $e) {}

    // Fallback or addition from inquiries table if leads was empty
    if ($leadStats['total'] === 0) {
        try {
            $stmt = $pdo->query("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status LIKE '%Fresh%' OR status LIKE '%New%' THEN 1 ELSE 0 END) as fresh,
                    SUM(CASE WHEN status LIKE '%Follow%' THEN 1 ELSE 0 END) as followup,
                    SUM(CASE WHEN status LIKE '%Converted%' THEN 1 ELSE 0 END) as converted
                FROM `inquiries`
            ");
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($res) {
                $leadStats = [
                    'total' => (int)($res['total'] ?? 0),
                    'fresh' => (int)($res['fresh'] ?? 0),
                    'followup' => (int)($res['followup'] ?? 0),
                    'converted' => (int)($res['converted'] ?? 0)
                ];
            }
        } catch (Exception $e) {}
    }

    // 2. Quotations Count from documents table
    $quotesCount = 0;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM `documents` WHERE `doc_type` = 'quotation' OR `title` LIKE '%Quotation%'");
        $quotesCount = (int)$stmt->fetchColumn();
    } catch (Exception $e) {}

    // 3. Running Trips Count
    $runningTripsCount = 0;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM `trips` WHERE `status` = 'Running'");
        $runningTripsCount = (int)$stmt->fetchColumn();
    } catch (Exception $e) {}

    // 4. Total Customers Count
    $customersCount = 0;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM `customers`");
        $customersCount = (int)$stmt->fetchColumn();
    } catch (Exception $e) {}

    // 5. Total Booking / Invoice Value (MTD)
    $grossValue = 0;
    try {
        $stmt = $pdo->query("SELECT SUM(`grand_total`) FROM `invoices`");
        $grossValue = (float)($stmt->fetchColumn() ?: 0);
    } catch (Exception $e) {}

    // 6. Recent Customer Inquiries (Last 5)
    $recentInquiries = [];
    try {
        $stmt = $pdo->query("SELECT id, customer_name, phone, destination, status, assigned_employee, created_at FROM `leads` ORDER BY id DESC LIMIT 5");
        $recentInquiries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}

    // 7. Recent Quotations (Last 5)
    $recentQuotations = [];
    try {
        $stmt = $pdo->query("SELECT id, doc_no, title, customer_name, destination, status, created_at FROM `documents` WHERE `doc_type` = 'quotation' OR `title` LIKE '%Quotation%' ORDER BY id DESC LIMIT 5");
        $recentQuotations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}

    // 8. Upcoming Departures / Trips (Last 5)
    $upcomingTrips = [];
    try {
        $stmt = $pdo->query("SELECT id, trip_code, client_name, destination, travel_start_date, duration, coordinator, status FROM `trips` ORDER BY travel_start_date ASC LIMIT 5");
        $upcomingTrips = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}

    // 9. Team Activity Feed (Last 5)
    $activityFeed = [];
    try {
        $stmt = $pdo->query("SELECT id, employee_name, action, module, entity_id, details, created_at FROM `user_activity_logs` ORDER BY id DESC LIMIT 5");
        $activityFeed = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}

    echo json_encode([
        'success' => true,
        'metrics' => [
            'total_inquiries' => $leadStats['total'],
            'fresh_leads' => $leadStats['fresh'],
            'followups_pending' => $leadStats['followup'],
            'confirmed_bookings' => $leadStats['converted'],
            'quotations_sent' => $quotesCount,
            'running_trips' => $runningTripsCount,
            'total_customers' => $customersCount,
            'gross_booking_value' => $grossValue
        ],
        'recent_inquiries' => $recentInquiries,
        'recent_quotations' => $recentQuotations,
        'upcoming_trips' => $upcomingTrips,
        'activity_feed' => $activityFeed
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
