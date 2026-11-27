<?php
/**
 * api/forex.php — Live Currency Exchange Rate Service via ExchangeRate-API
 * Part of Let's Explore DMC CRM + AI PDF Studio
 * 
 * Capabilities:
 * - Fetches live exchange rates from ExchangeRate-API
 * - Server-side caching (24-hour TTL) in data/forex_cache.json for high speed and offline resilience
 * - Multi-currency support: USD, INR, EUR, AED, THB, GBP, SGD, AUD, CHF, MYR, IDR, etc.
 * - Single pair conversion: ?from=USD&to=INR&amount=100
 * - Rate table: ?base=USD
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$cacheFile = __DIR__ . '/../data/forex_cache.json';
$cacheDir = dirname($cacheFile);
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

// Built-in standard fallbacks for travel operations
$FALLBACK_RATES = [
    'USD' => 1.0,
    'INR' => 87.50,
    'EUR' => 0.92,
    'AED' => 3.67,
    'THB' => 35.50,
    'SGD' => 1.34,
    'GBP' => 0.79,
    'AUD' => 1.54,
    'CHF' => 0.88,
    'MYR' => 4.45,
    'IDR' => 15850.0,
    'JPY' => 152.0,
    'CAD' => 1.39
];

/**
 * Fetch rates from ExchangeRate-API
 */
function fetchFromExchangeRateApi($apiKey = '') {
    if (!empty($apiKey)) {
        $url = "https://v6.exchangerate-api.com/v6/" . urlencode($apiKey) . "/latest/USD";
    } else {
        // Free reliable open endpoint provided by ExchangeRate-API
        $url = "https://open.er-api.com/v6/latest/USD";
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_USERAGENT => 'LetsExploreDMC-ForexEngine/1.0',
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err || $httpCode < 200 || $httpCode >= 300) {
        return null;
    }

    $json = json_decode($res, true);
    if ($json && ($json['result'] ?? '') === 'success' && !empty($json['rates'])) {
        return [
            'base' => 'USD',
            'timestamp' => time(),
            'last_update' => date('Y-m-d H:i:s'),
            'source' => 'ExchangeRate-API',
            'rates' => $json['rates']
        ];
    }
    return null;
}

// Check for custom ExchangeRate-API key in settings
$settingsPath = function_exists('getSecureAiSettingsPath') ? getSecureAiSettingsPath(false) : (__DIR__ . '/../data/ai_settings.json');
$settings = file_exists($settingsPath) ? json_decode(@file_get_contents($settingsPath), true) : [];
$customForexKey = $settings['exchangerate_api_key'] ?? '';

// Check Cache (Valid for 24 hours)
$cacheValid = false;
$cachedData = null;
$forceRefresh = isset($_GET['refresh']) || isset($_GET['force']);

if (!$forceRefresh && file_exists($cacheFile)) {
    $raw = @file_get_contents($cacheFile);
    $cachedData = json_decode($raw, true);
    if ($cachedData && !empty($cachedData['timestamp'])) {
        $age = time() - $cachedData['timestamp'];
        if ($age < 86400) { // 24 hours TTL
            $cacheValid = true;
        }
    }
}

$ratesData = null;
if ($cacheValid && $cachedData) {
    $ratesData = $cachedData;
    $ratesData['cached'] = true;
} else {
    $fresh = fetchFromExchangeRateApi($customForexKey);
    if ($fresh) {
        $ratesData = $fresh;
        $ratesData['cached'] = false;
        @file_put_contents($cacheFile, json_encode($fresh, JSON_PRETTY_PRINT));
    } elseif ($cachedData) {
        // Stale cache fallback
        $ratesData = $cachedData;
        $ratesData['cached'] = true;
        $ratesData['stale'] = true;
    } else {
        // Hardcoded standard fallback
        $ratesData = [
            'base' => 'USD',
            'timestamp' => time(),
            'last_update' => date('Y-m-d H:i:s'),
            'source' => 'Built-in Travel Standard',
            'rates' => $FALLBACK_RATES,
            'cached' => false,
            'fallback' => true
        ];
    }
}

$usdRates = $ratesData['rates'] ?? $FALLBACK_RATES;
$base = strtoupper(trim($_GET['base'] ?? 'USD'));

// Action: Direct conversion (?from=USD&to=INR&amount=100)
if (!empty($_GET['from']) && !empty($_GET['to'])) {
    $from = strtoupper(trim($_GET['from']));
    $to = strtoupper(trim($_GET['to']));
    $amount = floatval($_GET['amount'] ?? 1);

    $fromRate = $usdRates[$from] ?? ($FALLBACK_RATES[$from] ?? null);
    $toRate = $usdRates[$to] ?? ($FALLBACK_RATES[$to] ?? null);

    if (!$fromRate || !$toRate) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Unsupported currency pair: $from to $to"
        ]);
        exit;
    }

    $inUsd = $amount / $fromRate;
    $result = $inUsd * $toRate;
    $effectiveRate = $toRate / $fromRate;

    echo json_encode([
        'success' => true,
        'from' => $from,
        'to' => $to,
        'amount' => $amount,
        'result' => round($result, 4),
        'rate' => round($effectiveRate, 6),
        'source' => $ratesData['source'] ?? 'ExchangeRate-API',
        'last_update' => $ratesData['last_update'] ?? date('Y-m-d H:i:s')
    ]);
    exit;
}

// Base conversion if base != USD
$finalRates = [];
if ($base === 'USD') {
    $finalRates = $usdRates;
} else {
    $baseRate = $usdRates[$base] ?? ($FALLBACK_RATES[$base] ?? 1.0);
    foreach ($usdRates as $curr => $rate) {
        $finalRates[$curr] = round($rate / $baseRate, 6);
    }
}

echo json_encode([
    'success' => true,
    'provider' => 'ExchangeRate-API',
    'base' => $base,
    'timestamp' => $ratesData['timestamp'],
    'last_update' => $ratesData['last_update'],
    'cached' => $ratesData['cached'] ?? false,
    'rates' => $finalRates
]);
