
<?php
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Setup matching schemas
$pdo->exec("
CREATE TABLE inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    source TEXT DEFAULT 'Website',
    destination TEXT,
    message TEXT,
    status TEXT DEFAULT 'New',
    assigned_to TEXT,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_no TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by INTEGER,
    created_at DATETIME
);

CREATE TABLE quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_ref TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    destination TEXT,
    grand_total REAL,
    status TEXT,
    full_data_json TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
");

// 1. INQUIRIES CRUD
// INSERT
$pdo->prepare("INSERT INTO inquiries (name, phone, email, source, destination, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))")
    ->execute(['Rohan Batra', '+91 98765 11223', 'rohan@batra.com', 'Website', 'Kashmir 5D', 'Need luxury houseboat', 'New']);
$inqId = $pdo->lastInsertId();

// SELECT
$inq = $pdo->query("SELECT * FROM inquiries WHERE id = $inqId")->fetch(PDO::FETCH_ASSOC);

// UPDATE
$pdo->prepare("UPDATE inquiries SET status = ?, notes = ? WHERE id = ?")
    ->execute(['Contacted', 'Called client, itinerary shared', $inqId]);
$inqUpdated = $pdo->query("SELECT status, notes FROM inquiries WHERE id = $inqId")->fetch(PDO::FETCH_ASSOC);

// DELETE
$pdo->prepare("DELETE FROM inquiries WHERE id = ?")->execute([$inqId]);
$inqDeleted = $pdo->query("SELECT count(*) as cnt FROM inquiries WHERE id = $inqId")->fetch(PDO::FETCH_ASSOC);

// 2. QUOTATIONS CRUD
$ref = 'LEDMC-TEST-' . time();
$pdo->prepare("INSERT INTO quotations (quote_ref, client_name, destination, grand_total, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))")
    ->execute([$ref, 'Mrs. Neha Batra', 'Dubai 6D', 125000.00, 'Draft']);
$qId = $pdo->lastInsertId();

$q = $pdo->query("SELECT * FROM quotations WHERE quote_ref = '$ref'")->fetch(PDO::FETCH_ASSOC);

$pdo->prepare("UPDATE quotations SET grand_total = ?, status = ? WHERE quote_ref = ?")
    ->execute([135000.00, 'Confirmed', $ref]);
$qUpdated = $pdo->query("SELECT grand_total, status FROM quotations WHERE quote_ref = '$ref'")->fetch(PDO::FETCH_ASSOC);

$pdo->prepare("DELETE FROM quotations WHERE quote_ref = ?")->execute([$ref]);
$qDeleted = $pdo->query("SELECT count(*) as cnt FROM quotations WHERE quote_ref = '$ref'")->fetch(PDO::FETCH_ASSOC);

// 3. DOCUMENTS CRUD
$pdo->prepare("INSERT INTO documents (doc_no, title, file_name, file_path, file_size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))")
    ->execute(['DOC-001', 'Kashmir Proposal PDF', 'kashmir_doc.pdf', 'uploads/kashmir_doc.pdf', 256000, 'application/pdf']);
$docId = $pdo->lastInsertId();
$doc = $pdo->query("SELECT * FROM documents WHERE id = $docId")->fetch(PDO::FETCH_ASSOC);

$pdo->prepare("UPDATE documents SET title = ? WHERE id = ?")->execute(['Kashmir Luxury Proposal (Revised)', $docId]);
$docUpdated = $pdo->query("SELECT title FROM documents WHERE id = $docId")->fetch(PDO::FETCH_ASSOC);

$pdo->prepare("DELETE FROM documents WHERE id = ?")->execute([$docId]);
$docDeleted = $pdo->query("SELECT count(*) as cnt FROM documents WHERE id = $docId")->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    'inquiries_crud' => [
        'inserted_id' => $inqId,
        'selected_name' => $inq['name'],
        'updated_status' => $inqUpdated['status'],
        'deleted' => ($inqDeleted['cnt'] == 0)
    ],
    'quotations_crud' => [
        'ref' => $ref,
        'inserted_client' => $q['client_name'],
        'updated_total' => $qUpdated['grand_total'],
        'deleted' => ($qDeleted['cnt'] == 0)
    ],
    'documents_crud' => [
        'id' => $docId,
        'title' => $doc['title'],
        'updated_title' => $docUpdated['title'],
        'deleted' => ($docDeleted['cnt'] == 0)
    ]
]);
?>
