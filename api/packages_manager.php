<?php
/**
 * api/packages_manager.php — Packages Full CRUD and Real-Time Publishing Gateway
 * Supports MySQL DB with automatic sync to data/packages.json fallback.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? 'list');
$packagesJsonPath = __DIR__ . '/../data/packages.json';

function getFallbackPackages($filePath) {
    if (file_exists($filePath)) {
        $raw = file_get_contents($filePath);
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveFallbackPackages($filePath, $data) {
    @file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

// 1. LIST PACKAGES
if ($method === 'GET' || $action === 'list') {
    $country = strtolower(trim($_GET['country'] ?? 'all'));
    $status = strtolower(trim($_GET['status'] ?? 'all'));
    $search = strtolower(trim($_GET['search'] ?? ''));

    $packages = [];

    if ($pdo) {
        try {
            $sql = "SELECT * FROM `packages` WHERE 1=1";
            $params = [];

            if ($country !== 'all' && !empty($country)) {
                $sql .= " AND LOWER(`country`) LIKE ?";
                $params[] = "%$country%";
            }

            if ($status !== 'all' && !empty($status)) {
                if ($status === 'published' || $status === 'active') {
                    $sql .= " AND `is_published` = 1 AND `status` = 'active'";
                } elseif ($status === 'draft' || $status === 'inactive') {
                    $sql .= " AND (`is_published` = 0 OR `status` = 'draft' OR `status` = 'inactive')";
                }
            }

            if (!empty($search)) {
                $sql .= " AND (LOWER(`name`) LIKE ? OR LOWER(`destination`) LIKE ? OR LOWER(`country`) LIKE ? OR LOWER(`package_code`) LIKE ?)";
                $term = "%$search%";
                $params = array_merge($params, [$term, $term, $term, $term]);
            }

            $sql .= " ORDER BY `id` DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $packages = [];
        }
    }

    // If DB is empty or unavailable, load from data/packages.json
    if (empty($packages)) {
        $allJson = getFallbackPackages($packagesJsonPath);
        $packages = array_filter($allJson, function($p) use ($country, $status, $search) {
            $pCountry = strtolower($p['country'] ?? '');
            $pName = strtolower($p['name'] ?? '');
            $pDest = strtolower($p['destination'] ?? '');
            $pCode = strtolower($p['package_code'] ?? '');
            $pStatus = strtolower($p['status'] ?? 'active');
            $pPub = (int)($p['is_published'] ?? 1);

            if ($country !== 'all' && strpos($pCountry, $country) === false) return false;
            if ($status === 'published' || $status === 'active') {
                if ($pPub !== 1 || $pStatus !== 'active') return false;
            } elseif ($status === 'draft' || $status === 'inactive') {
                if ($pPub === 1 && $pStatus === 'active') return false;
            }
            if (!empty($search)) {
                if (strpos($pName, $search) === false && strpos($pDest, $search) === false && strpos($pCountry, $search) === false && strpos($pCode, $search) === false) {
                    return false;
                }
            }
            return true;
        });
        $packages = array_values($packages);
    }

    echo json_encode(['success' => true, 'packages' => $packages, 'total' => count($packages)]);
    exit;
}

// 2. CREATE NEW PACKAGE
if ($action === 'create') {
    $name = trim($input['name'] ?? '');
    $country = trim($input['country'] ?? 'India');
    $destination = trim($input['destination'] ?? '');
    $durationDays = (int)($input['duration_days'] ?? 6);
    $durationNights = (int)($input['duration_nights'] ?? ($durationDays - 1));
    $hotelCat = trim($input['hotel_category'] ?? '4-Star Deluxe');
    $hotelDetails = trim($input['hotel_details'] ?? '');
    $inclusions = trim($input['inclusions'] ?? '');
    $exclusions = trim($input['exclusions'] ?? '');
    $highlights = trim($input['highlights'] ?? '');
    $pricingInr = (float)($input['pricing_inr'] ?? 0);
    $pricingUsd = (float)($input['pricing_usd'] ?? ($pricingInr / 83.5));
    $markup = (float)($input['markup_percent'] ?? 10.0);
    $isPublished = isset($input['is_published']) ? (int)$input['is_published'] : 1;
    $status = ($isPublished === 1) ? 'active' : 'inactive';
    $code = 'PKG-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $country), 0, 2)) . '-' . strtoupper(substr(uniqid(), -4));

    if (empty($name) || empty($destination)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Package Name and Destination are required.']);
        exit;
    }

    $newPkg = [
        'id' => time(),
        'package_code' => $code,
        'name' => $name,
        'country' => $country,
        'destination' => $destination,
        'duration_days' => $durationDays,
        'duration_nights' => $durationNights,
        'hotel_category' => $hotelCat,
        'hotel_details' => $hotelDetails,
        'inclusions' => $inclusions,
        'exclusions' => $exclusions,
        'highlights' => $highlights,
        'pricing_inr' => $pricingInr,
        'pricing_usd' => $pricingUsd,
        'markup_percent' => $markup,
        'is_published' => $isPublished,
        'status' => $status,
        'created_at' => date('Y-m-d H:i:s')
    ];

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO `packages` 
                (`package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `inclusions`, `exclusions`, `highlights`, `pricing_inr`, `pricing_usd`, `markup_percent`, `is_published`, `status`, `created_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $code, $name, $country, $destination, $durationDays, $durationNights, $hotelCat, $hotelDetails, $inclusions, $exclusions, $highlights, $pricingInr, $pricingUsd, $markup, $isPublished, $status
            ]);
            $newPkg['id'] = (int)$pdo->lastInsertId();
        } catch (Exception $e) {}
    }

    // Sync to JSON
    $jsonPkgs = getFallbackPackages($packagesJsonPath);
    array_unshift($jsonPkgs, $newPkg);
    saveFallbackPackages($packagesJsonPath, $jsonPkgs);

    echo json_encode([
        'success' => true,
        'message' => "Package '$name' created successfully!",
        'package_id' => $newPkg['id'],
        'package' => $newPkg
    ]);
    exit;
}

// 3. UPDATE PACKAGE
if ($action === 'update') {
    $pkgId = (int)($input['package_id'] ?? ($input['id'] ?? 0));
    $name = trim($input['name'] ?? '');
    $country = trim($input['country'] ?? 'India');
    $destination = trim($input['destination'] ?? '');
    $durationDays = (int)($input['duration_days'] ?? 6);
    $durationNights = (int)($input['duration_nights'] ?? ($durationDays - 1));
    $hotelCat = trim($input['hotel_category'] ?? '4-Star Deluxe');
    $hotelDetails = trim($input['hotel_details'] ?? '');
    $inclusions = trim($input['inclusions'] ?? '');
    $exclusions = trim($input['exclusions'] ?? '');
    $highlights = trim($input['highlights'] ?? '');
    $pricingInr = (float)($input['pricing_inr'] ?? 0);
    $pricingUsd = (float)($input['pricing_usd'] ?? ($pricingInr / 83.5));
    $markup = (float)($input['markup_percent'] ?? 10.0);
    $isPublished = isset($input['is_published']) ? (int)$input['is_published'] : 1;
    $status = ($isPublished === 1) ? 'active' : 'inactive';

    if ($pdo) {
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
        } catch (Exception $e) {}
    }

    // Sync to JSON
    $jsonPkgs = getFallbackPackages($packagesJsonPath);
    foreach ($jsonPkgs as &$p) {
        if ($p['id'] == $pkgId) {
            $p['name'] = $name;
            $p['country'] = $country;
            $p['destination'] = $destination;
            $p['duration_days'] = $durationDays;
            $p['duration_nights'] = $durationNights;
            $p['hotel_category'] = $hotelCat;
            $p['hotel_details'] = $hotelDetails;
            $p['inclusions'] = $inclusions;
            $p['exclusions'] = $exclusions;
            $p['highlights'] = $highlights;
            $p['pricing_inr'] = $pricingInr;
            $p['pricing_usd'] = $pricingUsd;
            $p['markup_percent'] = $markup;
            $p['is_published'] = $isPublished;
            $p['status'] = $status;
            break;
        }
    }
    saveFallbackPackages($packagesJsonPath, $jsonPkgs);

    echo json_encode(['success' => true, 'message' => "Package updated successfully!"]);
    exit;
}

// 4. TOGGLE PUBLISH / ACTIVE STATUS
if ($action === 'toggle_publish' || $action === 'toggle_status') {
    $pkgId = (int)($input['package_id'] ?? ($input['id'] ?? 0));
    $newPublished = 1;
    $newStatus = 'active';

    $jsonPkgs = getFallbackPackages($packagesJsonPath);
    foreach ($jsonPkgs as &$p) {
        if ($p['id'] == $pkgId) {
            $p['is_published'] = ($p['is_published'] == 1) ? 0 : 1;
            $p['status'] = ($p['is_published'] == 1) ? 'active' : 'inactive';
            $newPublished = $p['is_published'];
            $newStatus = $p['status'];
            break;
        }
    }
    saveFallbackPackages($packagesJsonPath, $jsonPkgs);

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE `packages` SET `is_published` = ?, `status` = ?, `updated_at` = NOW() WHERE `id` = ?");
            $stmt->execute([$newPublished, $newStatus, $pkgId]);
        } catch (Exception $e) {}
    }

    echo json_encode(['success' => true, 'is_published' => $newPublished, 'status' => $newStatus, 'message' => 'Package status updated.']);
    exit;
}

// 5. DELETE PACKAGE
if ($action === 'delete') {
    $pkgId = (int)($input['package_id'] ?? ($input['id'] ?? 0));

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM `packages` WHERE `id` = ?");
            $stmt->execute([$pkgId]);
        } catch (Exception $e) {}
    }

    $jsonPkgs = getFallbackPackages($packagesJsonPath);
    $jsonPkgs = array_values(array_filter($jsonPkgs, function($p) use ($pkgId) {
        return $p['id'] != $pkgId;
    }));
    saveFallbackPackages($packagesJsonPath, $jsonPkgs);

    echo json_encode(['success' => true, 'message' => 'Package deleted successfully.']);
    exit;
}

// 6. IMPORT SINGLE OR BATCH FROM GOOGLE DRIVE / ITINERARY FILES
if ($action === 'import_drive' || $action === 'batch_import_drive') {
    $items = $input['items'] ?? null;
    if (!$items) {
        $single = [
            'name' => trim($input['name'] ?? ''),
            'country' => trim($input['country'] ?? 'India'),
            'destination' => trim($input['destination'] ?? ''),
            'duration_days' => (int)($input['duration_days'] ?? 4),
            'duration_nights' => (int)($input['duration_nights'] ?? 3),
            'pricing_inr' => (float)($input['pricing_inr'] ?? 32500),
            'pricing_usd' => (float)($input['pricing_usd'] ?? 390),
            'hotel_category' => trim($input['hotel_category'] ?? '4-Star Deluxe Resort'),
            'hotel_details' => trim($input['hotel_details'] ?? ''),
            'highlights' => trim($input['highlights'] ?? ''),
            'inclusions' => trim($input['inclusions'] ?? ''),
            'exclusions' => trim($input['exclusions'] ?? ''),
            'source_drive_file' => trim($input['drive_file'] ?? ($input['drive_url'] ?? ''))
        ];
        $items = [$single];
    }

    $importedCount = 0;
    $jsonPkgs = getFallbackPackages($packagesJsonPath);

    foreach ($items as $item) {
        $name = trim($item['name'] ?? 'Imported Itinerary');
        $country = trim($item['country'] ?? 'India');
        $destination = trim($item['destination'] ?? $country);
        $days = (int)($item['duration_days'] ?? 4);
        $nights = (int)($item['duration_nights'] ?? ($days - 1));
        $priceInr = (float)($item['pricing_inr'] ?? 35000);
        $priceUsd = (float)($item['pricing_usd'] ?? ($priceInr / 83.5));
        $hotelCat = trim($item['hotel_category'] ?? '4-Star Deluxe');
        $hotelDetails = trim($item['hotel_details'] ?? '');
        $highlights = trim($item['highlights'] ?? '');
        $inclusions = trim($item['inclusions'] ?? '');
        $exclusions = trim($item['exclusions'] ?? '');
        $driveFile = trim($item['source_drive_file'] ?? '');

        $code = 'PKG-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $country), 0, 2)) . '-' . strtoupper(substr(uniqid(), -4));

        $newEntry = [
            'id' => time() + rand(1, 999),
            'package_code' => $code,
            'name' => $name,
            'country' => $country,
            'destination' => $destination,
            'duration_days' => $days,
            'duration_nights' => $nights,
            'hotel_category' => $hotelCat,
            'hotel_details' => $hotelDetails,
            'pricing_inr' => $priceInr,
            'pricing_usd' => $priceUsd,
            'markup_percent' => 10,
            'highlights' => $highlights,
            'inclusions' => $inclusions,
            'exclusions' => $exclusions,
            'is_published' => 1,
            'status' => 'active',
            'source_drive_file' => $driveFile,
            'created_at' => date('Y-m-d H:i:s')
        ];

        // Check if package already exists by name
        $existingIdx = -1;
        foreach ($jsonPkgs as $idx => $ex) {
            if (strtolower($ex['name']) === strtolower($name)) {
                $existingIdx = $idx;
                break;
            }
        }

        if ($existingIdx >= 0) {
            $jsonPkgs[$existingIdx] = array_merge($jsonPkgs[$existingIdx], $newEntry);
        } else {
            array_unshift($jsonPkgs, $newEntry);
        }

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO `packages`
                    (`package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `highlights`, `inclusions`, `exclusions`, `pricing_inr`, `pricing_usd`, `markup_percent`, `is_published`, `status`, `created_at`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, 1, 'active', NOW())
                ");
                $stmt->execute([
                    $code, $name, $country, $destination, $days, $nights, $hotelCat, $hotelDetails, $highlights, $inclusions, $exclusions, $priceInr, $priceUsd
                ]);
            } catch (Exception $e) {}
        }

        $importedCount++;
    }

    saveFallbackPackages($packagesJsonPath, $jsonPkgs);

    echo json_encode([
        'success' => true,
        'imported_count' => $importedCount,
        'message' => "Successfully imported $importedCount itinerary packages from Google Drive!"
    ]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Unknown action.']);
