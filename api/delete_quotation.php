<?php
/**
 * api/delete_quotation.php — Delete a quotation by quote_ref
 */

require_once __DIR__ . '/db.php';

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
$quoteRef = !empty($payload['quote_ref']) ? trim($payload['quote_ref']) : (!empty($_GET['quote_ref']) ? trim($_GET['quote_ref']) : '');

if (!$quoteRef) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing quote_ref parameter.']);
    exit;
}

$pdo = getDatabaseConnection();

if ($pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM `quotations` WHERE `quote_ref` = :quote_ref");
        $stmt->execute([':quote_ref' => $quoteRef]);
        echo json_encode(['success' => true, 'message' => "Quotation {$quoteRef} deleted from database."]);
        exit;
    } catch (\PDOException $e) {
        error_log("Failed to delete from MySQL: " . $e->getMessage());
    }
}

// Fallback to JSON file
if (file_exists(LOCAL_FALLBACK_FILE)) {
    $content = @file_get_contents(LOCAL_FALLBACK_FILE);
    $data = json_decode($content, true) ?: [];
    if (isset($data[$quoteRef])) {
        unset($data[$quoteRef]);
        @file_put_contents(LOCAL_FALLBACK_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

echo json_encode(['success' => true, 'message' => "Quotation {$quoteRef} deleted."]);
