<?php
/**
 * api/config.php — Database & Server Configuration for cPanel
 * 
 * Configured for cPanel database: ihpyruhe_pdf_generator
 * Database user: ihpyruhe_pdf_admin
 */

// Database Host (usually 'localhost' in cPanel)
defined('DB_HOST') or define('DB_HOST', 'localhost');

// Database Name created in cPanel
defined('DB_NAME') or define('DB_NAME', 'ihpyruhe_pdf_generator');

// Database Username created in cPanel
defined('DB_USER') or define('DB_USER', 'ihpyruhe_pdf_admin');

// Database Password (configure your actual password here in cPanel File Manager)
defined('DB_PASS') or define('DB_PASS', getenv('DB_PASS') ?: 'YOUR_CPANEL_DATABASE_PASSWORD_HERE');

// Character Set
defined('DB_CHARSET') or define('DB_CHARSET', 'utf8mb4');

// Physical server upload directory for PDF documents
defined('UPLOAD_DIR') or define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// Web-accessible URL path for previewing/downloading PDFs
defined('UPLOAD_URL') or define('UPLOAD_URL', '../uploads/');

// Maximum upload file size (25 MB)
defined('MAX_FILE_SIZE') or define('MAX_FILE_SIZE', 25 * 1024 * 1024);

// Allowed MIME types for uploaded files
defined('ALLOWED_MIMES') or define('ALLOWED_MIMES', serialize([
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',
    'applications/vnd.pdf',
    'text/pdf',
    'text/x-pdf'
]));

// Session Security Configuration & Persistent Lifetime
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.gc_maxlifetime', 86400 * 30); // 30 days
    ini_set('session.cookie_lifetime', 86400 * 30);
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}

// ==========================================
// SECURE AI PROVIDER CONFIGURATION (Server-Side Only)
// ==========================================
// Safe resolution helper for private AI credentials (strictly outside public web root)
if (!function_exists('getSecureAiSettingsPath')) {
    function getSecureAiSettingsPath($createDirIfPossible = false) {
        $cpanelPrivate = '/home/ihpyruhe/private/dmc-ai/ai_settings.json';
        $cpanelDir = '/home/ihpyruhe/private/dmc-ai';
        
        // 1. Primary secure location: cPanel private folder outside public_html/document root
        if (file_exists($cpanelPrivate)) {
            return $cpanelPrivate;
        }
        if (is_dir($cpanelDir) && is_writable($cpanelDir)) {
            return $cpanelPrivate;
        }
        if ($createDirIfPossible && @is_dir('/home/ihpyruhe/private') && @mkdir($cpanelDir, 0750, true)) {
            return $cpanelPrivate;
        }
        
        // 2. Relative check outside DOCUMENT_ROOT if cPanel structure differs
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if (!empty($docRoot)) {
            $outsideRoot = dirname(rtrim($docRoot, '/\\')) . '/private/dmc-ai';
            $outsideFile = $outsideRoot . '/ai_settings.json';
            if (file_exists($outsideFile)) {
                return $outsideFile;
            }
            if ($createDirIfPossible && @is_dir(dirname($outsideRoot)) && @mkdir($outsideRoot, 0750, true)) {
                return $outsideFile;
            }
        }
        
        // 3. Fallback for local development or non-cPanel environments (protected by .htaccess)
        $localFallback = __DIR__ . '/../data/ai_settings.json';
        if ($createDirIfPossible) {
            @mkdir(dirname($localFallback), 0755, true);
        }
        return $localFallback;
    }
}

$aiSettingsFile = getSecureAiSettingsPath(false);
$dynamicAiSettings = file_exists($aiSettingsFile) ? json_decode(file_get_contents($aiSettingsFile), true) : [];
if (!is_array($dynamicAiSettings)) $dynamicAiSettings = [];

// Anthropic Claude API Key (Server-side secret, never transmitted to browser)
$savedClaudeKey = !empty($dynamicAiSettings['claude_api_key']) ? trim($dynamicAiSettings['claude_api_key']) : '';
defined('CLAUDE_API_KEY') or define('CLAUDE_API_KEY', $savedClaudeKey ?: (getenv('CLAUDE_API_KEY') ?: 'YOUR_CLAUDE_API_KEY_HERE'));

// Google Gemini API Key (Server-side secret)
$savedGeminiKey = !empty($dynamicAiSettings['gemini_api_key']) ? trim($dynamicAiSettings['gemini_api_key']) : '';
defined('GEMINI_API_KEY') or define('GEMINI_API_KEY', $savedGeminiKey ?: (getenv('GEMINI_API_KEY') ?: 'YOUR_GEMINI_API_KEY_HERE'));

// OpenAI API Key (Optional)
defined('OPENAI_API_KEY') or define('OPENAI_API_KEY', !empty($dynamicAiSettings['openai_api_key']) ? trim($dynamicAiSettings['openai_api_key']) : '');

// Default AI Provider: 'claude', 'gemini', 'openai', or 'auto'
$savedProvider = !empty($dynamicAiSettings['default_provider']) ? trim($dynamicAiSettings['default_provider']) : 'claude';
defined('DEFAULT_AI_PROVIDER') or define('DEFAULT_AI_PROVIDER', $savedProvider ?: (getenv('DEFAULT_AI_PROVIDER') ?: 'claude'));

// Configured Claude Model ID (Configurable server-side, validated against official Anthropic docs)
$savedClaudeModel = !empty($dynamicAiSettings['claude_model']) ? trim($dynamicAiSettings['claude_model']) : 'claude-sonnet-5-5';
defined('CLAUDE_MODEL_ID') or define('CLAUDE_MODEL_ID', $savedClaudeModel);

// Local Fallback Data Storage for Quotations (when database is offline)
defined('LOCAL_FALLBACK_FILE') or define('LOCAL_FALLBACK_FILE', __DIR__ . '/../data/saved_quotations.json');

