<?php
/**
 * api/categories.php — Categories / Topics Management
 */

require_once __DIR__ . '/auth.php';

$pdo = getDb();
if (!$pdo) {
    jsonError('Database connection unavailable', 500);
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: List all categories with document count
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT c.id, c.name, c.description, c.created_at,
                   COUNT(d.id) AS document_count
            FROM categories c
            LEFT JOIN documents d ON d.category_id = c.id
            GROUP BY c.id
            ORDER BY c.name ASC
        ");
        $categories = $stmt->fetchAll();
        jsonSuccess(['categories' => $categories]);
    } catch (\PDOException $e) {
        error_log('Categories fetch error: ' . $e->getMessage());
        jsonError('Failed to fetch categories', 500);
    }
}

// POST: Create new category (Admin only)
if ($method === 'POST') {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');

    if (empty($name)) {
        jsonError('Category name is required.', 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
        $stmt->execute([$name, $description]);
        $catId = $pdo->lastInsertId();

        jsonSuccess([
            'category' => [
                'id' => (int)$catId,
                'name' => $name,
                'description' => $description,
                'document_count' => 0
            ]
        ], 'Category created successfully.');
    } catch (\PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonError('A category with this name already exists.', 409);
        }
        jsonError('Failed to save category', 500);
    }
}

// DELETE: Delete category
if ($method === 'DELETE') {
    requireAuth();
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonError('Invalid category ID', 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        jsonSuccess([], 'Category deleted successfully.');
    } catch (\PDOException $e) {
        jsonError('Failed to delete category', 500);
    }
}

jsonError('Method not allowed', 405);
