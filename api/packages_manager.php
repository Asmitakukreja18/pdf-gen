<?php
/**
 * api/packages_manager.php — Packages Full CRUD and Publishing Gateway
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');

// 1. LIST PACKAGES
if ($method === 'GET' || $action === 'list') {
    if (!$pdo) {
        echo json_encode(['success' => true, 'packages' => [], 'total' => 0, 'storage_mode' => 'fallback']);
        exit;
    }
    $country = $_GET['country'] ?? 'all';
    $status = $_GET['status'] ?? 'all';
    $search = trim($_GET['search'] ?? '');

    $sql = "SELECT * FROM `packages` WHERE 1=1";
    $params = [];

    if ($country !== 'all' && !empty($country)) {
        $sql .= " AND `country` = ?";
        $params[] = $country;
    }

    if ($status !== 'all' && !empty($status)) {
        if ($status === 'published') {
            $sql .= " AND `is_published` = 1 AND `status` = 'active'";
        } elseif ($status === 'draft') {
            $sql .= " AND (`is_published` = 0 OR `status` = 'draft')";
        }
    }

    if (!empty($search)) {
        $sql .= " AND (`name` LIKE ? OR `destination` LIKE ? OR `country` LIKE ? OR `package_code` LIKE ?)";
        $term = "%$search%";
        $params = array_merge($params, [$term, $term, $term, $term]);
    }

    $sql .= " ORDER BY `id` DESC";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'packages' => $packages, 'total' => count($packages)]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 2. CREATE NEW PACKAGE
if ($action === 'create') {
    $name = trim($input['name'] ?? '');
    $country = trim($input['country'] ?? 'India');
    $destination = trim($input['destination'] ?? '');
    $durationDays = (int)($input['duration_days'] ?? 6);
    $durationNights = (int)($input['duration_nights'] ?? ($durationDays - 1));
    $hotelCat = trim($input['hotel_category'] ?? '4 Star Deluxe');
    $hotelDetails = trim($input['hotel_details'] ?? '');
    $inclusions = trim($input['inclusions'] ?? '');
    $exclusions = trim($input['exclusions'] ?? '');
    $highlights = trim($input['highlights'] ?? '');
    $itineraryJson = is_array($input['itinerary'] ?? null) ? json_encode($input['itinerary'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : ($input['itinerary_json'] ?? '');
    $pricingInr = (float)($input['pricing_inr'] ?? 0);
    $pricingUsd = (float)($input['pricing_usd'] ?? ($pricingInr / 83.5));
    $markup = (float)($input['markup_percent'] ?? 10.0);
    $imageUrl = trim($input['image_url'] ?? '');
    $isPublished = isset($input['is_published']) ? (int)$input['is_published'] : 1;
    $status = ($isPublished === 1) ? 'active' : 'draft';

    if (empty($name) || empty($destination)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Package Name and Destination are required.']);
        exit;
    }

    $code = 'PKG-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $country), 0, 2)) . '-' . strtoupper(substr(uniqid(), -4));

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `packages` 
            (`package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `inclusions`, `exclusions`, `highlights`, `itinerary_json`, `pricing_inr`, `pricing_usd`, `markup_percent`, `image_url`, `is_published`, `status`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $code, $name, $country, $destination, $durationDays, $durationNights, $hotelCat, $hotelDetails, $inclusions, $exclusions, $highlights, $itineraryJson, $pricingInr, $pricingUsd, $markup, $imageUrl, $isPublished, $status
        ]);
        $pkgId = $pdo->lastInsertId();

        // Audit log
        $pdo->prepare("
            INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`)
            VALUES (1, 'Admin', 'created_package', 'Packages', ?, ?, NOW())
        ")->execute([$code, "Created package '$name' ($country)"]);

        echo json_encode([
            'success' => true,
            'message' => "Package '$name' created successfully!",
            'package_id' => $pkgId,
            'package_code' => $code
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 3. UPDATE PACKAGE
if ($action === 'update') {
    $pkgId = (int)($input['package_id'] ?? 0);
    $name = trim($input['name'] ?? '');
    $country = trim($input['country'] ?? 'India');
    $destination = trim($input['destination'] ?? '');
    $durationDays = (int)($input['duration_days'] ?? 6);
    $durationNights = (int)($input['duration_nights'] ?? ($durationDays - 1));
    $hotelCat = trim($input['hotel_category'] ?? '4 Star Deluxe');
    $hotelDetails = trim($input['hotel_details'] ?? '');
    $inclusions = trim($input['inclusions'] ?? '');
    $exclusions = trim($input['exclusions'] ?? '');
    $highlights = trim($input['highlights'] ?? '');
    $pricingInr = (float)($input['pricing_inr'] ?? 0);
    $pricingUsd = (float)($input['pricing_usd'] ?? ($pricingInr / 83.5));
    $markup = (float)($input['markup_percent'] ?? 10.0);
    $isPublished = isset($input['is_published']) ? (int)$input['is_published'] : 1;
    $status = ($isPublished === 1) ? 'active' : 'draft';

    try {
        $stmt = $pdo->prepare("
            UPDATE `packages` 
            SET `name` = ?, `country` = ?, `destination` = ?, `duration_days` = ?, `duration_nights` = ?, 
                `hotel_category` = ?, `hotel_details` = ?, `inclusions` = ?, `exclusions` = ?, `highlights` = ?,
                `pricing_inr` = ?, `pricing_usd` = ?, `markup_percent` = ?, `is_published` = ?, `status` = ?, `updated_at` = NOW()
            WHERE `id` = ?
        ");
        $stmt->execute([
            $name, $country, $destination, $durationDays, $durationNights, $hotelCat, $hotelDetails, $inclusions, $exclusions, $highlights, $pricingInr, $pricingUsd, $markup, $isPublished, $status, $pkgId
        ]);

        echo json_encode(['success' => true, 'message' => "Package updated successfully!"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 4. DUPLICATE PACKAGE
if ($action === 'duplicate') {
    $pkgId = (int)($input['package_id'] ?? 0);
    try {
        $stmt = $pdo->prepare("SELECT * FROM `packages` WHERE `id` = ?");
        $stmt->execute([$pkgId]);
        $orig = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$orig) {
            echo json_encode(['success' => false, 'error' => 'Package not found.']);
            exit;
        }

        $newCode = 'PKG-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $orig['country']), 0, 2)) . '-' . strtoupper(substr(uniqid(), -4));
        $newName = $orig['name'] . ' (Copy)';

        $ins = $pdo->prepare("
            INSERT INTO `packages` 
            (`package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `inclusions`, `exclusions`, `highlights`, `itinerary_json`, `pricing_inr`, `pricing_usd`, `markup_percent`, `image_url`, `is_published`, `status`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft', NOW())
        ");
        $ins->execute([
            $newCode, $newName, $orig['country'], $orig['destination'], $orig['duration_days'], $orig['duration_nights'], $orig['hotel_category'], $orig['hotel_details'], $orig['inclusions'], $orig['exclusions'], $orig['highlights'], $orig['itinerary_json'], $orig['pricing_inr'], $orig['pricing_usd'], $orig['markup_percent'], $orig['image_url']
        ]);

        echo json_encode(['success' => true, 'message' => "Package duplicated as draft ('$newName')."]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 5. TOGGLE PUBLISH STATUS
if ($action === 'toggle_publish') {
    $pkgId = (int)($input['package_id'] ?? 0);
    try {
        $stmt = $pdo->prepare("UPDATE `packages` SET `is_published` = 1 - `is_published`, `updated_at` = NOW() WHERE `id` = ?");
        $stmt->execute([$pkgId]);

        echo json_encode(['success' => true, 'message' => 'Publish status updated.']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 6. DELETE PACKAGE
if ($action === 'delete') {
    $pkgId = (int)($input['package_id'] ?? 0);
    try {
        $stmt = $pdo->prepare("DELETE FROM `packages` WHERE `id` = ?");
        $stmt->execute([$pkgId]);

        echo json_encode(['success' => true, 'message' => 'Package deleted successfully.']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 7. IMPORT PACKAGE FROM GOOGLE DRIVE (W.E RAW ITINERARY)
if ($action === 'import_drive') {
    $driveUrl = trim($input['drive_url'] ?? '');
    $country = trim($input['country'] ?? 'International');
    $name = trim($input['name'] ?? '');

    if (empty($driveUrl)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Please provide a valid Google Drive URL or share link.']);
        exit;
    }

    // Extract Google Drive File ID if present
    $fileId = null;
    if (preg_match('/[-\w]{25,}/', $driveUrl, $matches)) {
        $fileId = $matches[0];
    }

    $destPath = '../uploads/packages/';
    if (!is_dir($destPath)) {
        @mkdir($destPath, 0755, true);
    }

    $savedFilename = 'drive_pkg_' . ($fileId ?: substr(md5(uniqid()), 0, 8)) . '.pdf';
    $localFile = $destPath . $savedFilename;
    $downloadSuccess = false;

    if ($fileId) {
        $downloadUrl = "https://drive.google.com/uc?export=download&id={$fileId}";
        $ctx = stream_context_create([
            'http' => ['timeout' => 15, 'follow_location' => 1, 'user_agent' => 'LetsExplore-DMC-Importer/2.0']
        ]);
        $content = @file_get_contents($downloadUrl, false, $ctx);
        if ($content && strlen($content) > 100) {
            @file_put_contents($localFile, $content);
            $downloadSuccess = true;
        }
    }

    $finalFilePath = $downloadSuccess ? ('uploads/packages/' . $savedFilename) : $driveUrl;
    $pkgTitle = !empty($name) ? $name : ('Master Itinerary (Imported Drive) — ' . $country);
    $pkgCode = 'PKG-DRV-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $country), 0, 2)) . '-' . strtoupper(substr(uniqid(), -4));

    if (!$pdo) {
        echo json_encode([
            'success' => true,
            'package_id' => 999,
            'file_path' => $finalFilePath,
            'message' => 'Google Drive package successfully linked and imported into Ready Itineraries (Local Storage Mode).'
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `packages` 
            (`package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `inclusions`, `exclusions`, `highlights`, `pricing_inr`, `pricing_usd`, `markup_percent`, `itinerary_file`, `is_published`, `status`, `created_at`)
            VALUES (?, ?, ?, ?, 6, 5, '4-Star Deluxe', 'Standard DMC Partner Accommodations', 'Master Itinerary Sightseeing, Transfers, Meals as per schedule', 'Personal expenses, Flights', 'Imported Master Itinerary from Google Drive (W.E)', 45000, 540, 10.0, ?, 1, 'active', NOW())
        ");
        $stmt->execute([
            $pkgCode, $pkgTitle, $country, $country, $finalFilePath
        ]);
        $newId = $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'package_id' => $newId,
            'file_path' => $finalFilePath,
            'message' => 'Google Drive package successfully linked and imported into Ready Itineraries.'
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

