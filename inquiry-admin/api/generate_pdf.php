<?php
/**
 * Universal PDF Generator Bridge / Redirector (Admin API)
 */
$pkgId = $_GET['pkg_id'] ?? $_GET['id'] ?? '';
$title = $_GET['title'] ?? 'Quotation';
$dest = $_GET['dest'] ?? 'Destination';
$print = $_GET['print'] ?? '1';

$targetUrl = '../../view.html?package_id=' . urlencode($pkgId) . '&title=' . urlencode($title) . '&dest=' . urlencode($dest) . '&print=' . urlencode($print);

header('Location: ' . $targetUrl, true, 302);
exit;
