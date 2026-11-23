<?php
/**
 * api/packages_manager.php — Single Source of Truth for Master Packages & Documents
 * Supports MySQL DB with automatic schema sync, version tracking (package_versions),
 * and persistent sync to data/packages.json fallback.
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

// -------------------------------------------------------------
// 1. GET SINGLE PACKAGE (By ID or Package Code)
// -------------------------------------------------------------
if ($action === 'get') {
    $pkgId = (int)($input['package_id'] ?? ($input['id'] ?? ($_GET['id'] ?? ($_GET['package_id'] ?? 0))));
    $code = trim($input['package_code'] ?? ($input['code'] ?? ($_GET['code'] ?? ($_GET['package_code'] ?? ''))));

    $found = null;

    if ($pdo && ($pkgId > 0 || !empty($code))) {
        try {
            if ($pkgId > 0) {
                $stmt = $pdo->prepare("SELECT * FROM `packages` WHERE `id` = ? LIMIT 1");
                $stmt->execute([$pkgId]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM `packages` WHERE `package_code` = ? LIMIT 1");
                $stmt->execute([$code]);
            }
            $found = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {}
    }

    if (!$found) {
        $allJson = getFallbackPackages($packagesJsonPath);
        foreach ($allJson as $p) {
            if (($pkgId > 0 && ($p['id'] == $pkgId)) || (!empty($code) && strcasecmp($p['package_code'] ?? '', $code) === 0)) {
                $found = $p;
                break;
            }
        }
    }

    if ($found) {
        // Parse JSON strings to objects if needed
        if (!empty($found['itinerary_json']) && is_string($found['itinerary_json'])) {
            $parsedItin = json_decode($found['itinerary_json'], true);
            if ($parsedItin) $found['itinerary_json'] = $parsedItin;
        }
        if (!empty($found['full_data']) && is_string($found['full_data'])) {
            $parsedFull = json_decode($found['full_data'], true);
            if ($parsedFull) $found['full_data'] = $parsedFull;
        }
        echo json_encode(['success' => true, 'package' => $found]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Package not found']);
    }
    exit;
}

// -------------------------------------------------------------
// 2. LIST PACKAGES
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// 3. CREATE NEW PACKAGE (With Version 1 Initialization)
// -------------------------------------------------------------
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
    $clientName = trim($input['client_name'] ?? 'Valued Traveler');
    $clientPhone = trim($input['client_phone'] ?? '');
    $clientEmail = trim($input['client_email'] ?? '');
    $docType = trim($input['doc_type'] ?? 'quotation');
    $changeSummary = trim($input['change_summary'] ?? 'Initial creation');
    $isPublished = isset($input['is_published']) ? (int)$input['is_published'] : 1;
    $status = ($isPublished === 1) ? 'active' : 'inactive';
    $version = 1;

    $isDining = (stripos($name, 'villa nautica') !== false || (stripos($destination, 'maldives') !== false && stripos($name, 'dining') !== false));
    $countryCode = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $country), 0, 2));
    if (empty($countryCode)) $countryCode = 'XX';
    $code = !empty($input['package_code']) ? trim($input['package_code']) : ($isDining ? 'PKG-MLE-VN-DINING' : ('PKG-' . $countryCode . '-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 4))));

    $filePath = trim($input['file_path'] ?? '');
    if (empty($filePath) && $isDining) {
        $filePath = 'uploads/VillaNautica_Maldives_Dining_Experiences_Doubled.html';
    }
    $sourceDriveFile = !empty($filePath) ? basename($filePath) : '';

    if (empty($name) || empty($destination)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Package Name and Destination are required.']);
        exit;
    }

    $fullData = !empty($input['full_data']) ? $input['full_data'] : null;
    $itineraryJson = !empty($input['itinerary_json']) ? $input['itinerary_json'] : ($fullData ? $fullData : null);

    $fullDataStr = $fullData ? (is_string($fullData) ? $fullData : json_encode($fullData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) : null;
    $itineraryJsonStr = $itineraryJson ? (is_string($itineraryJson) ? $itineraryJson : json_encode($itineraryJson, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) : null;

    $newPkg = [
        'id' => $isDining ? 100 : time(),
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
        'client_name' => $clientName,
        'client_phone' => $clientPhone,
        'client_email' => $clientEmail,
        'doc_type' => $docType,
        'version' => $version,
        'full_data' => $fullData,
        'itinerary_json' => $itineraryJson,
        'is_published' => $isPublished,
        'status' => $status,
        'file_path' => $filePath,
        'source_drive_file' => $sourceDriveFile,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
        'history' => [
            [
                'version' => 1,
                'change_summary' => $changeSummary,
                'created_at' => date('Y-m-d H:i:s'),
                'pricing_inr' => $pricingInr,
                'pricing_usd' => $pricingUsd
            ]
        ]
    ];

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO `packages` 
                (`package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `inclusions`, `exclusions`, `highlights`, `itinerary_json`, `full_data`, `pricing_inr`, `pricing_usd`, `markup_percent`, `client_name`, `client_phone`, `client_email`, `doc_type`, `version`, `file_path`, `source_drive_file`, `is_published`, `status`, `created_at`, `updated_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([
                $code, $name, $country, $destination, $durationDays, $durationNights, $hotelCat, $hotelDetails, $inclusions, $exclusions, $highlights, $itineraryJsonStr, $fullDataStr, $pricingInr, $pricingUsd, $markup, $clientName, $clientPhone, $clientEmail, $docType, $version, $filePath, $sourceDriveFile, $isPublished, $status
            ]);
            $newPkg['id'] = (int)$pdo->lastInsertId();

            // Store Version 1 snapshot
            try {
                $vStmt = $pdo->prepare("
                    INSERT INTO `package_versions`
                    (`package_id`, `package_code`, `version`, `change_summary`, `doc_type`, `full_data`, `pricing_inr`, `pricing_usd`, `created_by`, `created_at`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AI Studio', NOW())
                ");
                $vStmt->execute([
                    $newPkg['id'], $code, 1, $changeSummary, $docType, ($fullDataStr ?: $itineraryJsonStr ?: '{}'), $pricingInr, $pricingUsd
                ]);
            } catch (Exception $ve) {}

        } catch (Exception $e) {
            // Fallback insert if any column missing in legacy DB
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO `packages` 
                    (`package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `inclusions`, `exclusions`, `highlights`, `itinerary_json`, `pricing_inr`, `pricing_usd`, `markup_percent`, `is_published`, `status`, `created_at`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ");
                $stmt->execute([
                    $code, $name, $country, $destination, $durationDays, $durationNights, $hotelCat, $hotelDetails, $inclusions, $exclusions, $highlights, $itineraryJsonStr, $pricingInr, $pricingUsd, $markup, $isPublished, $status
                ]);
                $newPkg['id'] = (int)$pdo->lastInsertId();
            } catch (Exception $e2) {}
        }
    }

    // Sync to JSON
    $jsonPkgs = getFallbackPackages($packagesJsonPath);
    $found = false;
    foreach ($jsonPkgs as &$jp) {
        if ($jp['package_code'] === $code || ($code === 'PKG-MLE-VN-DINING' && stripos($jp['name'], 'villa nautica') !== false)) {
            $jp = array_merge($jp, $newPkg);
            $found = true;
            break;
        }
    }
    if (!$found) {
        array_unshift($jsonPkgs, $newPkg);
    }
    saveFallbackPackages($packagesJsonPath, $jsonPkgs);

    echo json_encode([
        'success' => true,
        'message' => "Package '$name' created successfully (v1)!",
        'package_id' => $newPkg['id'],
        'package_code' => $newPkg['package_code'],
        'version' => 1,
        'package' => $newPkg
    ]);
    exit;
}

// -------------------------------------------------------------
// 4. UPDATE PACKAGE (With Automatic Version Bumping v1 -> v2 -> v3)
// -------------------------------------------------------------
if ($action === 'update') {
    $pkgId = (int)($input['package_id'] ?? ($input['id'] ?? 0));
    $code = trim($input['package_code'] ?? ($input['code'] ?? ''));
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
    $clientName = trim($input['client_name'] ?? 'Valued Traveler');
    $clientPhone = trim($input['client_phone'] ?? '');
    $clientEmail = trim($input['client_email'] ?? '');
    $docType = trim($input['doc_type'] ?? 'quotation');
    $changeSummary = trim($input['change_summary'] ?? 'Updated in Studio');
    $isPublished = isset($input['is_published']) ? (int)$input['is_published'] : 1;
    $status = ($isPublished === 1) ? 'active' : 'inactive';
    $filePath = trim($input['file_path'] ?? '');

    $fullData = !empty($input['full_data']) ? $input['full_data'] : null;
    $itineraryJson = !empty($input['itinerary_json']) ? $input['itinerary_json'] : ($fullData ? $fullData : null);

    $fullDataStr = $fullData ? (is_string($fullData) ? $fullData : json_encode($fullData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) : null;
    $itineraryJsonStr = $itineraryJson ? (is_string($itineraryJson) ? $itineraryJson : json_encode($itineraryJson, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) : null;

    // Retrieve current version
    $currentVersion = 1;
    if ($pdo && $pkgId > 0) {
        try {
            $vCheck = $pdo->prepare("SELECT `version`, `package_code` FROM `packages` WHERE `id` = ?");
            $vCheck->execute([$pkgId]);
            $row = $vCheck->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $currentVersion = (int)($row['version'] ?? 1);
                if (empty($code)) $code = $row['package_code'] ?? '';
            }
        } catch (Exception $e) {}
    }
    $newVersion = $currentVersion + 1;

    // Update in MySQL
    if ($pdo && $pkgId > 0) {
        try {
            $stmt = $pdo->prepare("
                UPDATE `packages` 
                SET `name` = ?, `country` = ?, `destination` = ?, `duration_days` = ?, `duration_nights` = ?, 
                    `hotel_category` = ?, `hotel_details` = ?, `inclusions` = ?, `exclusions` = ?, `highlights` = ?,
                    `itinerary_json` = ?, `full_data` = ?, `pricing_inr` = ?, `pricing_usd` = ?, `markup_percent` = ?,
                    `client_name` = ?, `client_phone` = ?, `client_email` = ?, `doc_type` = ?, `version` = ?,
                    `file_path` = ?, `is_published` = ?, `status` = ?, `updated_at` = NOW()
                WHERE `id` = ?
            ");
            $stmt->execute([
                $name, $country, $destination, $durationDays, $durationNights,
                $hotelCat, $hotelDetails, $inclusions, $exclusions, $highlights,
                $itineraryJsonStr, $fullDataStr, $pricingInr, $pricingUsd, $markup,
                $clientName, $clientPhone, $clientEmail, $docType, $newVersion,
                $filePath, $isPublished, $status, $pkgId
            ]);

            // Save version record
            try {
                $vStmt = $pdo->prepare("
                    INSERT INTO `package_versions`
                    (`package_id`, `package_code`, `version`, `change_summary`, `doc_type`, `full_data`, `pricing_inr`, `pricing_usd`, `created_by`, `created_at`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AI Studio', NOW())
                ");
                $vStmt->execute([
                    $pkgId, $code, $newVersion, $changeSummary, $docType, ($fullDataStr ?: $itineraryJsonStr ?: '{}'), $pricingInr, $pricingUsd
                ]);
            } catch (Exception $ve) {}

        } catch (Exception $e) {
            // Fallback update without new columns
            try {
                $stmt = $pdo->prepare("
                    UPDATE `packages` 
                    SET `name` = ?, `country` = ?, `destination` = ?, `duration_days` = ?, `duration_nights` = ?, 
                        `hotel_category` = ?, `hotel_details` = ?, `inclusions` = ?, `exclusions` = ?, `highlights` = ?,
                        `itinerary_json` = ?, `pricing_inr` = ?, `pricing_usd` = ?, `markup_percent` = ?, `is_published` = ?, `status` = ?, `updated_at` = NOW()
                    WHERE `id` = ?
                ");
                $stmt->execute([
                    $name, $country, $destination, $durationDays, $durationNights, $hotelCat, $hotelDetails, $inclusions, $exclusions, $highlights, $itineraryJsonStr, $pricingInr, $pricingUsd, $markup, $isPublished, $status, $pkgId
                ]);
            } catch (Exception $e2) {}
        }
    }

    // Sync to JSON
    $jsonPkgs = getFallbackPackages($packagesJsonPath);
    $updatedPkg = null;
    foreach ($jsonPkgs as &$p) {
        if ($p['id'] == $pkgId || (!empty($code) && ($p['package_code'] ?? '') === $code)) {
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
            $p['client_name'] = $clientName;
            $p['client_phone'] = $clientPhone;
            $p['client_email'] = $clientEmail;
            $p['doc_type'] = $docType;
            $p['version'] = $newVersion;
            $p['is_published'] = $isPublished;
            $p['status'] = $status;
            $p['updated_at'] = date('Y-m-d H:i:s');
            if ($fullData) $p['full_data'] = $fullData;
            if ($itineraryJson) $p['itinerary_json'] = $itineraryJson;
            if ($filePath) $p['file_path'] = $filePath;

            if (!isset($p['history']) || !is_array($p['history'])) $p['history'] = [];
            array_unshift($p['history'], [
                'version' => $newVersion,
                'change_summary' => $changeSummary,
                'created_at' => date('Y-m-d H:i:s'),
                'pricing_inr' => $pricingInr,
                'pricing_usd' => $pricingUsd
            ]);
            $updatedPkg = $p;
            break;
        }
    }
    saveFallbackPackages($packagesJsonPath, $jsonPkgs);

    echo json_encode([
        'success' => true,
        'message' => "Package updated successfully to version v$newVersion!",
        'package_id' => $pkgId,
        'package_code' => $code,
        'version' => $newVersion,
        'package' => $updatedPkg
    ]);
    exit;
}

// -------------------------------------------------------------
// 5. GET PACKAGE VERSION HISTORY
// -------------------------------------------------------------
if ($action === 'versions') {
    $pkgId = (int)($input['package_id'] ?? ($input['id'] ?? ($_GET['id'] ?? ($_GET['package_id'] ?? 0))));
    $versions = [];

    if ($pdo && $pkgId > 0) {
        try {
            $stmt = $pdo->prepare("SELECT id, package_id, package_code, version, change_summary, doc_type, pricing_inr, pricing_usd, created_by, created_at FROM `package_versions` WHERE `package_id` = ? ORDER BY `version` DESC");
            $stmt->execute([$pkgId]);
            $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {}
    }

    if (empty($versions)) {
        $allJson = getFallbackPackages($packagesJsonPath);
        foreach ($allJson as $p) {
            if ($p['id'] == $pkgId && !empty($p['history'])) {
                $versions = $p['history'];
                break;
            }
        }
    }

    echo json_encode(['success' => true, 'package_id' => $pkgId, 'versions' => $versions]);
    exit;
}

// -------------------------------------------------------------
// 6. TOGGLE PUBLISH / ACTIVE STATUS
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// 7. DELETE PACKAGE
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// 8. IMPORT SINGLE OR BATCH FROM GOOGLE DRIVE / ITINERARY FILES
// -------------------------------------------------------------
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

        $countryCode = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $country), 0, 2));
        if (empty($countryCode)) $countryCode = 'XX';
        $code = 'PKG-' . $countryCode . '-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 4));

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
            'version' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
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
