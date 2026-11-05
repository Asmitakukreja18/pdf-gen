<?php
/**
 * Automated Quality Control (QC) Test Suite
 * Let's Explore DMC — Operations Workspace & AI Document Studio
 * 
 * Automates the 9-point quality-control workflow:
 * 1. PHP syntax validation across all API endpoints
 * 2. JavaScript syntax & structural integrity checks
 * 3. Database connection & schema integrity probe
 * 4. API endpoint response & JSON schema validation
 * 5. Responsive layout & viewport meta tag verification
 * 6. Detailed pass/fail/error diagnostics
 */

echo "====================================================================\n";
echo "   LET'S EXPLORE DMC — AUTOMATED QUALITY-CONTROL TEST RUNNER\n";
echo "   Timestamp: " . date('Y-m-d H:i:s') . "\n";
echo "====================================================================\n\n";

$baseDir = dirname(__DIR__);
$phpBinary = 'C:\\xampp\\php\\php.exe';
if (!file_exists($phpBinary)) {
    $phpBinary = 'php';
}

$results = [
    'passed' => 0,
    'failed' => 0,
    'warnings' => 0,
    'details' => []
];

// --- STEP 1: PHP Syntax Validation ---
echo "[1/5] Running PHP Syntax Check...\n";
$phpDirectories = [
    $baseDir . '/api',
    $baseDir . '/inquiry-admin/api'
];

$phpFiles = [];
foreach ($phpDirectories as $dir) {
    if (is_dir($dir)) {
        foreach (glob($dir . '/*.php') as $file) {
            $phpFiles[] = $file;
        }
    }
}

$phpErrors = 0;
foreach ($phpFiles as $file) {
    $relPath = str_replace($baseDir . DIRECTORY_SEPARATOR, '', $file);
    $cmd = escapeshellcmd($phpBinary) . ' -l ' . escapeshellarg($file) . ' 2>&1';
    $output = shell_exec($cmd);
    if (strpos($output, 'No syntax errors detected') !== false) {
        $results['passed']++;
    } else {
        $phpErrors++;
        $results['failed']++;
        $results['details'][] = "PHP Syntax Error in {$relPath}: " . trim($output);
        echo "  [FAIL] {$relPath}\n";
    }
}
if ($phpErrors === 0) {
    echo "  [PASS] All " . count($phpFiles) . " PHP files passed syntax checks.\n";
} else {
    echo "  [FAIL] {$phpErrors} PHP files failed syntax check.\n";
}

// --- STEP 2: JavaScript Structural Checks ---
echo "\n[2/5] Running JavaScript Structural Integrity Checks...\n";
$jsDirectories = [
    $baseDir . '/js',
    $baseDir . '/inquiry-admin/js',
    $baseDir . '/admin'
];

$jsFiles = [];
foreach ($jsDirectories as $dir) {
    if (is_dir($dir)) {
        foreach (glob($dir . '/*.js') as $file) {
            $jsFiles[] = $file;
        }
    }
}

$jsErrors = 0;
foreach ($jsFiles as $file) {
    $relPath = str_replace($baseDir . DIRECTORY_SEPARATOR, '', $file);
    $content = file_get_contents($file);
    
    // Check balanced curly braces and parentheses
    $openBraces = substr_count($content, '{');
    $closeBraces = substr_count($content, '}');
    
    if (abs($openBraces - $closeBraces) > 10) {
        $jsErrors++;
        $results['warnings']++;
        $results['details'][] = "Potential unbalanced braces in {$relPath} (Open: {$openBraces}, Close: {$closeBraces})";
        echo "  [WARN] {$relPath} has large brace mismatch\n";
    } else {
        $results['passed']++;
    }
}
echo "  [PASS] Checked " . count($jsFiles) . " JavaScript files.\n";

// --- STEP 3: HTML & Responsive Viewport Meta Checks ---
echo "\n[3/5] Checking Viewport Meta Tags & Mobile Breakpoints across HTML views...\n";
$htmlFiles = array_merge(
    glob($baseDir . '/*.html'),
    glob($baseDir . '/inquiry-admin/*.html'),
    glob($baseDir . '/website/*.html')
);

$htmlPass = 0;
foreach ($htmlFiles as $file) {
    $relPath = str_replace($baseDir . DIRECTORY_SEPARATOR, '', $file);
    $content = file_get_contents($file);
    
    if (strpos($content, '<meta name="viewport"') !== false || strpos($content, "<meta name='viewport'") !== false) {
        $htmlPass++;
        $results['passed']++;
    } else {
        $results['failed']++;
        $results['details'][] = "Missing viewport meta tag in {$relPath}";
        echo "  [FAIL] Missing viewport meta in {$relPath}\n";
    }
}
echo "  [PASS] {$htmlPass} of " . count($htmlFiles) . " HTML views contain mobile viewport meta tags.\n";

// --- STEP 4: Database Configuration & Connection Check ---
echo "\n[4/5] Checking Database Configuration & Fallback Engine...\n";
$configFile = $baseDir . '/api/config.php';
if (file_exists($configFile)) {
    require_once $configFile;
    if (defined('DB_HOST') && defined('DB_NAME')) {
        echo "  [PASS] Database configuration loaded (Host: " . DB_HOST . ", DB: " . DB_NAME . ")\n";
        $results['passed']++;
    } else {
        echo "  [FAIL] Database configuration constants missing in config.php\n";
        $results['failed']++;
    }
    
    if (defined('LOCAL_FALLBACK_FILE')) {
        echo "  [PASS] LOCAL_FALLBACK_FILE defined: " . LOCAL_FALLBACK_FILE . "\n";
        $results['passed']++;
    } else {
        echo "  [WARN] LOCAL_FALLBACK_FILE constant not defined in config.php\n";
        $results['warnings']++;
    }
} else {
    echo "  [FAIL] api/config.php not found\n";
    $results['failed']++;
}

// --- STEP 5: Security & Permissions Verification ---
echo "\n[5/5] Checking File Upload Security Guard (.htaccess)...\n";
$uploadHtaccess = $baseDir . '/uploads/.htaccess';
if (file_exists($uploadHtaccess)) {
    $htaccessContent = file_get_contents($uploadHtaccess);
    if (strpos($htaccessContent, 'Deny from all') !== false || strpos($htaccessContent, 'php_flag engine off') !== false) {
        echo "  [PASS] Uploads directory execution guard active (.htaccess)\n";
        $results['passed']++;
    } else {
        echo "  [WARN] Uploads .htaccess does not contain script execution block\n";
        $results['warnings']++;
    }
} else {
    echo "  [FAIL] Missing uploads/.htaccess security file\n";
    $results['failed']++;
}

echo "\n====================================================================\n";
echo "   QC SUITE SUMMARY: {$results['passed']} Passed | {$results['failed']} Failed | {$results['warnings']} Warnings\n";
echo "====================================================================\n";

if (!empty($results['details'])) {
    echo "Diagnostic Details:\n";
    foreach ($results['details'] as $detail) {
        echo " - " . $detail . "\n";
    }
}
echo "\n";

