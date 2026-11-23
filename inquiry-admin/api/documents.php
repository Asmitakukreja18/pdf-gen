<?php
/**
 * inquiry-admin/api/documents.php — Centralized Documents Management Gateway (Full CRUD)
 * Supports MySQL backend with seamless fallback to data/documents.json.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}
$action = $input['action'] ?? ($_GET['action'] ?? 'list');
$activeUser = $_SESSION['inquiry_admin'] ?? $_SESSION['admin_user'] ?? null;
$actorName = $activeUser['name'] ?? ($activeUser['username'] ?? 'Admin');

function getDocsJsonPath() {
    $dir = __DIR__ . '/../../data';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir . '/documents.json';
}

function loadLocalDocs() {
    $file = getDocsJsonPath();
    if (file_exists($file)) {
        $json = @file_get_contents($file);
        $arr = json_decode($json, true);
        if (is_array($arr) && !empty($arr)) return $arr;
    }
    // Default seed documents if file does not exist
    $seed = [
        [
            'id' => 1,
            'doc_no' => 'LEDMC-MLE-DIN-8821',
            'title' => 'Villa Nautica Maldives — Candle Light & Special Beach Dining (With Decoration)',
            'customer_name' => 'Direct Guest / Couple',
            'destination' => 'Maldives',
            'doc_type' => 'quotation',
            'file_name' => 'VillaNautica_Maldives_Dining_Experiences_Doubled.html',
            'file_path' => 'uploads/VillaNautica_Maldives_Dining_Experiences_Doubled.html',
            'file_size' => 45200,
            'mime_type' => 'text/html',
            'created_by_name' => 'Admin',
            'status' => 'Active',
            'admin_remarks' => '7 Romantic Dining Selections with Decoration doubled rates',
            'created_at' => '2026-11-17 17:00:00'
        ],
        [
            'id' => 2,
            'doc_no' => 'LEDMC-DOC-7721',
            'title' => 'Phuket + Krabi 6D5N Land Package Quotation (+15% Markup)',
            'customer_name' => 'Ramesh Kumar & Family',
            'destination' => 'Thailand',
            'doc_type' => 'quotation',
            'file_name' => 'Rajasthan_Style_Phuket_Krabi_15Percent_Markup.pdf',
            'file_path' => 'uploads/Rajasthan_Style_Phuket_Krabi_15Percent_Markup.pdf',
            'file_size' => 1250000,
            'mime_type' => 'application/pdf',
            'created_by_name' => 'Admin',
            'status' => 'Active',
            'admin_remarks' => 'Rajasthan style customized client brochure with +15% markup',
            'created_at' => '2026-11-16 18:30:00'
        ],
        [
            'id' => 3,
            'doc_no' => 'LEDMC-DOC-4419',
            'title' => 'Singapore + Phuket + Krabi 12D11N Aanay Tours Quotation',
            'customer_name' => 'Package for 2 pax',
            'destination' => 'Singapore & Thailand',
            'doc_type' => 'quotation',
            'file_name' => 'Singapore_Thailand_12D11N_AanayTours.pdf',
            'file_path' => 'uploads/Singapore_Thailand_12D11N_AanayTours.pdf',
            'file_size' => 1840000,
            'mime_type' => 'application/pdf',
            'created_by_name' => 'Admin',
            'status' => 'Active',
            'admin_remarks' => 'Dual country holiday proposal',
            'created_at' => '2026-11-16 12:00:00'
        ]
    ];
    saveLocalDocs($seed);
    return $seed;
}

function saveLocalDocs($docs) {
    $file = getDocsJsonPath();
    @file_put_contents($file, json_encode(array_values($docs), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

$pdo = getDbConnection();

// Auto-seed database table if documents table is empty but DB is available
if ($pdo) {
    try {
        $countStmt = $pdo->query("SELECT COUNT(*) FROM `documents`");
        if ($countStmt && (int)$countStmt->fetchColumn() === 0) {
            $initialDocs = loadLocalDocs();
            $ins = $pdo->prepare("
                INSERT INTO `documents` 
                (`doc_no`, `title`, `description`, `doc_type`, `customer_name`, `destination`, `file_name`, `file_path`, `file_size`, `mime_type`, `created_by_name`, `status`, `admin_remarks`, `created_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($initialDocs as $d) {
                $ins->execute([
                    $d['doc_no'] ?? ('LEDMC-DOC-' . rand(1000, 9999)),
                    $d['title'] ?? 'Travel Document',
                    $d['admin_remarks'] ?? ($d['description'] ?? ''),
                    $d['doc_type'] ?? 'quotation',
                    $d['customer_name'] ?? 'Direct Client',
                    $d['destination'] ?? 'International',
                    $d['file_name'] ?? basename($d['file_path'] ?? 'doc.pdf'),
                    $d['file_path'] ?? '',
                    $d['file_size'] ?? 0,
                    $d['mime_type'] ?? 'application/pdf',
                    $d['created_by_name'] ?? 'Admin',
                    $d['status'] ?? 'Active',
                    $d['admin_remarks'] ?? '',
                    $d['created_at'] ?? date('Y-m-d H:i:s')
                ]);
            }
        }
    } catch (Exception $ignored) {}
}

// =========================================================================
// 1. LIST DOCUMENTS (READ)
// =========================================================================
if ($action === 'list') {
    $search = trim($_GET['search'] ?? ($input['search'] ?? ''));
    $docType = trim($_GET['doc_type'] ?? ($input['doc_type'] ?? 'all'));
    $statusFilter = trim($_GET['status'] ?? ($input['status'] ?? 'all'));

    if ($pdo) {
        try {
            $sql = "SELECT * FROM `documents` WHERE 1=1";
            $params = [];

            if ($docType !== 'all' && !empty($docType)) {
                $sql .= " AND `doc_type` LIKE ?";
                $params[] = "%$docType%";
            }

            if ($statusFilter !== 'all' && !empty($statusFilter)) {
                $sql .= " AND `status` = ?";
                $params[] = $statusFilter;
            }

            if (!empty($search)) {
                $sql .= " AND (`title` LIKE ? OR `customer_name` LIKE ? OR `destination` LIKE ? OR `doc_no` LIKE ? OR `admin_remarks` LIKE ?)";
                $term = "%$search%";
                $params = array_merge($params, [$term, $term, $term, $term, $term]);
            }

            $sql .= " ORDER BY `created_at` DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($docs)) {
                // Keep local cache fresh
                saveLocalDocs($docs);
                jsonSuccess(['documents' => $docs, 'total' => count($docs), 'source' => 'mysql']);
            }
        } catch (Exception $e) {
            // fallback to local below
        }
    }

    // Local JSON fallback
    $docs = loadLocalDocs();
    if (!empty($search)) {
        $st = strtolower($search);
        $docs = array_filter($docs, function($d) use ($st) {
            return (strpos(strtolower($d['title'] ?? ''), $st) !== false) ||
                   (strpos(strtolower($d['customer_name'] ?? ''), $st) !== false) ||
                   (strpos(strtolower($d['destination'] ?? ''), $st) !== false) ||
                   (strpos(strtolower($d['doc_no'] ?? ''), $st) !== false);
        });
    }
    if ($docType !== 'all' && !empty($docType)) {
        $docs = array_filter($docs, function($d) use ($docType) {
            return strpos(strtolower($d['doc_type'] ?? ''), strtolower($docType)) !== false;
        });
    }
    if ($statusFilter !== 'all' && !empty($statusFilter)) {
        $docs = array_filter($docs, function($d) use ($statusFilter) {
            return strtolower($d['status'] ?? '') === strtolower($statusFilter);
        });
    }
    $docs = array_values($docs);
    jsonSuccess(['documents' => $docs, 'total' => count($docs), 'source' => 'local_storage']);
}

// =========================================================================
// 2. GET SINGLE DOCUMENT
// =========================================================================
if ($action === 'get') {
    $id = $input['id'] ?? ($_GET['id'] ?? null);
    $docNo = $input['doc_no'] ?? ($_GET['doc_no'] ?? null);

    if (!$id && !$docNo) {
        jsonError('Document ID or Doc No required');
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM `documents` WHERE `id` = ? OR `doc_no` = ? LIMIT 1");
            $stmt->execute([$id, $docNo]);
            $doc = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($doc) {
                jsonSuccess(['document' => $doc]);
            }
        } catch (Exception $e) {}
    }

    $localDocs = loadLocalDocs();
    foreach ($localDocs as $d) {
        if (($id && ($d['id'] == $id)) || ($docNo && ($d['doc_no'] == $docNo))) {
            jsonSuccess(['document' => $d]);
        }
    }

    jsonError('Document not found', 404);
}

// =========================================================================
// 3. CREATE DOCUMENT (CREATE)
// =========================================================================
if ($action === 'create') {
    $title = trim($input['title'] ?? '');
    if (empty($title)) {
        jsonError('Document Title is required');
    }

    $docType = trim($input['doc_type'] ?? 'quotation');
    $customerName = trim($input['customer_name'] ?? 'Direct Client');
    $customerPhone = trim($input['customer_phone'] ?? '');
    $customerEmail = trim($input['customer_email'] ?? '');
    $destination = trim($input['destination'] ?? 'International');
    $filePath = trim($input['file_path'] ?? '');
    $fileName = trim($input['file_name'] ?? ($filePath ? basename($filePath) : 'document.pdf'));
    $status = trim($input['status'] ?? 'Active');
    $remarks = trim($input['admin_remarks'] ?? ($input['notes'] ?? ($input['description'] ?? '')));
    $createdByName = trim($input['created_by_name'] ?? $actorName);
    $totalAmount = floatval($input['total_amount'] ?? 0);
    $currency = trim($input['currency'] ?? 'INR');

    // Generate unique doc_no
    $prefix = 'LEDMC-';
    if (stripos($docType, 'inv') !== false) $prefix = 'LEDMC-INV-';
    elseif (stripos($docType, 'vouch') !== false) $prefix = 'LEDMC-VCH-';
    elseif (stripos($docType, 'itin') !== false) $prefix = 'LEDMC-ITN-';
    else $prefix = 'LEDMC-DOC-';

    $docNo = trim($input['doc_no'] ?? ($prefix . rand(1000, 9999)));
    $createdAt = date('Y-m-d H:i:s');
    $docId = time();

    // 1. MySQL Insert
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO `documents` 
                (`doc_no`, `title`, `description`, `doc_type`, `customer_name`, `destination`, `file_name`, `file_path`, `file_size`, `mime_type`, `created_by_name`, `status`, `admin_remarks`, `created_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'application/pdf', ?, ?, ?, ?)
            ");
            $stmt->execute([
                $docNo, $title, $remarks, $docType, $customerName, $destination, $fileName, $filePath, $createdByName, $status, $remarks, $createdAt
            ]);
            $docId = (int)$pdo->lastInsertId();

            // Log activity
            try {
                $pdo->prepare("INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`) VALUES (1, ?, 'create_document', 'Documents', ?, ?, NOW())")
                    ->execute([$createdByName, $docNo, "Created document '$title' ($docType) for $customerName"]);
            } catch (Exception $e) {}
        } catch (Exception $e) {
            // MySQL error, proceed with local fallback
        }
    }

    // 2. Local JSON Update
    $localDocs = loadLocalDocs();
    $newDoc = [
        'id' => $docId,
        'doc_no' => $docNo,
        'title' => $title,
        'doc_type' => $docType,
        'customer_name' => $customerName,
        'customer_phone' => $customerPhone,
        'customer_email' => $customerEmail,
        'destination' => $destination,
        'file_name' => $fileName,
        'file_path' => $filePath,
        'status' => $status,
        'admin_remarks' => $remarks,
        'total_amount' => $totalAmount,
        'currency' => $currency,
        'created_by_name' => $createdByName,
        'created_at' => $createdAt
    ];
    array_unshift($localDocs, $newDoc);
    saveLocalDocs($localDocs);

    jsonSuccess(['document' => $newDoc, 'id' => $docId, 'doc_no' => $docNo], 'Document created successfully!');
}

// =========================================================================
// 4. UPDATE DOCUMENT (UPDATE)
// =========================================================================
if ($action === 'update') {
    $id = $input['id'] ?? null;
    $docNo = $input['doc_no'] ?? null;

    if (!$id && !$docNo) {
        jsonError('Document ID or Doc No is required for update');
    }

    $title = trim($input['title'] ?? '');
    $docType = trim($input['doc_type'] ?? '');
    $customerName = trim($input['customer_name'] ?? '');
    $customerPhone = trim($input['customer_phone'] ?? '');
    $customerEmail = trim($input['customer_email'] ?? '');
    $destination = trim($input['destination'] ?? '');
    $filePath = trim($input['file_path'] ?? '');
    $fileName = trim($input['file_name'] ?? '');
    $status = trim($input['status'] ?? '');
    $remarks = trim($input['admin_remarks'] ?? ($input['notes'] ?? ($input['description'] ?? '')));

    // 1. Update in MySQL
    if ($pdo) {
        try {
            $updates = [];
            $params = [];

            if (!empty($title)) { $updates[] = "`title` = ?"; $params[] = $title; }
            if (!empty($docType)) { $updates[] = "`doc_type` = ?"; $params[] = $docType; }
            if (!empty($customerName)) { $updates[] = "`customer_name` = ?"; $params[] = $customerName; }
            if (!empty($destination)) { $updates[] = "`destination` = ?"; $params[] = $destination; }
            if (!empty($filePath)) { $updates[] = "`file_path` = ?"; $params[] = $filePath; }
            if (!empty($fileName)) { $updates[] = "`file_name` = ?"; $params[] = $fileName; }
            if (!empty($status)) { $updates[] = "`status` = ?"; $params[] = $status; }
            if ($remarks !== '') { 
                $updates[] = "`admin_remarks` = ?"; 
                $params[] = $remarks;
                $updates[] = "`description` = ?"; 
                $params[] = $remarks;
            }

            if (!empty($updates)) {
                $updates[] = "`last_updated_by` = ?";
                $params[] = $actorName;
                $updates[] = "`updated_at` = NOW()";

                $where = $id ? "`id` = ?" : "`doc_no` = ?";
                $params[] = $id ? $id : $docNo;

                $sql = "UPDATE `documents` SET " . implode(', ', $updates) . " WHERE $where";
                $pdo->prepare($sql)->execute($params);

                // Activity log
                try {
                    $pdo->prepare("INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`) VALUES (1, ?, 'update_document', 'Documents', ?, ?, NOW())")
                        ->execute([$actorName, $docNo ?: "ID:$id", "Updated document details for '$title'"]);
                } catch (Exception $e) {}
            }
        } catch (Exception $e) {}
    }

    // 2. Update in Local JSON
    $localDocs = loadLocalDocs();
    $found = false;
    $updatedDoc = null;

    foreach ($localDocs as &$d) {
        if (($id && ($d['id'] == $id)) || ($docNo && ($d['doc_no'] == $docNo))) {
            if (!empty($title)) $d['title'] = $title;
            if (!empty($docType)) $d['doc_type'] = $docType;
            if (!empty($customerName)) $d['customer_name'] = $customerName;
            if (!empty($customerPhone)) $d['customer_phone'] = $customerPhone;
            if (!empty($customerEmail)) $d['customer_email'] = $customerEmail;
            if (!empty($destination)) $d['destination'] = $destination;
            if (!empty($filePath)) $d['file_path'] = $filePath;
            if (!empty($fileName)) $d['file_name'] = $fileName;
            if (!empty($status)) $d['status'] = $status;
            if ($remarks !== '') $d['admin_remarks'] = $remarks;
            $d['updated_at'] = date('Y-m-d H:i:s');
            $updatedDoc = $d;
            $found = true;
            break;
        }
    }
    unset($d);

    if ($found) {
        saveLocalDocs($localDocs);
        jsonSuccess(['document' => $updatedDoc], 'Document updated successfully!');
    } else {
        jsonSuccess([], 'Document updated in database');
    }
}

// =========================================================================
// 5. DELETE DOCUMENT (DELETE)
// =========================================================================
if ($action === 'delete') {
    $id = $input['id'] ?? ($_GET['id'] ?? null);
    $docNo = $input['doc_no'] ?? ($_GET['doc_no'] ?? null);

    if (!$id && !$docNo) {
        jsonError('Document ID or Doc No is required for deletion');
    }

    // 1. Delete from MySQL
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM `documents` WHERE `id` = ? OR `doc_no` = ?");
            $stmt->execute([$id, $docNo]);

            try {
                $pdo->prepare("INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`) VALUES (1, ?, 'delete_document', 'Documents', ?, ?, NOW())")
                    ->execute([$actorName, $docNo ?: "ID:$id", "Deleted document from repository"]);
            } catch (Exception $e) {}
        } catch (Exception $e) {}
    }

    // 2. Delete from Local JSON
    $localDocs = loadLocalDocs();
    $beforeCount = count($localDocs);
    $localDocs = array_filter($localDocs, function($d) use ($id, $docNo) {
        if ($id && ($d['id'] == $id)) return false;
        if ($docNo && ($d['doc_no'] == $docNo)) return false;
        return true;
    });

    saveLocalDocs($localDocs);

    jsonSuccess(['deleted' => true, 'id' => $id, 'doc_no' => $docNo], 'Document deleted successfully!');
}

// =========================================================================
// 6. UPLOAD DOCUMENT PDF / BROCHURE (UPLOAD)
// =========================================================================
if ($action === 'upload') {
    $uploadedFile = $_FILES['pdf_file'] ?? ($_FILES['file'] ?? ($_FILES['doc_file'] ?? null));
    if (!$uploadedFile || $uploadedFile['error'] !== UPLOAD_ERR_OK) {
        jsonError('Please select a valid file to upload. Code: ' . ($uploadedFile['error'] ?? 'NONE'));
    }

    $title = trim($_POST['title'] ?? ($input['title'] ?? ''));
    $customerName = trim($_POST['customer_name'] ?? ($input['customer_name'] ?? 'Direct Client'));
    $destination = trim($_POST['destination'] ?? ($input['destination'] ?? 'Custom'));
    $docType = trim($_POST['doc_type'] ?? ($input['doc_type'] ?? 'quotation'));
    $status = trim($_POST['status'] ?? ($input['status'] ?? 'Active'));
    $remarks = trim($_POST['admin_remarks'] ?? ($_POST['notes'] ?? ($input['admin_remarks'] ?? '')));
    $createdByName = trim($_POST['created_by_name'] ?? $actorName);

    $originalName = $uploadedFile['name'];
    if (empty($title)) {
        $title = pathinfo($originalName, PATHINFO_FILENAME);
        $title = ucwords(str_replace(['_', '-'], ' ', $title));
    }

    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowed = ['pdf', 'html', 'htm', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    if (!in_array($ext, $allowed)) {
        jsonError('Allowed file formats: PDF, HTML, DOC, DOCX, JPG, PNG.');
    }

    $uploadDir = __DIR__ . '/../../uploads/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $safeName = 'doc_' . time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $originalName);
    $destPath = $uploadDir . $safeName;

    if (!move_uploaded_file($uploadedFile['tmp_name'], $destPath)) {
        jsonError('Failed to save file to server storage.');
    }

    $dbFilePath = 'uploads/' . $safeName;
    $fileSize = $uploadedFile['size'];
    $mimeType = ($ext === 'pdf') ? 'application/pdf' : (($ext === 'html' || $ext === 'htm') ? 'text/html' : 'application/octet-stream');
    $docNo = 'LEDMC-DOC-' . strtoupper(substr(uniqid(), -5));
    $createdAt = date('Y-m-d H:i:s');
    $docId = time();

    // 1. MySQL Insert
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO `documents` 
                (`doc_no`, `title`, `description`, `doc_type`, `customer_name`, `destination`, `file_name`, `file_path`, `file_size`, `mime_type`, `created_by_name`, `status`, `admin_remarks`, `created_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $docNo, $title, "Uploaded by $createdByName", $docType, $customerName, $destination, $safeName, $dbFilePath, $fileSize, $mimeType, $createdByName, $status, $remarks
            ]);
            $docId = (int)$pdo->lastInsertId();

            try {
                $pdo->prepare("INSERT INTO `user_activity_logs` (`user_id`, `employee_name`, `action`, `module`, `entity_id`, `details`, `created_at`) VALUES (1, ?, 'uploaded_document', 'Documents', ?, ?, NOW())")
                    ->execute([$createdByName, $docNo, "Uploaded document '$title' ($ext) for $customerName"]);
            } catch (Exception $e) {}
        } catch (Exception $e) {}
    }

    // 2. Local JSON Update
    $localDocs = loadLocalDocs();
    $newDoc = [
        'id' => $docId,
        'doc_no' => $docNo,
        'title' => $title,
        'doc_type' => $docType,
        'customer_name' => $customerName,
        'destination' => $destination,
        'file_name' => $safeName,
        'file_path' => $dbFilePath,
        'file_size' => $fileSize,
        'mime_type' => $mimeType,
        'status' => $status,
        'admin_remarks' => $remarks,
        'created_by_name' => $createdByName,
        'created_at' => $createdAt
    ];
    array_unshift($localDocs, $newDoc);
    saveLocalDocs($localDocs);

    jsonSuccess([
        'doc_id' => $docId,
        'doc_no' => $docNo,
        'file_path' => $dbFilePath,
        'document' => $newDoc
    ], 'Document uploaded and registered successfully!');
}

jsonError('Invalid action specified', 400);
