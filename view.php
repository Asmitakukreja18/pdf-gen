<?php
/**
 * Let's Explore DMC — Safe Universal Document Viewer & Streamer
 * Bypasses any web server directory permission restrictions on cPanel/LiteSpeed
 */

$requestedFile = $_GET['file'] ?? $_GET['doc'] ?? '';
$packageId = $_GET['package_id'] ?? $_GET['id'] ?? '';
$isPrint = isset($_GET['print']) && $_GET['print'] === '1';
$isDownload = isset($_GET['download']) && $_GET['download'] === '1';

// If package_id 100 or Villa Nautica requested
if ($packageId === '100' || stripos($requestedFile, 'villanautica') !== false) {
    $candidates = [
        __DIR__ . '/format/VillaNautica_Maldives_Dining_Experiences_Doubled.html',
        __DIR__ . '/uploads/VillaNautica_Maldives_Dining_Experiences_Doubled.html'
    ];
    foreach ($candidates as $candidate) {
        if (file_exists($candidate)) {
            header('Content-Type: text/html; charset=UTF-8');
            header('X-Content-Type-Options: nosniff');
            readfile($candidate);
            exit;
        }
    }
}

// If specific file requested, safely validate path
if (!empty($requestedFile)) {
    // Sanitize path to prevent directory traversal
    $cleanPath = str_replace(['../', '..\\'], '', $requestedFile);
    $cleanPath = ltrim($cleanPath, '/\\');
    $fullPath = __DIR__ . '/' . $cleanPath;

    if (file_exists($fullPath) && is_file($fullPath)) {
        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        $basename = basename($fullPath);

        if ($ext === 'pdf') {
            header('Content-Type: application/pdf');
            if ($isDownload) {
                header('Content-Disposition: attachment; filename="' . $basename . '"');
            } else {
                header('Content-Disposition: inline; filename="' . $basename . '"');
            }
            header('Content-Length: ' . filesize($fullPath));
            readfile($fullPath);
            exit;
        } elseif ($ext === 'html' || $ext === 'htm') {
            header('Content-Type: text/html; charset=UTF-8');
            readfile($fullPath);
            exit;
        } elseif (in_array($ext, ['png', 'jpg', 'jpeg', 'webp', 'svg'])) {
            $mimes = [
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                'svg' => 'image/svg+xml'
            ];
            header('Content-Type: ' . ($mimes[$ext] ?? 'application/octet-stream'));
            readfile($fullPath);
            exit;
        }
    }
}

// Fallback: Serve the rich interactive HTML5 document viewer
include __DIR__ . '/view.html';
