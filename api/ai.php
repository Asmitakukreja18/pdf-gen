<?php
/**
 * api/ai.php — Multi-Provider AI Gateway & Document Interpreter
 * Supports: Anthropic Claude, Google Gemini 2.5 Flash, OpenAI
 * Automatic Fallback Chain: Claude -> Gemini -> Local DMC Intelligence Engine
 * Comprehensive Support for 12 Distinct Travel Document Formats & Rate Management
 */

require_once __DIR__ . '/config.php';

if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper: Extract text streams directly from PDF binary buffer
function extractPdfTextSimple($pdfContent) {
    if (!$pdfContent) return '';
    $textParts = [];
    if (preg_match_all('/stream[\r\n]+(.*?)[\r\n]+endstream/s', $pdfContent, $streams)) {
        foreach ($streams[1] as $st) {
            $decomp = @gzuncompress($st);
            if ($decomp) {
                if (preg_match_all('/\((.*?)\)\s*Tj/s', $decomp, $matches)) {
                    $textParts[] = implode(' ', $matches[1]);
                }
                if (preg_match_all('/\[(.*?)\]\s*TJ/s', $decomp, $matchesArray)) {
                    foreach ($matchesArray[1] as $arr) {
                        if (preg_match_all('/\((.*?)\)/', $arr, $subMatches)) {
                            $textParts[] = implode(' ', $subMatches[1]);
                        }
                    }
                }
            }
        }
    }
    if (preg_match_all('/\((.*?)\)\s*Tj/s', $pdfContent, $matches)) {
        $textParts[] = implode(' ', $matches[1]);
    }
    if (!empty($textParts)) {
        $rawText = implode(' ', $textParts);
        $clean = preg_replace('/\\\\[0-9]{3}/', '', $rawText);
        $clean = str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], $clean);
        return substr(trim($clean), 0, 15000);
    }
    return '';
}

// Read incoming JSON body
$rawInput = file_get_contents('php://input');
if (empty($rawInput) && php_sapi_name() === 'cli' && isset($argv[1])) {
    $rawInput = $argv[1];
}
$payload = json_decode($rawInput, true);

if (!$payload || !isset($payload['prompt'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Missing prompt in request payload.'
    ]);
    exit;
}

$prompt = trim($payload['prompt'] ?? '');
$currentQuotation = $payload['currentQuotation'] ?? null;
$attachment = $payload['attachment'] ?? null;
$serverFilePath = trim($payload['serverFilePath'] ?? '');
$requestedProvider = strtolower(trim($payload['provider'] ?? DEFAULT_AI_PROVIDER));
$requestedDocType = strtolower(trim($payload['docType'] ?? ''));
$requestedDestination = trim($payload['destination'] ?? '');
$userRates = isset($payload['rates']) && is_array($payload['rates']) ? $payload['rates'] : null;

// Read document directly from cPanel server-side storage if serverFilePath is provided
if (!empty($serverFilePath)) {
    $uploadDir = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR;
    $baseName = basename($serverFilePath);
    $fullPath = $uploadDir . $baseName;

    if (file_exists($fullPath)) {
        $fileBytes = @file_get_contents($fullPath);
        if ($fileBytes) {
            if (!$attachment || !is_array($attachment)) {
                $attachment = [];
            }
            $attachment['base64'] = base64_encode($fileBytes);
            $attachment['name'] = $payload['originalName'] ?? $baseName;
            $attachment['serverStored'] = true;
            $attachment['serverPath'] = 'uploads/' . $baseName;
            $ext = strtolower(pathinfo($baseName, PATHINFO_EXTENSION));
            if ($ext === 'pdf') {
                $attachment['mimeType'] = 'application/pdf';
                if (empty($attachment['extractedText'])) {
                    $attachment['extractedText'] = extractPdfTextSimple($fileBytes);
                }
            } elseif (in_array($ext, ['png', 'jpg', 'jpeg', 'webp'])) {
                $attachment['mimeType'] = ($ext === 'png') ? 'image/png' : 'image/jpeg';
            }
        }
    }
}

// Build normalized array of attachments (supports single or multi-PDF)
$attachments = [];
if (!empty($payload['attachments']) && is_array($payload['attachments'])) {
    $attachments = $payload['attachments'];
} elseif ($attachment && is_array($attachment)) {
    $attachments = [$attachment];
}

// Guarantee extractedText from base64 for each attachment if not already populated
foreach ($attachments as &$attItem) {
    if (is_array($attItem) && empty($attItem['extractedText']) && !empty($attItem['base64'])) {
        $rawPdf = @base64_decode($attItem['base64']);
        if ($rawPdf && strpos($rawPdf, '%PDF-') !== false) {
            $attItem['extractedText'] = extractPdfTextSimple($rawPdf);
        }
    }
}
unset($attItem);

// Automatic Google Drive link detection in user prompt
if (preg_match('/https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]{25,})/', $prompt, $driveMatches)) {
    $driveFileId = $driveMatches[1];
    $driveDownloadUrl = "https://drive.google.com/uc?export=download&id={$driveFileId}";
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 4,
            'follow_location' => 1,
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        ]
    ]);
    $driveContent = @file_get_contents($driveDownloadUrl, false, $ctx);
    if ($driveContent && strlen($driveContent) > 40) {
        $extractedDrive = extractPdfTextSimple($driveContent);
        if ($extractedDrive && strlen($extractedDrive) > 20) {
            $attachments[] = [
                'name' => 'Google_Drive_Document.pdf',
                'mimeType' => 'application/pdf',
                'extractedText' => $extractedDrive,
                'source' => 'google_drive'
            ];
        }
    }
}

// Guarantee single $attachment points to the first attachment for backward compatibility
if (empty($attachment) && !empty($attachments)) {
    $attachment = $attachments[0];
}

// Build context string
$contextText = '';
if ($currentQuotation && is_array($currentQuotation)) {
    $contextText = "\nCURRENT ACTIVE DOCUMENT STATE:\n" . json_encode($currentQuotation, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
}
if (!empty($requestedDocType)) {
    $contextText .= "\nEXPLICIT REQUESTED DOCUMENT TYPE: " . $requestedDocType . "\n";
}
if (!empty($requestedDestination)) {
    $contextText .= "EXPLICIT TARGET DESTINATION: " . $requestedDestination . "\n";
}
if (!empty($userRates)) {
    $contextText .= "USER SPECIFIED PRICING & RATE PARAMETERS:\n" . json_encode($userRates, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
}

$systemPrompt = "You are the Master Travel ERP & AI Document Generation Engine for Let's Explore DMC (Destination Management Company).
Your mission is to generate professional, destination-specific travel documents across 12 distinct business formats:

1. 'hotel_voucher': Hotel Booking Confirmation Voucher with Booking ID, Guest details, Hotel address/rating, Room type, Meal plan, Check-in/out dates, Hotel perks, DMC emergency helpline, and voucher terms.
2. 'transfer_voucher': Private Airport or Inter-City Transfer Voucher with Vehicle category, Pickup date/time/location, Drop-off point, Flight/Train details, Driver contact, Luggage allowance, and Meet & Greet instructions.
3. 'activity_voucher': Sightseeing, Excursions & Theme Park Voucher with Attraction name, Ticket barcode, Pickup window, Meeting point, Tour inclusions, Highlights, and What to bring.
4. 'customer_billing': Customer Statement of Account (SOA) with Transaction ledger (Dates, Descriptions, Debits, Credits, Running balance), Total billed, Amount paid, Balance due, and Bank wire details.
5. 'supplier_billing': Supplier Work Order & Contracted B2B PO with Supplier details, DMC reference, Contracted services table, Net B2B rates, Gross total, Commission/discount, Net payable, and Settlement terms.
6. 'quotation': Master Travel Quotation with Day-by-day detailed itinerary, Hotels, Dual tariffs (USD & INR), Key inclusions, Exclusions, and Booking terms.
7. 'customer_invoice': Official Commercial GST Tax Invoice with Invoice #, Date, Client details, HSN Code 998555, Itemized services, Taxable subtotal, CGST 2.5%, SGST 2.5% (or IGST 5%), Grand total, and Bank details.
8. 'proforma_invoice': Proforma Estimate with Proforma #, Date, Validity period, Estimated services breakdown, 50% advance deposit milestone schedule, and Wire instructions.
9. 'hotel_rate_sheet': Structured Hotel Tariff Table with Destination hotels, Star categories, Room types, Meal plans, Low season, High season, Peak season rates, and Extra bed policies.
10. 'sightseeing_rate_sheet': Structured Sightseeing Tariff Table with Tours, Duration, SIC (Seat-in-Coach) Adult/Child rates, Private vehicle rates, Inclusions, and Operating schedules.
11. 'transport_rate_sheet': Chauffeur & Vehicle Tariff Table with Routes (Airport, 8hr disposal, Inter-city), Vehicle categories (Sedan, SUV, Commuter Van, Minicoach), Toll/fuel rules, and Hourly overtime rates.
12. 'package_rate_sheet': Complete Tour Package Master Tariff Matrix with 3-Star, 4-Star, and 5-Star tiers across 2 Pax, 4 Pax, 6 Pax, and 10+ Pax groups, Single supplements, and Child policies.

DESTINATION CUSTOMIZATION:
Generate all content tailored to the selected destination (Thailand, Dubai, Bali, Singapore, Malaysia, Vietnam, Turkey, Kashmir, Rajasthan, Maldives). Never mix up destination landmarks, hotels, or currencies.

RATE & PRICING RULES:
If user rates or modifications are provided, perform exact mathematical calculations without inventing unapproved numbers.
Always return valid JSON matching the selected document format, with 'detectedDocType', 'docType', 'docTitle', 'destination', 'country', 'pricing', and the corresponding document object.";

$errors = [];

// Provider Router with automatic fallback (Gemini 2.5 Flash is primary active engine)
$providersToTry = [];
if ($requestedProvider === 'claude') {
    $providersToTry = ['claude', 'gemini'];
} elseif ($requestedProvider === 'openai') {
    $providersToTry = ['openai', 'gemini'];
} elseif ($requestedProvider === 'gemini') {
    $providersToTry = ['gemini'];
} else {
    // 'auto' default: Try Claude 3.5 Sonnet first, fallback seamlessly to Gemini 2.5 Flash
    $providersToTry = ['claude', 'gemini'];
}

$finalResult = null;
$successfulProvider = null;
$usedModel = null;

foreach ($providersToTry as $prov) {
    if ($prov === 'claude') {
        $claudeKey = !empty($payload['claudeApiKey']) ? trim($payload['claudeApiKey']) : (defined('CLAUDE_API_KEY') ? CLAUDE_API_KEY : '');
        if ($claudeKey && strpos($claudeKey, 'YOUR_') === false) {
            $res = callClaude($systemPrompt, $contextText, $prompt, $attachments, $claudeKey);
            if ($res['success']) {
                $finalResult = $res['data'];
                $successfulProvider = 'claude';
                $usedModel = $res['model'];
                break;
            } else {
                $errors['claude'] = $res['error'];
            }
        }
    }

    if ($prov === 'gemini') {
        $geminiKey = !empty($payload['geminiApiKey']) ? trim($payload['geminiApiKey']) : (defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '');
        if ($geminiKey && strpos($geminiKey, 'YOUR_') === false) {
            $res = callGemini($systemPrompt, $contextText, $prompt, $attachments, $geminiKey);
            if ($res['success']) {
                $finalResult = $res['data'];
                $successfulProvider = 'gemini';
                $usedModel = $res['model'];
                break;
            } else {
                $errors['gemini'] = $res['error'];
            }
        }
    }

    if ($prov === 'openai') {
        $openaiKey = !empty($payload['openaiApiKey']) ? trim($payload['openaiApiKey']) : (defined('OPENAI_API_KEY') ? OPENAI_API_KEY : '');
        if ($openaiKey && strpos($openaiKey, 'YOUR_') === false) {
            $res = callOpenAI($systemPrompt, $contextText, $prompt, $attachments, $openaiKey);
            if ($res['success']) {
                $finalResult = $res['data'];
                $successfulProvider = 'openai';
                $usedModel = $res['model'];
                break;
            } else {
                $errors['openai'] = $res['error'];
            }
        }
    }
}

if ($finalResult !== null) {
    // Ensure document type is normalized if LLM omitted it
    if (empty($finalResult['detectedDocType']) && !empty($requestedDocType)) {
        $finalResult['detectedDocType'] = $requestedDocType;
    }
    if (empty($finalResult['docType']) && !empty($requestedDocType)) {
        $finalResult['docType'] = $requestedDocType;
    }
    echo json_encode([
        'success' => true,
        'provider' => $successfulProvider,
        'model' => $usedModel,
        'data' => $finalResult,
        'fallbackNotes' => !empty($errors) ? $errors : null
    ]);
} else {
    // Graceful Intelligent Local Generation Fallback
    $localData = generateLocalAiQuotation($prompt, $currentQuotation, $attachments, $requestedDocType, $requestedDestination, $userRates);
    echo json_encode([
        'success' => true,
        'provider' => 'local-intelligence',
        'model' => 'smart-travel-heuristic-v2',
        'data' => $localData,
        'fallbackNotes' => !empty($errors) ? $errors : ['notice' => 'Generated via local DMC multi-template travel engine']
    ]);
}

// ==========================================
// Provider Callers
// ==========================================

function callClaude($systemPrompt, $contextText, $userPrompt, $attachments, $apiKey) {
    $models = ['claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'];
    $lastError = null;

    $userContent = [];
    $attList = is_array($attachments) ? (isset($attachments[0]) ? $attachments : [$attachments]) : [];

    foreach ($attList as $attachment) {
        if (!is_array($attachment)) continue;
        $rawB64 = $attachment['base64'] ?? '';
        $b64 = preg_replace('/^data:[^;]+;base64,/', '', $rawB64);
        $b64 = trim($b64);

        if (!empty($b64)) {
            $mime = $attachment['mimeType'] ?? 'application/pdf';
            if (strpos($mime, 'pdf') !== false) {
                $userContent[] = [
                    'type' => 'document',
                    'source' => [
                        'type' => 'base64',
                        'media_type' => 'application/pdf',
                        'data' => $b64
                    ]
                ];
            } elseif (strpos($mime, 'image/') !== false) {
                $userContent[] = [
                    'type' => 'image',
                    'source' => [
                        'type' => 'base64',
                        'media_type' => $mime,
                        'data' => $b64
                    ]
                ];
            }
        }
        if (!empty($attachment['extractedText'])) {
            $userContent[] = [
                'type' => 'text',
                'text' => "--- EXTRACTED CONTENT FROM ATTACHED DOCUMENT (" . ($attachment['name'] ?? 'File') . ") ---\n" . substr($attachment['extractedText'], 0, 15000)
            ];
        }
    }

    $fullPromptText = $userPrompt . (!empty($contextText) ? "\n\n" . $contextText : "");
    $userContent[] = ['type' => 'text', 'text' => $fullPromptText];

    foreach ($models as $model) {
        $payload = [
            'model' => $model,
            'max_tokens' => 4096,
            'system' => $systemPrompt . "\nOutput MUST be raw valid JSON without markdown fences.",
            'messages' => [
                ['role' => 'user', 'content' => $userContent]
            ]
        ];

        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'x-api-key: ' . $apiKey,
                'anthropic-version: 2023-06-01',
                'content-type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 45
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            $lastError = "cURL error on {$model}: " . $curlErr;
            continue;
        }

        $resJson = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300 && isset($resJson['content'][0]['text'])) {
            $rawText = $resJson['content'][0]['text'];
            $cleanJson = preg_replace('/^```(?:json)?\s*/i', '', trim($rawText));
            $cleanJson = preg_replace('/\s*```$/i', '', $cleanJson);
            $parsed = json_decode($cleanJson, true);
            if ($parsed && is_array($parsed)) {
                return ['success' => true, 'model' => $model, 'data' => $parsed];
            }
        }
        $lastError = $resJson['error']['message'] ?? "HTTP {$httpCode} on {$model}";
    }
    return ['success' => false, 'error' => $lastError ?? 'Claude calls failed'];
}

function callGemini($systemPrompt, $contextText, $userPrompt, $attachments, $apiKey) {
    $models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    $lastError = null;

    $parts = [];
    $attList = is_array($attachments) ? (isset($attachments[0]) ? $attachments : [$attachments]) : [];

    foreach ($attList as $attachment) {
        if (!is_array($attachment)) continue;
        $rawB64 = $attachment['base64'] ?? '';
        $b64 = preg_replace('/^data:[^;]+;base64,/', '', $rawB64);
        $b64 = trim($b64);
        if (!empty($b64)) {
            $mime = $attachment['mimeType'] ?? 'application/pdf';
            $parts[] = [
                'inline_data' => [
                    'mime_type' => $mime,
                    'data' => $b64
                ]
            ];
        }
        if (!empty($attachment['extractedText'])) {
            $parts[] = [
                'text' => "--- ATTACHMENT EXTRACTED TEXT (" . ($attachment['name'] ?? 'File') . ") ---\n" . substr($attachment['extractedText'], 0, 15000)
            ];
        }
    }

    $fullText = $systemPrompt . "\n\n" . (!empty($contextText) ? $contextText . "\n\n" : "") . "USER INSTRUCTION: " . $userPrompt . "\n\nOUTPUT MUST BE STRICTLY RAW VALID JSON matching the requested travel document schema.";
    $parts[] = ['text' => $fullText];

    foreach ($models as $model) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);
        $postData = [
            'contents' => [
                ['role' => 'user', 'parts' => $parts]
            ],
            'generationConfig' => [
                'temperature' => 0.2,
                'response_mime_type' => 'application/json'
            ]
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($postData),
            CURLOPT_TIMEOUT => 40
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            $lastError = "cURL error on {$model}: " . $curlErr;
            continue;
        }

        $resJson = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300) {
            $content = $resJson['candidates'][0]['content']['parts'][0]['text'] ?? '';
            $cleanJson = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
            $cleanJson = preg_replace('/\s*```$/i', '', $cleanJson);
            $parsed = json_decode($cleanJson, true);
            if ($parsed && is_array($parsed)) {
                return ['success' => true, 'model' => $model, 'data' => $parsed];
            }
        }
        $lastError = $resJson['error']['message'] ?? "HTTP {$httpCode} on {$model}";
    }
    return ['success' => false, 'error' => $lastError ?? 'Gemini calls failed'];
}

function callOpenAI($systemPrompt, $contextText, $userPrompt, $attachments, $apiKey) {
    $postData = [
        'model' => 'gpt-4o-mini',
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt . "\nOutput MUST be raw valid JSON."],
            ['role' => 'user', 'content' => $userPrompt . (!empty($contextText) ? "\n\n" . $contextText : "")]
        ],
        'response_format' => ['type' => 'json_object'],
        'temperature' => 0.2
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($postData),
        CURLOPT_TIMEOUT => 35
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) return ['success' => false, 'error' => $err];

    $resJson = json_decode($response, true);
    if ($httpCode >= 200 && $httpCode < 300) {
        $content = $resJson['choices'][0]['message']['content'] ?? '';
        $parsed = json_decode($content, true);
        if ($parsed) return ['success' => true, 'model' => 'gpt-4o-mini', 'data' => $parsed];
    }
    return ['success' => false, 'error' => $resJson['error']['message'] ?? "HTTP $httpCode"];
}

// ==========================================
// Intelligent Local Multi-Template Fallback
// ==========================================


// ==========================================
// 1:1 Reference Document Builders (format/)
// ==========================================

function buildDiningQuoteData($resort = 'Villa Nautica Paradise Island', $userRates = null) {
    $currency = 'USD';
    if (!empty($userRates['currency'])) $currency = strtoupper(trim($userRates['currency']));

    $experiences = [
        ['experience' => 'Candle Light Dinner at the Beach', 'menu' => 'Set menu', 'rate' => 230.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Dig-in Dinner by the Beach', 'menu' => 'Selection One', 'rate' => 281.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Dig-in Dinner by the Beach', 'menu' => 'Selection Two', 'rate' => 281.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Seafood Lunch - Adventure on the Sea', 'menu' => 'Selection One', 'rate' => 185.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Seafood Lunch - Adventure on the Sea', 'menu' => 'Selection Two', 'rate' => 147.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Seafood Lunch - Adventure on the Sea', 'menu' => 'Selection Three', 'rate' => 166.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Vegetarian Candle Light Dinner', 'menu' => 'Set menu', 'rate' => 196.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Oriental Night Experience', 'menu' => 'Selection One', 'rate' => 281.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Oriental Night Experience', 'menu' => 'Selection Two', 'rate' => 281.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Private BBQ on the Beach', 'menu' => 'Selection One', 'rate' => 212.00, 'unit' => 'USD / COUPLE'],
        ['experience' => 'Crow\'s Nest - Over the Ocean Dinner', 'menu' => 'Menu Option I', 'rate' => 228.00, 'unit' => 'USD / COUPLE']
    ];

    $menus = [
        [
            'title' => 'Candle Light Dinner at the Beach',
            'rate' => 'USD 230++ per couple',
            'courses' => [
                'Amuse-Bouche' => 'Smoked Salmon Mille-Feuille or Prosciutto di Parma & Sweet Melon',
                'Appetizer' => 'Beef Carpaccio - Rocket & Shaved Parmesan',
                'Palate Cleanser' => 'Lime Sorbet with a hint of Betel Nut',
                'Main Course' => 'Grilled Lobster - Lemon & Herb Butter, Mixed Green Salad',
                'Dessert' => 'Mango & Passion Fruit Parfait'
            ]
        ],
        [
            'title' => 'Dig-in Dinner by the Beach',
            'rate' => 'USD 281++ per couple',
            'courses' => [
                'Appetizer' => 'Smoked Chicken Breast Delight / Mixed Salad',
                'Soup' => 'Boston Seafood Chowder or Hot & Sour Soup',
                'Main Course' => 'Islander Seafood Platter or Cantonese Style Steamed Salmon',
                'Dessert' => 'Imperial Cheesecake or Chinese Pancake'
            ]
        ],
        [
            'title' => 'Vegetarian Candle Light Dinner',
            'rate' => 'USD 196++ per couple',
            'courses' => [
                'Appetizer' => 'Duo of vegetable spring roll & cream cheese olive bruschetta',
                'Soup' => 'Cream of young asparagus soup with herb oil & roasted pimento',
                'Main Course' => 'Assorted vegetarian combo - Mexican vegetable quesadilla, Pasta vegetariana, Indian stuffed vegetable rotti, oriental stir-fry vegetables with steamed rice & Caesar salad',
                'Dessert' => 'Tropical fresh fruit platter'
            ]
        ],
        [
            'title' => 'Crow\'s Nest - Over the Ocean Dinner',
            'rate' => 'USD 228++ per couple',
            'description' => 'Lagoon views, starlit skies. Dine beneath the stars in the lifeguard-inspired tower, with panoramic island views and a candlelit feast.',
            'courses' => [
                'Appetizer' => 'Roma tomatoes & marinated mozzarella on rustic bread with black olive tapenade',
                'Soup' => 'Seafood miso soup & tuna maki roll',
                'Main Course' => 'Surf & Turf - half lobster and wagyu beef, roasted potatoes and winter vegetables OR Lobster Thermidor',
                'Dessert' => 'Classic Tiramisu or Lemon Cheese Cake'
            ]
        ]
    ];

    return [
        'docType' => 'dining_quote',
        'docTitle' => 'DESTINATION DINING QUOTATION',
        'destination' => 'Villa Nautica Paradise Island',
        'country' => 'Maldives',
        'currency' => $currency,
        'resort' => $resort,
        'subtitle' => 'Private Beach & Over-the-Ocean Dining Experiences · Rates per couple',
        'ratesBasis' => 'Per couple (2 guests)',
        'taxes' => '10% Service Charge + 17% TGST',
        'issueDate' => date('d-M-Y'),
        'refNo' => 'LEDMC-DDQ-' . rand(1000, 9999),
        'diningQuote' => [
            'resort' => $resort,
            'currency' => $currency,
            'ratesBasis' => 'Per couple (2 guests)',
            'taxes' => '10% Service Charge + 17% TGST',
            'experiences' => $experiences,
            'menuDetails' => $menus
        ],
        'pricing' => [
            'grandTotal' => 230.00,
            'subtotal' => 230.00,
            'taxAmount' => 62.10,
            'ratePerAdult' => 115.00,
            'totalUsd' => 230.00,
            'totalInr' => round(230.00 * 87.0, 2)
        ],
        'inclusions' => [
            'Private decorated table setup directly on the beach or ocean tower',
            'Personal dedicated chef & private butler service for the evening',
            'Fresh floral table arrangement and ambient candlelight',
            'Chilled fresh coconut or welcome mocktail on arrival'
        ],
        'exclusions' => [
            'Alcoholic beverages and premium vintage champagne unless requested',
            'Speedboat transfers to/from external resorts or islands',
            'Personal photography / drone coverage (available upon request)'
        ],
        'contacts' => [
            'phone1' => '+91 80075 86881',
            'phone2' => '+91 95459 55966',
            'website' => 'www.letsexploredmc.com',
            'instagram' => '@lets_exploredmc',
            'email' => 'letsexploredmc@gmail.com'
        ]
    ];
}

function buildGroupPackageData($package = 'Tomorrowland Thailand', $userRates = null) {
    $currency = 'USD';
    $costPerPerson = 127.15;
    if (!empty($userRates['ratePerAdult'])) $costPerPerson = floatval($userRates['ratePerAdult']);

    return [
        'docType' => 'group_package',
        'docTitle' => 'PATTAYA GROUP PACKAGE',
        'subtitle' => 'Tomorrowland Thailand | 11 - 14 Dec 2026',
        'destination' => 'Pattaya & Tomorrowland Festival, Thailand',
        'country' => 'Thailand',
        'currency' => $currency,
        'perPersonCost' => $costPerPerson,
        'costLabel' => 'Land Package | Twin / Double sharing | Hotel self booked',
        'inclusionsTitle' => 'What\'s Included',
        'inclusions' => [
            'Nights in Pattaya - Hotel Self Booked (Hotel stay is booked by the guests directly and is not part of the package cost)',
            'Airport Transfers: Private: Suvarnabhumi Airport - Pattaya Hotel - Suvarnabhumi Airport (2 Vans)',
            'Travel Insurance: Thailand insurance during local tours within the country\'s boundaries'
        ],
        'timelineBadges' => [
            ['day' => '11', 'month' => 'DEC', 'title' => 'Tomorrowland - Day 1', 'desc' => 'Pick-up & Drop-off (2 Vans)'],
            ['day' => '12', 'month' => 'DEC', 'title' => 'Tomorrowland - Day 2', 'desc' => 'Pick-up & Drop-off (2 Vans)'],
            ['day' => '13', 'month' => 'DEC', 'title' => 'Tomorrowland - Day 3', 'desc' => 'Pick-up & Drop-off (2 Vans)'],
            ['day' => '14', 'month' => 'DEC', 'title' => 'Pattaya City Tour', 'desc' => 'City tour + Big Buddha ticket & private transfer (2 Vans)']
        ],
        'festivalPasses' => [
            [
                'title' => '3 DAYS FESTIVAL PASS FULL MADNESS',
                'badge' => 'OPTIONAL ADD-ON',
                'desc' => 'Entry pass only per person (No food allowance). Not included in package cost.'
            ],
            [
                'title' => '3 DAYS FESTIVAL PASS COMFORT VIP',
                'badge' => 'VIP PASS',
                'desc' => 'Full Madness Comfort VIP | Entry only per person (VIP viewing deck & express entry).'
            ]
        ],
        'accommodationOptions' => [
            [
                'optionNo' => '1',
                'hotel' => 'Welcome Plaza Hotel',
                'desc' => 'Double / Twin bed, breakfast included',
                'rate1' => 'Double / Twin bed (2 pax, per night, with breakfast): USD 39.28',
                'rate2' => 'Extra bed: USD 21.95'
            ],
            [
                'optionNo' => '2',
                'hotel' => 'K Station Pattaya',
                'desc' => 'Budget friendly double room',
                'rate1' => 'Room, Double bed (2 pax, per night): USD 24.45',
                'rate2' => 'Extra bed: USD 13.53'
            ],
            [
                'optionNo' => '3',
                'hotel' => 'Pool Villa - The Palm',
                'desc' => 'Private pool villa for 15 pax',
                'rate1' => 'Day 1: USD 416 | Day 2: USD 346 | Day 3: USD 346 | Day 4: USD 277 | Total (15 pax): USD 1,385',
                'rate2' => 'Villa works out to approx. USD 92.33 per person for 4 days. Hotel is self booked - rates above are for reference.'
            ]
        ],
        'pricing' => [
            'grandTotal' => $costPerPerson * 2,
            'subtotal' => $costPerPerson * 2,
            'costPerPerson' => $costPerPerson,
            'ratePerAdult' => $costPerPerson,
            'totalUsd' => $costPerPerson * 2,
            'totalInr' => round($costPerPerson * 2 * 87.0, 2)
        ],
        'cta' => [
            'heading' => 'Ready to party in Pattaya?',
            'subheading' => 'Call us to lock your group dates & passes: +91 80075 86881',
            'phones' => ['+91 80075 86881', '+91 95459 55966'],
            'website' => 'www.letsexploredmc.com',
            'instagram' => '@lets_exploredmc'
        ]
    ];
}

function buildHotelVoucherData($hotel = 'hilton abu dhabi yas island', $userRates = null) {
    return [
        'docType' => 'hotel_voucher',
        'docTitle' => 'HOTEL ACCOMMODATION VOUCHER',
        'destination' => 'Abu Dhabi & Yas Island, UAE',
        'country' => 'UAE',
        'hotelName' => $hotel,
        'hotelVoucher' => [
            'hotelName' => $hotel,
            'email' => 'reservations_yasisland@hilton.com',
            'refNo' => 'TG/31130',
            'mobileNo' => '97122086888',
            'confirmationNo' => 'NH27002524635670',
            'cityName' => 'dubai / abu dhabi',
            'guestName' => 'Aanay tours',
            'guestEmail' => 'Infoattdmc@gmail.com',
            'guestMobile' => '7709123187',
            'hotelType' => 'luxury',
            'location' => 'abu dhabi',
            'googleMapsUrl' => 'https://maps.google.com/?q=Hilton+Abu+Dhabi+Yas+Island',
            'checkIn' => '16-Nov-2026 - 11:52 PM',
            'checkOut' => '18-Nov-2026 - 11:52 PM',
            'roomDetails' => [
                'roomType' => 'Deluxe double room',
                'occupancy' => 'double sharing + extra bed',
                'mealPlan' => 'Breakfast',
                'noOfRooms' => 2,
                'extraBed' => 0,
                'adults' => 4,
                'children' => 2,
                'infants' => 1,
                'extraMattress' => 1
            ],
            'adultDetails' => [
                ['name' => 'pratik sangani', 'email' => '-', 'mobile' => '7709123187']
            ],
            'importantInfo' => [
                'Complimentary access to any 1 out of 4 Yas Island Theme Parks - Ferrari World, Warner Bros World, Yas Waterworld or Sea World - per day for every person included in the booking.',
                'Only passport is considered as valid ID proof that each guest must carry.'
            ],
            'idProof' => [
                'Passport is accepted as ID proof(s) for international travelers.'
            ],
            'amenities' => [
                'Transfers & Connectivity' => 'Airport Shuttle (Free), WiFi Speed: 25+ Mbps, Valet Parking',
                'Entertainment' => 'Theme Park Access, Outdoor Swimming Pool, Kids Play Area, Spa & Sauna',
                'Food & Drinks' => 'Daily International Buffet Breakfast, Poolside Bar, Fine Dining Restaurant',
                'Room Amenities' => 'Air Conditioning, Safe Box, Mini Bar, Bathrobe & Slippers, Daily Housekeeping'
            ],
            'footer' => [
                'ecoNotice' => 'Please consider the environment before printing this e-mail',
                'agency' => 'Aanay tours / Let\'s Explore DMC',
                'contactPerson' => 'Viraj Gaglani',
                'contactMobile' => '7709123187',
                'contactEmail' => 'Infoattdmc@gmail.com'
            ]
        ],
        'pricing' => [
            'grandTotal' => 0.00,
            'status' => 'CONFIRMED & PREPAID BY LET\'S EXPLORE DMC'
        ]
    ];
}

function modifyExistingQuotation($curr, $prompt, $userRates = null) {
    $p = strtolower($prompt);
    $updated = $curr;
    $notes = [];

    // 1. Detect Multiplier (Double, Triple, Half, Specific percentage or factor)
    $multiplier = 1.0;
    if (preg_match('/double\s*means\s*(\d+)\s*ka\s*(\d+)/i', $prompt, $dm)) {
        $multiplier = 2.0;
        $notes[] = "Rates doubled as requested ({$dm[1]} -> {$dm[2]})";
    } elseif (preg_match('/double|2x|do guna|twofold|200\s*ka\s*400/i', $p)) {
        $multiplier = 2.0;
        $notes[] = "All rates and pricing doubled (2x)";
    } elseif (preg_match('/triple|3x|teen guna/i', $p)) {
        $multiplier = 3.0;
        $notes[] = "All rates tripled (3x)";
    } elseif (preg_match('/half|adha|1\/2|0\.5x/i', $p)) {
        $multiplier = 0.5;
        $notes[] = "All rates reduced to half (50%)";
    } elseif (preg_match('/(\\d+)%\\s*(badha|increase|markup|add)/i', $p, $pctM)) {
        $pct = floatval($pctM[1]);
        $multiplier = 1.0 + ($pct / 100.0);
        $notes[] = "Prices increased by {$pct}%";
    }

    // 2. Detect Decoration Request
    $hasDecoration = (bool)preg_match('/decoration|decorate|with\\s*decoration|sajawat|decor/i', $p);
    if ($hasDecoration) {
        $notes[] = "Special romantic decoration added";
    }

    // Apply multiplier to rates and pricing if multiplier != 1.0
    if ($multiplier != 1.0) {
        // A. If pricing block exists
        if (isset($updated['pricing']) && is_array($updated['pricing'])) {
            if (isset($updated['pricing']['grandTotal'])) $updated['pricing']['grandTotal'] = round($updated['pricing']['grandTotal'] * $multiplier, 2);
            if (isset($updated['pricing']['subtotal'])) $updated['pricing']['subtotal'] = round($updated['pricing']['subtotal'] * $multiplier, 2);
            if (isset($updated['pricing']['totalInr'])) $updated['pricing']['totalInr'] = round($updated['pricing']['totalInr'] * $multiplier, 2);
            if (isset($updated['pricing']['totalUsd'])) $updated['pricing']['totalUsd'] = round($updated['pricing']['totalUsd'] * $multiplier, 2);
            if (isset($updated['pricing']['ratePerAdult'])) $updated['pricing']['ratePerAdult'] = round($updated['pricing']['ratePerAdult'] * $multiplier, 2);
            if (isset($updated['pricing']['ratePerChild'])) $updated['pricing']['ratePerChild'] = round($updated['pricing']['ratePerChild'] * $multiplier, 2);
            if (isset($updated['pricing']['costPerPerson'])) $updated['pricing']['costPerPerson'] = round($updated['pricing']['costPerPerson'] * $multiplier, 2);
        }
        // B. If dining experiences / items list exists (Villa Nautica format)
        if (isset($updated['diningQuote']['experiences']) && is_array($updated['diningQuote']['experiences'])) {
            foreach ($updated['diningQuote']['experiences'] as &$exp) {
                if (isset($exp['rate'])) {
                    $exp['rate'] = round($exp['rate'] * $multiplier, 2);
                }
            }
        }
        // C. If invoice / billing items list exists
        if (isset($updated['invoice']['items']) && is_array($updated['invoice']['items'])) {
            foreach ($updated['invoice']['items'] as &$item) {
                if (isset($item['unitPrice'])) $item['unitPrice'] = round($item['unitPrice'] * $multiplier, 2);
                if (isset($item['total'])) $item['total'] = round($item['total'] * $multiplier, 2);
            }
            if (isset($updated['invoice']['subtotal'])) $updated['invoice']['subtotal'] = round($updated['invoice']['subtotal'] * $multiplier, 2);
            if (isset($updated['invoice']['grandTotal'])) $updated['invoice']['grandTotal'] = round($updated['invoice']['grandTotal'] * $multiplier, 2);
        }
        // D. If rate sheet items list exists
        if (isset($updated['rateSheet']['hotels']) && is_array($updated['rateSheet']['hotels'])) {
            foreach ($updated['rateSheet']['hotels'] as &$h) {
                if (isset($h['sglRate'])) $h['sglRate'] = round($h['sglRate'] * $multiplier, 2);
                if (isset($h['dblRate'])) $h['dblRate'] = round($h['dblRate'] * $multiplier, 2);
                if (isset($h['extraBedRate'])) $h['extraBedRate'] = round($h['extraBedRate'] * $multiplier, 2);
            }
        }
        // E. If package quotation cost ribbon exists
        if (isset($updated['perPersonCost'])) {
            $updated['perPersonCost'] = round($updated['perPersonCost'] * $multiplier, 2);
        }
    }

    // Apply Decoration if requested
    if ($hasDecoration) {
        // Add to inclusions
        if (!isset($updated['inclusions']) || !is_array($updated['inclusions'])) {
            $updated['inclusions'] = [];
        }
        $decorText = "Special Romantic Floral Decoration & Celebration Setup";
        if (!in_array($decorText, $updated['inclusions'])) {
            array_unshift($updated['inclusions'], $decorText);
        }
        // If dining experiences
        if (isset($updated['diningQuote']['experiences']) && is_array($updated['diningQuote']['experiences'])) {
            foreach ($updated['diningQuote']['experiences'] as &$exp) {
                if (!preg_match('/decoration/i', $exp['experience'])) {
                    $exp['experience'] .= " (with Decoration)";
                }
            }
        }
        // If title
        if (isset($updated['docTitle']) && !preg_match('/decoration/i', $updated['docTitle'])) {
            $updated['docTitle'] .= " (with Decoration)";
        }
    }

    // Custom response chat message
    $msg = "Aapka document format bilkul as-it-is barkaraar rakha gaya hai.";
    if (!empty($notes)) {
        $msg .= " " . implode(". ", $notes) . ". Right panel me live preview update ho chuka hai.";
    }
    $updated['aiResponseMessage'] = $msg;
    $updated['aiAction'] = 'modified_existing_format';

    return $updated;
}

function generateLocalAiQuotation($prompt, $currentQuotation = null, $attachments = null, $requestedDocType = '', $requestedDestination = '', $userRates = null) {
    // 0. CHECK IF THIS IS A MODIFICATION OF CURRENT ACTIVE QUOTATION/DOCUMENT
    if (!empty($currentQuotation) && is_array($currentQuotation)) {
        $pLower = strtolower($prompt);
        $isModPrompt = preg_match('/change\s*mat\s*karo|as\s*it\s*is|rahne\s*do|same\s*rakho|keep\s*same|sirf|bss|bas|only|double|2x|200\s*ka\s*400|triple|half|adha|badha|ghata|discount|markup|decoration|sajawat|decor|hotel\s*change|update|modify|edit/i', $pLower);
        if ($isModPrompt) {
            return modifyExistingQuotation($currentQuotation, $prompt, $userRates);
        }
    }

    $pLower = strtolower($prompt);
    // If prompt mentions 200 ka 400 or dining or villa nautica
    if (preg_match('/200\s*ka\s*400|villa\s*nautica|destination\s*dining|dining\s*quote|candle\s*light\s*dinner/i', $pLower) || $requestedDocType === 'dining_quote') {
        $baseDining = buildDiningQuoteData('Villa Nautica Paradise Island', $userRates);
        if (preg_match('/double|200\s*ka\s*400|decoration/i', $pLower)) {
            return modifyExistingQuotation($baseDining, $prompt, $userRates);
        }
        return $baseDining;
    }

    // If prompt mentions tomorrowland or pattaya group package
    if (preg_match('/tomorrowland|pattaya\s*group|festival\s*package/i', $pLower) || $requestedDocType === 'group_package') {
        $baseGroup = buildGroupPackageData('Tomorrowland Thailand', $userRates);
        if (preg_match('/double|decoration|2x/i', $pLower)) {
            return modifyExistingQuotation($baseGroup, $prompt, $userRates);
        }
        return $baseGroup;
    }

    // If prompt mentions aanay tours or hilton voucher
    if (preg_match('/aanay|hilton|abu\s*dhabi\s*voucher/i', $pLower) || ($requestedDocType === 'hotel_voucher' && preg_match('/aanay|hilton/i', $pLower))) {
        return buildHotelVoucherData('hilton abu dhabi yas island', $userRates);
    }

    $attList = is_array($attachments) ? (isset($attachments[0]) ? $attachments : [$attachments]) : [];
    $allAttText = '';
    $allAttNames = '';
    foreach ($attList as $att) {
        if (is_array($att)) {
            $allAttNames .= ' ' . ($att['name'] ?? '');
            $allAttText .= ' ' . ($att['extractedText'] ?? '');
        }
    }
    $text = strtolower($prompt . ' ' . $allAttNames . ' ' . $allAttText);

    // 1. Resolve Document Type
    $docType = 'quotation';
    $validDocTypes = [
        'hotel_voucher', 'dining_quote', 'group_package', 'transfer_voucher', 'activity_voucher',
        'customer_billing', 'supplier_billing', 'quotation',
        'customer_invoice', 'proforma_invoice',
        'hotel_rate_sheet', 'sightseeing_rate_sheet', 'transport_rate_sheet', 'package_rate_sheet'
    ];

    if (!empty($requestedDocType) && in_array($requestedDocType, $validDocTypes)) {
        $docType = $requestedDocType;
    } else {
        // Auto-detect from prompt
        if (preg_match('/hotel\s*voucher/i', $text) || (preg_match('/voucher/i', $text) && preg_match('/hotel|room|stay|resort/i', $text))) {
            $docType = 'hotel_voucher';
        } elseif (preg_match('/transfer\s*voucher|cab\s*voucher|vehicle\s*voucher|airport\s*pickup\s*voucher/i', $text)) {
            $docType = 'transfer_voucher';
        } elseif (preg_match('/activity\s*voucher|tour\s*voucher|sightseeing\s*voucher|excursion\s*voucher/i', $text)) {
            $docType = 'activity_voucher';
        } elseif (preg_match('/customer\s*billing|statement\s*of\s*account|soa\b|client\s*billing/i', $text)) {
            $docType = 'customer_billing';
        } elseif (preg_match('/supplier\s*billing|work\s*order|supplier\s*po|b2b\s*po|vendor\s*order/i', $text)) {
            $docType = 'supplier_billing';
        } elseif (preg_match('/proforma/i', $text)) {
            $docType = 'proforma_invoice';
        } elseif (preg_match('/tax\s*invoice|gst\s*invoice|customer\s*invoice|\binvoice\b/i', $text)) {
            $docType = 'customer_invoice';
        } elseif (preg_match('/hotel\s*rate\s*sheet|hotel\s*tariff/i', $text)) {
            $docType = 'hotel_rate_sheet';
        } elseif (preg_match('/sightseeing\s*rate\s*sheet|activity\s*rate\s*sheet|excursion\s*rate/i', $text)) {
            $docType = 'sightseeing_rate_sheet';
        } elseif (preg_match('/transportation\s*rate\s*sheet|transport\s*rate\s*sheet|vehicle\s*rate\s*sheet/i', $text)) {
            $docType = 'transport_rate_sheet';
        } elseif (preg_match('/package\s*rate\s*sheet|tour\s*package\s*rate|pax\s*matrix|rate\s*matrix/i', $text)) {
            $docType = 'package_rate_sheet';
        } elseif (preg_match('/voucher/i', $text)) {
            $docType = 'hotel_voucher';
        }
    }

    // 2. Resolve Destination & Country
    $dest = 'Phuket & Krabi, Thailand';
    $country = 'Thailand';
    $currency = 'USD';
    $usdRate = 87.0;
    $duration = '6 Days / 5 Nights';
    $numDays = 6;
    $numNights = 5;

    $destMap = [
        'thailand' => ['dest' => 'Phuket & Krabi, Thailand', 'country' => 'Thailand', 'currency' => 'USD', 'days' => 6, 'nights' => 5],
        'phuket' => ['dest' => 'Phuket & Krabi, Thailand', 'country' => 'Thailand', 'currency' => 'USD', 'days' => 6, 'nights' => 5],
        'krabi' => ['dest' => 'Phuket & Krabi, Thailand', 'country' => 'Thailand', 'currency' => 'USD', 'days' => 6, 'nights' => 5],
        'pattaya' => ['dest' => 'Pattaya & Tomorrowland Festival, Thailand', 'country' => 'Thailand', 'currency' => 'BOTH', 'days' => 4, 'nights' => 3],
        'tomorrowland' => ['dest' => 'Pattaya & Tomorrowland Festival, Thailand', 'country' => 'Thailand', 'currency' => 'BOTH', 'days' => 4, 'nights' => 3],
        'dubai' => ['dest' => 'Dubai & Abu Dhabi, UAE', 'country' => 'UAE', 'currency' => 'AED', 'days' => 5, 'nights' => 4],
        'uae' => ['dest' => 'Dubai & Abu Dhabi, UAE', 'country' => 'UAE', 'currency' => 'AED', 'days' => 5, 'nights' => 4],
        'bali' => ['dest' => 'Bali & Nusa Penida, Indonesia', 'country' => 'Indonesia', 'currency' => 'INR', 'days' => 6, 'nights' => 5],
        'singapore' => ['dest' => 'Singapore City & Sentosa', 'country' => 'Singapore', 'currency' => 'SGD', 'days' => 5, 'nights' => 4],
        'malaysia' => ['dest' => 'Kuala Lumpur & Genting Highlands, Malaysia', 'country' => 'Malaysia', 'currency' => 'INR', 'days' => 5, 'nights' => 4],
        'vietnam' => ['dest' => 'Da Nang, Hoi An & Hanoi, Vietnam', 'country' => 'Vietnam', 'currency' => 'USD', 'days' => 6, 'nights' => 5],
        'turkey' => ['dest' => 'Istanbul & Cappadocia, Turkey', 'country' => 'Turkey', 'currency' => 'EUR', 'days' => 7, 'nights' => 6],
        'kashmir' => ['dest' => 'Srinagar, Gulmarg & Pahalgam, Kashmir', 'country' => 'India', 'currency' => 'INR', 'days' => 6, 'nights' => 5],
        'rajasthan' => ['dest' => 'Jaipur, Jodhpur & Udaipur, Rajasthan', 'country' => 'India', 'currency' => 'INR', 'days' => 6, 'nights' => 5],
        'maldives' => ['dest' => 'Maldives Luxury Island Atolls', 'country' => 'Maldives', 'currency' => 'USD', 'days' => 5, 'nights' => 4]
    ];

    $destMatched = false;
    if (!empty($requestedDestination)) {
        $rd = strtolower(trim($requestedDestination));
        foreach ($destMap as $key => $info) {
            if (strpos($rd, $key) !== false) {
                $dest = $info['dest'];
                $country = $info['country'];
                $currency = $info['currency'];
                $numDays = $info['days'];
                $numNights = $info['nights'];
                $duration = "{$numDays} Days / {$numNights} Nights";
                $destMatched = true;
                break;
            }
        }
    }

    if (!$destMatched) {
        foreach ($destMap as $key => $info) {
            if (strpos($text, $key) !== false) {
                $dest = $info['dest'];
                $country = $info['country'];
                $currency = $info['currency'];
                $numDays = $info['days'];
                $numNights = $info['nights'];
                $duration = "{$numDays} Days / {$numNights} Nights";
                break;
            }
        }
    }

    // 3. Rate & Pricing Calculation
    $adultCount = 2;
    $childCount = 0;
    $ratePerAdult = 400.00;
    $ratePerChild = 200.00;
    $hotelNightly = 120.00;
    $hotelNights = $numNights;
    $vehicleRate = 140.00;
    $activityRate = 180.00;
    $markupPct = 15.0;
    $taxPct = 5.0;
    $discountAmount = 0.00;

    // Apply explicit user rates if passed
    if (!empty($userRates) && is_array($userRates)) {
        if (!empty($userRates['currency'])) $currency = strtoupper(trim($userRates['currency']));
        if (!empty($userRates['exchangeRate'])) $usdRate = floatval($userRates['exchangeRate']);
        if (isset($userRates['ratePerAdult'])) $ratePerAdult = floatval($userRates['ratePerAdult']);
        if (isset($userRates['adultCount'])) $adultCount = max(1, intval($userRates['adultCount']));
        if (isset($userRates['ratePerChild'])) $ratePerChild = floatval($userRates['ratePerChild']);
        if (isset($userRates['childCount'])) $childCount = max(0, intval($userRates['childCount']));
        if (isset($userRates['hotelNightlyRate'])) $hotelNightly = floatval($userRates['hotelNightlyRate']);
        if (isset($userRates['hotelNights'])) $hotelNights = max(1, intval($userRates['hotelNights']));
        if (isset($userRates['vehicleRate'])) $vehicleRate = floatval($userRates['vehicleRate']);
        if (isset($userRates['activityRate'])) $activityRate = floatval($userRates['activityRate']);
        if (isset($userRates['markupPercent'])) $markupPct = floatval($userRates['markupPercent']);
        if (isset($userRates['taxPercent'])) $taxPct = floatval($userRates['taxPercent']);
        if (isset($userRates['discountAmount'])) $discountAmount = floatval($userRates['discountAmount']);
    } else {
        // Destination default pricing heuristics
        if (strpos($dest, 'Tomorrowland') !== false) {
            $ratePerAdult = 750.00;
            $hotelNightly = 0.00; // Self-booked
            $vehicleRate = 250.00; // 2 Vans
            $activityRate = 500.00; // Full Madness Passes
        } elseif (strpos($dest, 'Maldives') !== false) {
            $ratePerAdult = 840.00;
            $hotelNightly = 450.00;
            $vehicleRate = 280.00; // Speedboat
            $activityRate = 200.00;
        } elseif (strpos($dest, 'Dubai') !== false) {
            $ratePerAdult = 350.00;
            $hotelNightly = 140.00;
            $vehicleRate = 160.00;
            $activityRate = 180.00;
        } elseif (strpos($dest, 'Bali') !== false) {
            $ratePerAdult = 290.00;
            $hotelNightly = 95.00;
            $vehicleRate = 120.00;
            $activityRate = 140.00;
        } elseif (strpos($dest, 'Kashmir') !== false || strpos($dest, 'Rajasthan') !== false) {
            $currency = 'INR';
            $ratePerAdult = 24500.00;
            $hotelNightly = 6500.00;
            $vehicleRate = 14000.00;
            $activityRate = 8500.00;
        }
    }

    // Dynamic prompt modification commands
    $isDoublePrompt = preg_match('/(?:double|200\s*ka\s*400|do\s*guna|doguna|2x)/i', $prompt);
    $hasSpecificDouble = preg_match('/200\s*(?:ka|to)\s*400/i', $prompt);
    $hasDecoration = preg_match('/(?:decoration|decor|flower|room\s*decoration|bed\s*decoration)/i', $prompt);

    if ($hasSpecificDouble) {
        $ratePerAdult = 400.00;
    } elseif ($isDoublePrompt) {
        $ratePerAdult = round($ratePerAdult * 2, 2);
    }

    // Calculate deterministic totals without price hallucination
    $baseSubtotal = ($ratePerAdult * $adultCount) + ($ratePerChild * $childCount);
    $markupAmount = round(($baseSubtotal * $markupPct) / 100, 2);
    $taxableSubtotal = max(0, $baseSubtotal + $markupAmount - $discountAmount);
    $taxAmount = round(($taxableSubtotal * $taxPct) / 100, 2);
    $grandTotal = round($taxableSubtotal + $taxAmount, 2);

    $totalUsd = ($currency === 'INR') ? round($grandTotal / $usdRate, 2) : $grandTotal;
    $totalInr = ($currency === 'INR') ? round($grandTotal) : round($grandTotal * $usdRate);

    // Common Company Details
    $companyData = [
        'name' => "Let's Explore DMC",
        'tagline' => 'Destination Management Company & Travel ERP',
        'address' => 'Suite 402, Royal Palms Business Center, Pune & Bangkok Operations Hub',
        'phone' => '+91 80075 86881 / +91 95459 55966',
        'email' => 'bookings@letsexploredmc.com',
        'website' => 'www.letsexploredmc.com',
        'gstin' => '27AABCL1234F1Z8',
        'hsn' => '998555'
    ];

    $clientData = [
        'name' => 'Valued Guest / Corporate Partner',
        'adults' => $adultCount,
        'children' => $childCount,
        'pax' => "{$adultCount} Adults" . ($childCount > 0 ? ", {$childCount} Children" : ""),
        'contact' => '+91 98765 43210',
        'email' => 'guest@example.com',
        'leadId' => 'LE-LEAD-' . rand(1000, 9999)
    ];

    // Reference generators
    $refBase = date('Ymd') . '-' . rand(100, 999);
    $todayFormatted = date('d M Y');
    $checkInFormatted = date('d M Y', strtotime('+14 days'));
    $checkOutFormatted = date('d M Y', strtotime('+' . (14 + $numNights) . ' days'));

    // Base Common Response Object
    $response = [
        'detectedDocType' => $docType,
        'docType' => $docType,
        'destination' => $dest,
        'country' => $country,
        'duration' => $duration,
        'currency' => $currency,
        'company' => $companyData,
        'client' => $clientData,
        'pricing' => [
            'currency' => $currency,
            'exchangeRate' => $usdRate,
            'ratePerAdult' => $ratePerAdult,
            'adultCount' => $adultCount,
            'ratePerChild' => $ratePerChild,
            'childCount' => $childCount,
            'baseSubtotal' => $baseSubtotal,
            'markupPercent' => $markupPct,
            'markupAmount' => $markupAmount,
            'taxPercent' => $taxPct,
            'taxAmount' => $taxAmount,
            'discountAmount' => $discountAmount,
            'grandTotal' => $grandTotal,
            'totalInr' => $totalInr,
            'totalUsd' => $totalUsd
        ]
    ];

    // =========================================================================
    // TEMPLATE 1: HOTEL VOUCHER
    // =========================================================================
    if ($docType === 'hotel_voucher') {
        $hotelName = "Ashlee Plaza Hotel Patong / GLOW Ao Nang Krabi";
        $roomType = "Superior Deluxe Twin / Double Sharing Room";
        $mealPlan = "Daily International Buffet Breakfast + Dinner Included";

        if (strpos($dest, 'Bali') !== false) {
            $hotelName = "The Kayon Jungle Resort & Ubud Pool Villa";
            $roomType = "Private Pool Villa with Jungle & Valley View";
            $mealPlan = "Daily Breakfast & Afternoon High Tea";
        } elseif (strpos($dest, 'Dubai') !== false) {
            $hotelName = "Grand Millennium Hotel Business Bay Dubai";
            $roomType = "Deluxe King Room with Canal View";
            $mealPlan = "International Buffet Breakfast Included";
        } elseif (strpos($dest, 'Maldives') !== false) {
            $hotelName = "Centara Grand Island Resort & Spa Maldives";
            $roomType = "Sunset Luxury Overwater Villa with Plunge Pool";
            $mealPlan = "All-Inclusive Premium Dine-Around Meal Plan";
        } elseif (strpos($dest, 'Singapore') !== false) {
            $hotelName = "Marina Bay Sands & Orchard Deluxe Hotel";
            $roomType = "Premier King Room with SkyPark Access";
            $mealPlan = "Buffet Breakfast at RISE Restaurant";
        } elseif (strpos($dest, 'Kashmir') !== false) {
            $hotelName = "The Lalit Grand Palace Srinagar & Khyber Gulmarg";
            $roomType = "Heritage Palace Room & Luxury Alpine Cottage";
            $mealPlan = "Buffet Breakfast & Dinner (MAPAI Plan)";
        } elseif (strpos($dest, 'Rajasthan') !== false) {
            $hotelName = "Taj Lake Palace Udaipur & Rambagh Palace Jaipur";
            $roomType = "Luxury Historical Palace Suite";
            $mealPlan = "Royal Heritage Buffet Breakfast & Traditional Dinner";
        }

        $hotelInclusions = [
            "Complimentary high-speed WiFi access throughout hotel property",
            "Welcome drink & cold refreshing towel on arrival",
            "Daily international buffet breakfast at main restaurant",
            "Free access to fitness center, infinity swimming pool & sauna",
            "Complimentary bottled drinking water (2 bottles per room per day)"
        ];
        if ($hasDecoration) {
            array_unshift($hotelInclusions, "Romantic Room & Bed Floral Decoration with Welcome Cake & Exotic Fruit Basket");
        }

        $response['docTitle'] = "Hotel Booking Confirmation Voucher";
        $response['documentSummary'] = "Official confirmed hotel booking voucher for {$clientData['name']} at {$hotelName} ({$dest}).";
        $response['hotelVoucher'] = [
            'voucherNumber' => 'LEDMC-HV-' . $refBase,
            'bookingReference' => 'BK-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $dest), 0, 3)) . '-' . rand(10000, 99999),
            'confirmationCode' => 'CONF-' . rand(10000, 99999) . '-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $hotelName), 0, 4)),
            'status' => 'CONFIRMED & GUARANTEED BY DMC',
            'issueDate' => $todayFormatted,
            'guestName' => $clientData['name'],
            'pax' => $clientData['pax'],
            'hotelName' => $hotelName,
            'hotelAddress' => 'Prime Tourist District, ' . $dest,
            'starRating' => '4★ Deluxe / 5★ Luxury Verified Partner',
            'checkInDate' => $checkInFormatted,
            'checkInTime' => '14:00 hrs',
            'checkOutDate' => $checkOutFormatted,
            'checkOutTime' => '12:00 hrs',
            'nights' => $numNights,
            'roomsCount' => 1,
            'roomType' => $roomType,
            'mealPlan' => $mealPlan,
            'inclusions' => $hotelInclusions,
            'specialRequests' => 'Non-smoking high floor room, King size bed requested.' . ($hasDecoration ? ' Romantic room decoration setup confirmed.' : ''),
            'supplierContact' => [
                'groundDmc' => "Let's Explore DMC On-Ground Concierge",
                'emergencyHelpline' => '+91 80075 86881 / +91 95459 55966',
                'hotelFrontDesk' => '+66 76 123 456'
            ],
            'voucherTerms' => [
                'Please present this original voucher along with valid government photo IDs or passports at check-in.',
                'Incidental charges (minibar, laundry, room service) are not included and must be settled directly at checkout.',
                'Early check-in and late checkout are strictly subject to hotel room availability on arrival.',
                'Non-amendable within 72 hours of scheduled check-in date.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 2: TRANSFER VOUCHER
    // =========================================================================
    if ($docType === 'transfer_voucher') {
        $vehicleType = "Toyota Commuter VIP Luxury Van (Air-Conditioned)";
        $pickupLoc = "International Airport Arrival Terminal - Exit Gate 4";
        $dropLoc = "Hotel & Resort Front Lobby, {$dest}";
        $flightDetails = "Flight EK-501 (Scheduled Arrival 14:30)";

        if (strpos($dest, 'Thailand') !== false) {
            $pickupLoc = "Phuket International Airport (HKT) / Suvarnabhumi Airport (BKK) - Gate 3";
            $vehicleType = "Toyota Commuter VIP 10-Seater Air-Conditioned Van";
        } elseif (strpos($dest, 'Dubai') !== false) {
            $pickupLoc = "Dubai International Airport (DXB) Terminal 3 - Chauffeur Meeting Point";
            $vehicleType = "Luxury AC Sedan / GMC Yukon Executive SUV";
        } elseif (strpos($dest, 'Bali') !== false) {
            $pickupLoc = "Ngurah Rai International Airport (DPS) Denpasar - Arrival Hall";
            $vehicleType = "Toyota Innova Reborn AC Private Vehicle";
        } elseif (strpos($dest, 'Maldives') !== false) {
            $pickupLoc = "Velana International Airport (MLE) Malé - Counter 14";
            $dropLoc = "Island Resort Jetty / Overwater Villa Pavilion";
            $vehicleType = "Twin-Engine Luxury Enclosed Speedboat";
            $flightDetails = "Trans-Maldivian Scheduled Speedboat Transfer";
        }

        $response['docTitle'] = "Private Airport & Inter-City Transfer Voucher";
        $response['documentSummary'] = "Official confirmed transfer voucher for {$clientData['name']} in {$dest}.";
        $response['transferVoucher'] = [
            'voucherNumber' => 'LEDMC-TV-' . $refBase,
            'bookingReference' => 'TR-' . rand(10000, 99999),
            'status' => 'CONFIRMED',
            'issueDate' => $todayFormatted,
            'guestName' => $clientData['name'],
            'pax' => $clientData['pax'],
            'serviceType' => 'Private Roundtrip Airport Arrival & Inter-Hotel Transfer',
            'pickupDate' => $checkInFormatted,
            'pickupTime' => '14:30 hrs (or flight arrival landing time)',
            'pickupLocation' => $pickupLoc,
            'dropLocation' => $dropLoc,
            'flightTrainDetails' => $flightDetails,
            'vehicleType' => $vehicleType,
            'vehiclePlate' => 'DMC-' . rand(100, 999) . '-VIP',
            'driverName' => 'Tariq Al-Mansoor / Somchai Prasert (Assigned Chauffeur)',
            'driverPhone' => '+91 80075 86881 (24x7 Driver Dispatch)',
            'luggageAllowance' => '1 Standard Large Suitcase (up to 25kg) + 1 Hand Cabin Bag per passenger',
            'meetingInstructions' => "Our uniformed representative will be stationed at the arrival exit holding a personalized placard displaying '{$clientData['name']} / Let's Explore DMC'. In case of flight delays, chauffeur will wait up to 90 minutes post touchdown free of charge.",
            'emergencyHelpline' => '+91 80075 86881 / +91 95459 55966'
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 3: ACTIVITY VOUCHER
    // =========================================================================
    if ($docType === 'activity_voucher') {
        $activityName = "Phi Phi Island, Maya Bay & Pileh Lagoon Speedboat Tour with Buffet Lunch";
        $operator = "Andaman Wave Master & Let's Explore DMC Ground Team";
        $pickupTime = "07:30 AM - 08:00 AM (Hotel Lobby Pick-up)";
        $highlights = [
            "Speedboat cruise through Maya Bay & Emerald Pileh Lagoon",
            "Snorkeling stop at Khai Island with vibrant marine life",
            "Buffet lunch served at beachside restaurant",
            "National Park entrance admission fees (NPF) included"
        ];

        if (strpos($dest, 'Dubai') !== false) {
            $activityName = "Premium 4x4 Desert Safari with Dune Bashing, Camel Ride & BBQ Dinner";
            $operator = "DMC Emirates Desert Adventures";
            $pickupTime = "02:45 PM - 03:15 PM";
            $highlights = ["Thrilling 4x4 dune bashing across Red Sand Dunes", "Camel riding & sandboarding experience", "Live Tanoura dance, fire show & belly dance", "Lavish international buffet BBQ dinner with soft drinks"];
        } elseif (strpos($dest, 'Bali') !== false) {
            $activityName = "Full Day Nusa Penida Island Speedboat Tour & West Coast Exploration";
            $operator = "Bali Ocean Fast Cruises & DMC Operations";
            $pickupTime = "06:45 AM - 07:15 AM";
            $highlights = ["Iconic Kelingking T-Rex cliff viewpoint & Broken Beach", "Natural infinity pool Angel's Billabong", "Crystal Bay beach relaxation & snorkeling", "Indonesian set lunch with mineral water included"];
        } elseif (strpos($dest, 'Singapore') !== false) {
            $activityName = "Universal Studios Singapore One-Day Pass & Sentosa Cable Car Sky Pass";
            $operator = "Resorts World Sentosa & Singapore Cable Car";
            $pickupTime = "09:30 AM (Self-Guided / Private Drop)";
            $highlights = ["Full day unlimited access to all 6 themed zones", "Battlestar Galactica & Transformers Ride 3D", "Roundtrip Mount Faber & Sentosa Line cable car scenic aerial views"];
        } elseif (strpos($dest, 'Maldives') !== false) {
            $activityName = "Guided House Reef Snorkeling Safari & Sunset Dolphin Cruise on Wooden Dhoni";
            $operator = "Resort Marine Biology Center & DMC Island Team";
            $pickupTime = "04:30 PM (Dive Center Jetty)";
            $highlights = ["Guided coral reef snorkeling with sea turtles & rays", "Complimentary snorkel, mask & fins gear included", "Traditional wooden Dhoni boat cruise at golden sunset", "Chilled refreshments & fruit skewers served on board"];
        }

        $response['docTitle'] = "Excursion & Tour Activity Confirmation Voucher";
        $response['documentSummary'] = "Official confirmed activity voucher for {$activityName} ({$dest}).";
        $response['activityVoucher'] = [
            'voucherNumber' => 'LEDMC-AV-' . $refBase,
            'bookingReference' => 'ACT-' . rand(10000, 99999),
            'ticketBarcode' => 'BARCODE-' . rand(10000000, 99999999),
            'status' => 'CONFIRMED PASS',
            'issueDate' => $todayFormatted,
            'guestName' => $clientData['name'],
            'pax' => $clientData['pax'],
            'activityName' => $activityName,
            'operator' => $operator,
            'activityDate' => date('d M Y', strtotime('+16 days')),
            'pickupTime' => $pickupTime,
            'meetingPoint' => 'Hotel Front Lobby / Concierge Standby',
            'duration' => 'Approx. 7–8 Hours (Full Day)',
            'highlights' => $highlights,
            'inclusions' => [
                'Roundtrip hotel transfers in shared air-conditioned vehicle',
                'All activity admissions, entry tickets & national park fees',
                'English-speaking certified excursion guide & safety instructor',
                'Complimentary lunch and mineral water as per itinerary',
                'Comprehensive destination passenger safety insurance'
            ],
            'whatToBring' => [
                'Comfortable lightweight swimwear & dry change of clothes',
                'Sunscreen lotion, UV sunglasses & beach towel',
                'Waterproof pouch for mobile phones & cameras',
                'Small pocket cash for personal souvenirs or gratuities'
            ],
            'cancellationPolicy' => 'Free cancellation up to 48 hours prior to departure. Non-refundable within 24 hours of excursion commencement.'
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 4: CUSTOMER BILLING (STATEMENT OF ACCOUNT)
    // =========================================================================
    if ($docType === 'customer_billing') {
        $soaTotal = $grandTotal;
        $paidPortion = round($soaTotal * 0.5);
        $duePortion = $soaTotal - $paidPortion;

        $response['docTitle'] = "Customer Statement of Account & Billing";
        $response['documentSummary'] = "Statement of Account and payment ledger for {$clientData['name']} ({$dest}).";
        $response['billing'] = [
            'statementNumber' => 'LEDMC-SOA-' . $refBase,
            'statementDate' => $todayFormatted,
            'clientName' => $clientData['name'],
            'accountNumber' => 'ACC-CL-' . rand(1000, 9999),
            'destination' => $dest,
            'currency' => $currency,
            'transactions' => [
                [
                    'date' => date('d M Y', strtotime('-5 days')),
                    'description' => "Initial Tour Package Booking Contract — {$dest} ({$duration})",
                    'reference' => 'QTN-LEDMC-9941',
                    'debit' => $soaTotal,
                    'credit' => 0.00,
                    'balance' => $soaTotal
                ],
                [
                    'date' => date('d M Y', strtotime('-2 days')),
                    'description' => "Advance Deposit Received (50% Booking Confirmation via Bank Wire)",
                    'reference' => 'TXN-BANK-88214',
                    'debit' => 0.00,
                    'credit' => $paidPortion,
                    'balance' => $duePortion
                ]
            ],
            'subtotal' => $baseSubtotal,
            'markup' => $markupAmount,
            'tax' => $taxAmount,
            'totalBilled' => $soaTotal,
            'totalPaid' => $paidPortion,
            'balanceDue' => $duePortion,
            'paymentDueDate' => date('d M Y', strtotime('+10 days')),
            'bankDetails' => [
                'bankName' => 'HDFC Bank Ltd',
                'accountName' => "Let's Explore DMC India Pvt Ltd",
                'accountNumber' => '50200088912345',
                'ifscCode' => 'HDFC0001234',
                'branch' => 'Senapati Bapat Road, Pune',
                'swiftCode' => 'HDFCINBBXXX'
            ],
            'terms' => [
                'Please quote the Statement Number on your bank transfer remittance advice.',
                'Outstanding balance must be settled 15 days before the tour departure date.',
                'Interest at 1.5% per month applicable on delayed commercial accounts.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 5: SUPPLIER BILLING (WORK ORDER / PURCHASE ORDER)
    // =========================================================================
    if ($docType === 'supplier_billing') {
        $supplierName = "Siam Ground Services Co. Ltd. (Thailand Hub)";
        $supplierCurr = 'THB';
        if (strpos($dest, 'Dubai') !== false) {
            $supplierName = "Arabian Gate Tourism LLC (Dubai Dmc Partner)";
            $supplierCurr = 'AED';
        } elseif (strpos($dest, 'Bali') !== false) {
            $supplierName = "PT Bali Excursions & Chauffeur Services (Indonesia)";
            $supplierCurr = 'USD';
        }

        $grossSupplierCost = round($baseSubtotal * 0.85, 2);
        $contractDiscount = round($grossSupplierCost * 0.05, 2);
        $netPayable = round($grossSupplierCost - $contractDiscount, 2);

        $response['docTitle'] = "Supplier Work Order & Contracted B2B PO";
        $response['documentSummary'] = "Official Work Order / B2B PO issued to {$supplierName} for {$dest}.";
        $response['supplierBilling'] = [
            'workOrderNumber' => 'LEDMC-WO-' . $refBase,
            'poReference' => 'PO-SUPP-' . date('Y') . '-' . rand(1000, 9999),
            'issueDate' => $todayFormatted,
            'supplierName' => $supplierName,
            'supplierAddress' => 'Commercial Ground District, ' . $dest,
            'contactPerson' => 'Operations Manager',
            'emergencyPhone' => '+66 2 987 6543',
            'email' => 'partners@siamground.com',
            'destination' => $dest,
            'currency' => $supplierCurr,
            'contractedServices' => [
                [
                    'serviceDate' => $checkInFormatted,
                    'serviceName' => "Private Airport Meet & Greet + Arrival Transfer ({$clientData['pax']})",
                    'unitRate' => round($grossSupplierCost * 0.2, 2),
                    'qty' => 1,
                    'totalNet' => round($grossSupplierCost * 0.2, 2)
                ],
                [
                    'serviceDate' => date('d M Y', strtotime('+15 days')),
                    'serviceName' => "Full-Day Destination Guided Sightseeing Excursion + Admissions",
                    'unitRate' => round($grossSupplierCost * 0.5, 2),
                    'qty' => 1,
                    'totalNet' => round($grossSupplierCost * 0.5, 2)
                ],
                [
                    'serviceDate' => $checkOutFormatted,
                    'serviceName' => "Hotel Check-out to Airport Private Departure Drop Transfer",
                    'unitRate' => round($grossSupplierCost * 0.3, 2),
                    'qty' => 1,
                    'totalNet' => round($grossSupplierCost * 0.3, 2)
                ]
            ],
            'grossContractedAmount' => $grossSupplierCost,
            'b2bPartnerDiscount' => $contractDiscount,
            'netPayableToSupplier' => $netPayable,
            'settlementDueDate' => date('d M Y', strtotime('+30 days')),
            'paymentTerms' => 'Net 30 Days upon physical voucher submission and trip completion sign-off by guest.',
            'specialInstructions' => 'All vehicles must be pristine clean, air-conditioned, with bottled water provided. English-speaking guide required.'
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 6: CUSTOMER INVOICE (TAX INVOICE)
    // =========================================================================
    if ($docType === 'customer_invoice') {
        $invTotal = ($currency === 'INR') ? $grandTotal : $totalInr;
        $invSubtotal = round($invTotal / 1.05, 2);
        $invGst = round($invTotal - $invSubtotal, 2);
        $cgst = round($invGst / 2, 2);
        $sgst = round($invGst / 2, 2);

        $response['docTitle'] = "Commercial Tax Invoice (GST 5%)";
        $response['documentSummary'] = "Official GST Tax Invoice for {$clientData['name']} ({$dest}).";
        $response['invoice'] = [
            'invoiceNumber' => 'LEDMC-INV-' . date('Ymd') . '-' . rand(100, 999),
            'invoiceDate' => $todayFormatted,
            'dueDate' => date('d M Y', strtotime('+7 days')),
            'hsnSac' => '998555',
            'placeOfSupply' => 'Maharashtra (27) / International Tour Operations',
            'billTo' => [
                'name' => $clientData['name'],
                'phone' => $clientData['contact'],
                'email' => $clientData['email'],
                'address' => 'Customer Address on File',
                'gstin' => 'Unregistered / Retail Consumer'
            ],
            'lineItems' => [
                [
                    'item' => 1,
                    'description' => "Complete Luxury Tour Package — {$dest} ({$duration})",
                    'hsn' => '998555',
                    'qty' => 1,
                    'rate' => $invSubtotal,
                    'taxableAmount' => $invSubtotal,
                    'gstRate' => '5%',
                    'gstAmount' => $invGst,
                    'total' => $invTotal
                ]
            ],
            'subtotal' => $invSubtotal,
            'cgst' => $cgst,
            'sgst' => $sgst,
            'igst' => 0.00,
            'grandTotal' => $invTotal,
            'amountInWords' => 'INR ' . number_format($invTotal) . ' Only',
            'paymentStatus' => 'PARTIALLY PAID / PENDING SETTLEMENT',
            'bankDetails' => [
                'bankName' => 'HDFC Bank Ltd',
                'accountName' => "Let's Explore DMC India Pvt Ltd",
                'accountNumber' => '50200088912345',
                'ifscCode' => 'HDFC0001234',
                'branch' => 'Senapati Bapat Road, Pune',
                'upiId' => 'letsexplore@hdfcbank'
            ],
            'terms' => [
                'Invoice issued under Tour Operators HSN 998555 subject to 5% GST without Input Tax Credit (ITC).',
                'All disputes subject to Pune jurisdiction.',
                'Subject to Let\'s Explore DMC standard booking terms and cancellation policies.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 7: PROFORMA INVOICE
    // =========================================================================
    if ($docType === 'proforma_invoice') {
        $advDeposit = round($grandTotal * 0.5, 2);
        $finalBalance = round($grandTotal - $advDeposit, 2);

        $response['docTitle'] = "Proforma Invoice (Advance Estimate)";
        $response['documentSummary'] = "Proforma advance booking estimate for {$clientData['name']} ({$dest}).";
        $response['proformaInvoice'] = [
            'proformaNumber' => 'LEDMC-PI-' . date('Ymd') . '-' . rand(100, 999),
            'issueDate' => $todayFormatted,
            'validUntil' => date('d M Y', strtotime('+14 days')),
            'billTo' => $clientData,
            'destination' => $dest,
            'currency' => $currency,
            'servicesBreakdown' => [
                ['name' => "Land Package Tour & Guided Transfers ({$duration})", 'amount' => round($baseSubtotal * 0.45, 2)],
                ['name' => "Luxury Accommodation & Daily Dining ({$numNights} Nights)", 'amount' => round($baseSubtotal * 0.45, 2)],
                ['name' => "Admission Tickets, Excursions & Destination Fees", 'amount' => round($baseSubtotal * 0.10, 2)]
            ],
            'subtotal' => $baseSubtotal,
            'markup' => $markupAmount,
            'tax' => $taxAmount,
            'totalEstimate' => $grandTotal,
            'paymentSchedule' => [
                [
                    'milestone' => 'Milestone 1 — 50% Advance Deposit',
                    'dueDate' => 'Upon Booking Confirmation',
                    'amount' => $advDeposit,
                    'status' => 'PAYMENT DUE'
                ],
                [
                    'milestone' => 'Milestone 2 — 50% Final Settlement',
                    'dueDate' => '15 Days Prior to Tour Departure',
                    'amount' => $finalBalance,
                    'status' => 'SCHEDULED'
                ]
            ],
            'terms' => [
                'This Proforma Invoice is an estimate and does not constitute a final tax invoice.',
                'Hotel room blocks and contracted tour rates are held for 14 days from issue date.',
                'Foreign exchange conversion rates are locked strictly upon receipt of the 50% advance deposit.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 8: HOTEL RATE SHEET
    // =========================================================================
    if ($docType === 'hotel_rate_sheet') {
        $rateCurr = ($country === 'India') ? 'INR' : (($country === 'UAE') ? 'AED' : 'USD');
        $multiplier = ($rateCurr === 'INR') ? 75 : (($rateCurr === 'AED') ? 3.67 : 1);

        $properties = [
            [
                'hotelName' => 'Ashlee Plaza Patong / Welcome Plaza',
                'starRating' => '4★ Deluxe',
                'roomCategory' => 'Superior Double / Twin Room',
                'mealPlan' => 'Bed & Breakfast (CP)',
                'lowSeasonRate' => round(65 * $multiplier),
                'highSeasonRate' => round(95 * $multiplier),
                'peakSeasonRate' => round(140 * $multiplier),
                'extraBedRate' => round(30 * $multiplier),
                'childNoBed' => round(15 * $multiplier)
            ],
            [
                'hotelName' => 'GLOW Ao Nang Krabi Resort',
                'starRating' => '4★ Deluxe Resort',
                'roomCategory' => 'Deluxe Pool View Room',
                'mealPlan' => 'Breakfast & Dinner (MAP)',
                'lowSeasonRate' => round(85 * $multiplier),
                'highSeasonRate' => round(125 * $multiplier),
                'peakSeasonRate' => round(180 * $multiplier),
                'extraBedRate' => round(40 * $multiplier),
                'childNoBed' => round(20 * $multiplier)
            ],
            [
                'hotelName' => 'The Kayon Jungle Resort & Pool Villas',
                'starRating' => '5★ Luxury Boutique',
                'roomCategory' => 'Jungle Private Pool Villa',
                'mealPlan' => 'Breakfast + High Tea Included',
                'lowSeasonRate' => round(280 * $multiplier),
                'highSeasonRate' => round(360 * $multiplier),
                'peakSeasonRate' => round(480 * $multiplier),
                'extraBedRate' => round(85 * $multiplier),
                'childNoBed' => 0
            ],
            [
                'hotelName' => 'Grand Millennium Business Bay Dubai',
                'starRating' => '5★ Deluxe City Hotel',
                'roomCategory' => 'Canal View King Room',
                'mealPlan' => 'International Buffet Breakfast',
                'lowSeasonRate' => round(130 * $multiplier),
                'highSeasonRate' => round(210 * $multiplier),
                'peakSeasonRate' => round(320 * $multiplier),
                'extraBedRate' => round(50 * $multiplier),
                'childNoBed' => round(25 * $multiplier)
            ]
        ];

        $response['docTitle'] = "Contracted Hotel Tariff & Seasonal Rate Sheet";
        $response['documentSummary'] = "B2B Contracted hotel seasonal tariffs for {$dest} (2026–2027 Season).";
        $response['hotelRateSheet'] = [
            'sheetTitle' => "Official B2B Contracted Hotel Tariffs — {$dest}",
            'destination' => $dest,
            'currency' => $rateCurr,
            'validityPeriod' => '01 Nov 2026 – 31 Oct 2027',
            'properties' => $properties,
            'policyNotes' => [
                'Low Season: May to September | High Season: October to April | Peak Season: Dec 20 to Jan 10.',
                'Rates are quoted per room per night on double sharing basis inclusive of applicable service charges and VAT.',
                'Mandatory Christmas Eve (Dec 24) & New Year Eve (Dec 31) Gala Dinner surcharges apply.',
                'Tourism Dirham (Dubai) / Green Tax (Maldives) to be paid directly by guests at checkout if applicable.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 9: SIGHTSEEING RATE SHEET
    // =========================================================================
    if ($docType === 'sightseeing_rate_sheet') {
        $rateCurr = ($country === 'India') ? 'INR' : 'USD';
        $m = ($rateCurr === 'INR') ? 85 : 1;

        $tours = [
            [
                'tourName' => 'Phi Phi & Maya Bay Speedboat Tour + NPF',
                'duration' => 'Full Day (8 hrs)',
                'sicAdult' => round(45 * $m),
                'sicChild' => round(32 * $m),
                'pvtVehicle' => round(280 * $m),
                'inclusions' => 'Buffet lunch, snorkeling gear, National Park Fees, guide',
                'operatingDays' => 'Daily'
            ],
            [
                'tourName' => 'James Bond Island Big Boat Tour & Sea Canoe',
                'duration' => 'Full Day (8 hrs)',
                'sicAdult' => round(42 * $m),
                'sicChild' => round(30 * $m),
                'pvtVehicle' => round(260 * $m),
                'inclusions' => 'Lunch on board, sea canoe paddler, admission ticket',
                'operatingDays' => 'Daily'
            ],
            [
                'tourName' => 'Nusa Penida West Coast Island Excursion',
                'duration' => 'Full Day (9 hrs)',
                'sicAdult' => round(55 * $m),
                'sicChild' => round(38 * $m),
                'pvtVehicle' => round(290 * $m),
                'inclusions' => 'Fastboat return ticket, AC island car, lunch, retributions',
                'operatingDays' => 'Daily'
            ],
            [
                'tourName' => 'Dubai 4x4 Desert Safari with BBQ Dinner',
                'duration' => 'Evening (6 hrs)',
                'sicAdult' => round(38 * $m),
                'sicChild' => round(26 * $m),
                'pvtVehicle' => round(220 * $m),
                'inclusions' => 'Dune bashing, camel ride, shows, BBQ dinner buffet',
                'operatingDays' => 'Daily'
            ],
            [
                'tourName' => 'City Landmarks & Cultural Highlights Tour',
                'duration' => 'Half Day (4 hrs)',
                'sicAdult' => round(22 * $m),
                'sicChild' => round(15 * $m),
                'pvtVehicle' => round(120 * $m),
                'inclusions' => 'Private AC transport, licensed English guide, photo stops',
                'operatingDays' => 'Daily'
            ]
        ];

        $response['docTitle'] = "Sightseeing & Excursions B2B Tariff Sheet";
        $response['documentSummary'] = "Structured B2B rate sheet for attractions and guided excursions in {$dest}.";
        $response['sightseeingRateSheet'] = [
            'sheetTitle' => "Sightseeing & Excursion Net B2B Rates — {$dest}",
            'destination' => $dest,
            'currency' => $rateCurr,
            'validityPeriod' => '2026–2027 Contract Year',
            'tours' => $tours,
            'policyNotes' => [
                'SIC rates apply per person; Private vehicle rates apply per vehicle (1–6 pax).',
                'Child age defined as 3–10 years; infants under 3 years complimentary without seat.',
                'National Park Fee (NPF) included in all quoted sea excursion rates.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 10: TRANSPORTATION RATE SHEET
    // =========================================================================
    if ($docType === 'transport_rate_sheet') {
        $rateCurr = ($country === 'India') ? 'INR' : 'USD';
        $m = ($rateCurr === 'INR') ? 85 : 1;

        $routes = [
            [
                'route' => 'Airport to Central City / Beach Hotel (One Way)',
                'sedanRate' => round(28 * $m),
                'suvRate' => round(38 * $m),
                'vanRate' => round(48 * $m),
                'minicoachRate' => round(95 * $m),
                'fuelTollsIncluded' => 'Yes',
                'extraHour' => round(10 * $m)
            ],
            [
                'route' => 'Hotel to Airport Departure Drop (One Way)',
                'sedanRate' => round(26 * $m),
                'suvRate' => round(35 * $m),
                'vanRate' => round(45 * $m),
                'minicoachRate' => round(90 * $m),
                'fuelTollsIncluded' => 'Yes',
                'extraHour' => round(10 * $m)
            ],
            [
                'route' => 'Full Day (8 Hours / 80 Km) City Disposal with Chauffeur',
                'sedanRate' => round(65 * $m),
                'suvRate' => round(85 * $m),
                'vanRate' => round(110 * $m),
                'minicoachRate' => round(195 * $m),
                'fuelTollsIncluded' => 'Yes',
                'extraHour' => round(12 * $m)
            ],
            [
                'route' => 'Inter-City Scenic Transfer (e.g. Phuket to Krabi / Dubai to Abu Dhabi)',
                'sedanRate' => round(85 * $m),
                'suvRate' => round(110 * $m),
                'vanRate' => round(145 * $m),
                'minicoachRate' => round(250 * $m),
                'fuelTollsIncluded' => 'Yes',
                'extraHour' => round(14 * $m)
            ]
        ];

        $response['docTitle'] = "Chauffeur & Transportation Vehicle Tariff Sheet";
        $response['documentSummary'] = "Dedicated transport and vehicle rate sheet for {$dest}.";
        $response['transportRateSheet'] = [
            'sheetTitle' => "Official Chauffeur & Vehicle Tariff Matrix — {$dest}",
            'destination' => $dest,
            'currency' => $rateCurr,
            'routes' => $routes,
            'policyNotes' => [
                'Vehicle capacities: Sedan (1-3 Pax + 2 Bags), SUV (1-4 Pax + 4 Bags), Van (1-10 Pax + 8 Bags), Minicoach (11-20 Pax).',
                'All rates include air-conditioned vehicle, fuel, highway tolls, parking fees, and driver allowance.',
                'Night surcharge of 20% applicable for services scheduled between 23:00 hrs and 06:00 hrs.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 11: PACKAGE RATE SHEET (PAX MATRIX)
    // =========================================================================
    if ($docType === 'package_rate_sheet') {
        $rateCurr = ($country === 'India') ? 'INR' : 'USD';
        $m = ($rateCurr === 'INR') ? 85 : 1;

        $tiers = [
            [
                'tierName' => '3★ Deluxe Category (Budget Friendly)',
                'sampleHotels' => 'Ibis Styles / Holiday Inn Express / Standard Deluxe',
                'pax2Rate' => round(320 * $m),
                'pax4Rate' => round(275 * $m),
                'pax6Rate' => round(240 * $m),
                'pax10Plus' => round(210 * $m),
                'singleSupp' => round(110 * $m),
                'childWithBed' => round(180 * $m),
                'childNoBed' => round(115 * $m)
            ],
            [
                'tierName' => '4★ Premium Category (Best Value - Most Popular)',
                'sampleHotels' => 'Ashlee Plaza Patong / GLOW Ao Nang / Novotel',
                'pax2Rate' => round(420 * $m),
                'pax4Rate' => round(360 * $m),
                'pax6Rate' => round(320 * $m),
                'pax10Plus' => round(280 * $m),
                'singleSupp' => round(160 * $m),
                'childWithBed' => round(240 * $m),
                'childNoBed' => round(150 * $m)
            ],
            [
                'tierName' => '5★ Luxury Pool Villa / Ultra-Deluxe Category',
                'sampleHotels' => 'The Kayon Jungle / Banyan Tree / Atlantis The Palm',
                'pax2Rate' => round(850 * $m),
                'pax4Rate' => round(740 * $m),
                'pax6Rate' => round(660 * $m),
                'pax10Plus' => round(590 * $m),
                'singleSupp' => round(380 * $m),
                'childWithBed' => round(480 * $m),
                'childNoBed' => round(290 * $m)
            ]
        ];

        $response['docTitle'] = "Complete Tour Package Master Tariff Matrix";
        $response['documentSummary'] = "Multi-tier package rate matrix across group sizes for {$dest}.";
        $response['packageRateSheet'] = [
            'sheetTitle' => "Master Tour Package Rate Matrix ({$duration}) — {$dest}",
            'destination' => $dest,
            'duration' => $duration,
            'currency' => $rateCurr,
            'tiers' => $tiers,
            'matrixNotes' => [
                'Rates are quoted per person on twin/double sharing basis.',
                'Rates include hotel stay with daily breakfast, private arrival/departure transfers, and signature guided excursions.',
                'Single supplement represents additional cost for solo single-occupancy room.',
                'Group rates for 10+ pax include dedicated group tour escort and private 20-seater minicoach.'
            ]
        ];
        return $response;
    }

    // =========================================================================
    // TEMPLATE 12: TRAVEL QUOTATION (MASTER COMMERCIAL PROPOSAL)
    // =========================================================================
    $pkgTitle = "{$duration} Luxury {$dest} Escape";
    if ($hasDecoration) {
        $pkgTitle .= " (with Romantic Room & Bed Decoration)";
    }

    $days = [];
    for ($i = 1; $i <= $numDays; $i++) {
        if ($i === 1) {
            $days[] = [
                'day' => 1,
                'title' => "Arrival in {$dest} & Private Hotel Check-in",
                'description' => "Welcome to {$dest}! Upon arrival at the international airport, meet our private representative who will transfer you in an AC vehicle to your luxury hotel. Complete check-in formalities, unwind, and enjoy evening leisure.",
                'meals' => 'Dinner Included',
                'hotel' => "Luxury Resort / Villa",
                'activities' => ['Airport Meet & Greet', 'Private AC Transfer', 'Evening Leisure']
            ];
        } elseif ($i === $numDays) {
            $days[] = [
                'day' => $numDays,
                'title' => "Breakfast & Private Airport Departure Transfer",
                'description' => "Relish a hearty breakfast at the hotel. Spend morning hours souvenir shopping or relaxing by the pool. Check out and transfer in a private vehicle to the airport for your onward flight with wonderful memories of {$dest}.",
                'meals' => 'Breakfast Included',
                'hotel' => 'Check-out',
                'activities' => ['Buffet Breakfast', 'Souvenir Shopping', 'Airport Drop Transfer']
            ];
        } else {
            $days[] = [
                'day' => $i,
                'title' => "Day {$i}: {$dest} Signature Highlights & Cultural Excursion",
                'description' => "After breakfast, embark on a full-day guided exploration covering premier landmarks, scenic viewpoints, local markets, and signature attractions. Includes private transfers and entry admissions.",
                'meals' => 'Breakfast & Lunch Included',
                'hotel' => "Luxury Resort / Villa",
                'activities' => ['Signature Sightseeing', 'Private English-speaking Guide', 'Photo Stops']
            ];
        }
    }

    // Destination-specific itineraries
    if (strpos($dest, 'Phuket') !== false || strpos($dest, 'Krabi') !== false) {
        $days = [
            ['day' => 1, 'title' => "Phuket Airport to Ashlee Plaza Hotel – Private Transfer", 'description' => "Arrival at Phuket International Airport. Private meet & greet by Let's Explore DMC representative. Private transfer to Ashlee Plaza Hotel. Evening leisure & buffet dinner.", 'meals' => 'Buffet Dinner Included', 'hotel' => 'Ashlee Plaza Hotel Patong', 'activities' => ['Airport Meet & Greet', 'Private AC Transfer']],
            ['day' => 2, 'title' => "Phi Phi Island + Maya Bay + Pileh Lagoon by Speedboat", 'description' => "Full day sea tour by modern speedboat. Explore Maya Bay, Pileh Lagoon, Viking Cave, and Khai Island for snorkeling. Includes buffet lunch & National Park Fees (NPF).", 'meals' => 'Breakfast, Lunch & Dinner', 'hotel' => 'Ashlee Plaza Hotel Patong', 'activities' => ['Speedboat Cruise', 'Maya Bay', 'Snorkeling & NPF Included']],
            ['day' => 3, 'title' => "James Bond Island & Phang Nga Bay by Big Boat", 'description' => "Cruise Phang Nga Bay by Big Boat. Sea canoeing with private paddler through limestone caves. Visit famous Koh Tapu (James Bond Island) with lunch on board.", 'meals' => 'Breakfast, Lunch & Dinner', 'hotel' => 'Ashlee Plaza Hotel Patong', 'activities' => ['Phang Nga Cruise', 'Sea Canoe', 'James Bond Island']],
            ['day' => 4, 'title' => "Phuket to Krabi Inter-Province Transfer + Krabi City Tour", 'description' => "Check out from Phuket. Private scenic transfer to Krabi. En route 8-hour Krabi City Tour covering Tiger Cave Temple (Wat Tham Suea) and Krabi River. Check-in to GLOW Ao Nang.", 'meals' => 'Breakfast & Buffet Dinner', 'hotel' => 'GLOW Ao Nang Krabi', 'activities' => ['Phuket to Krabi Transfer', 'Krabi City Tour', 'Tiger Cave Temple']],
            ['day' => 5, 'title' => "Krabi 4 Islands Tour by Traditional Long Tail Boat", 'description' => "Traditional long tail boat tour across Krabi's 4 islands: Phra Nang Cave, Tup Island sandbar walk, Chicken Island snorkeling, and Poda Island with beach picnic lunch.", 'meals' => 'Breakfast, Lunch & Dinner', 'hotel' => 'GLOW Ao Nang Krabi', 'activities' => ['4 Islands Tour', 'Talay Waek Sandbar Walk', 'Snorkeling & NPF Included']],
            ['day' => 6, 'title' => "Krabi to Phuket Airport Departure Transfer", 'description' => "Buffet breakfast at hotel. Morning souvenir shopping in Ao Nang. Private departure transfer by car to Phuket Airport for flight departure.", 'meals' => 'Breakfast Included', 'hotel' => 'Check-out & Airport Drop', 'activities' => ['Buffet Breakfast', 'Return Airport Transfer']]
        ];
    } elseif (strpos($dest, 'Bali') !== false) {
        $days[0]['title'] = "Arrival in Bali & Private Transfer to Ubud Pool Villa";
        $days[1]['title'] = "Ubud Art Village, Kintamani Volcano & Famous Jungle Swing";
        $days[2]['title'] = "Full Day Nusa Penida Island Speedboat Tour & West Coast";
        $days[3]['title'] = "Ubud to Seminyak Transfer via Tanah Lot Sunset Temple";
        if ($numDays >= 5) $days[4]['title'] = "Uluwatu Sunset Cliff Temple & Fire Dance";
    } elseif (strpos($dest, 'Dubai') !== false) {
        $days[0]['title'] = "Arrival in Dubai & Luxury Marina Dhow Cruise Dinner";
        $days[1]['title'] = "Half Day Dubai City Tour & Burj Khalifa 124th Floor Observation Deck";
        $days[2]['title'] = "Leisure Morning & Premium 4x4 Desert Safari with BBQ Dinner";
        if ($numDays >= 4) $days[3]['title'] = "Full Day Abu Dhabi City Tour & Sheikh Zayed Grand Mosque";
    }

    $inclusions = [
        "Private airport arrival and departure transfers in air-conditioned vehicle",
        "{$numNights} Nights accommodation in verified 4★ / 5★ luxury property",
        "Daily buffet breakfast at all hotels; buffet dinners as specified",
        "All sightseeing tours with dedicated English-speaking driver/guide",
        "Entry tickets and admission passes for all mentioned attractions",
        "All government taxes, toll charges, parking, and driver allowances",
        "24x7 On-ground destination concierge support from Let's Explore DMC"
    ];

    if ($hasDecoration) {
        array_unshift($inclusions, "Romantic Room & Bed Floral Decoration with Welcome Cake & Special Honeymoon Amenities");
    }

    $exclusions = [
        "International / Domestic flight tickets",
        "Tourist visa fees (available on request)",
        "Personal expenses (laundry, telephone, minibar, spa treatments)",
        "Travel insurance coverage (recommended)",
        "Tipping and gratuities for guides and drivers"
    ];

    $summaryItems = [
        [
            'name' => "Land Package (Hotels + Transfers + Tours + Meals) for {$clientData['pax']}" . ($hasDecoration ? ' [WITH ROOM DECORATION]' : ''),
            'amountUSD' => $totalUsd,
            'amountINR' => $totalInr
        ]
    ];

    $response['docTitle'] = "Master Travel Quotation & Detailed Itinerary";
    $response['documentSummary'] = "{$duration} bespoke {$dest} travel package crafted by Let's Explore DMC.";
    $response['package'] = [
        'title' => $pkgTitle,
        'destination' => $dest,
        'destinations' => $dest,
        'duration' => $duration,
        'clientName' => $clientData['name'],
        'guestCount' => $adultCount,
        'pax' => $clientData['pax'],
        'currency' => $currency,
        'usdRate' => $usdRate,
        'priceInr' => $totalInr,
        'priceUsd' => $totalUsd,
        'ratePerAdultUsd' => round($totalUsd / max(1, $adultCount), 2),
        'isDecorationIncluded' => !empty($hasDecoration)
    ];
    $response['days'] = $days;
    $response['hotels'] = [
        [
            'city' => explode(',', $dest)[0],
            'hotelName' => (strpos($dest, 'Phuket') !== false ? 'Ashlee Plaza Patong & GLOW Ao Nang' : 'Grand Luxury 5-Star Hotel & Resort'),
            'roomType' => 'Superior / Deluxe Pool View Room',
            'nights' => $numNights,
            'mealPlan' => 'Daily Buffet Breakfast Included',
            'rating' => '4★ / 5★ Deluxe'
        ]
    ];
    $response['summary'] = [
        'items' => $summaryItems,
        'inclusions' => $inclusions,
        'exclusions' => $exclusions,
        'terms' => [
            "Package rates are per person on double-sharing occupancy.",
            "Rates are subject to availability at the time of final booking confirmation.",
            "50% advance deposit required for booking; balance due 15 days before travel.",
            "Cancellations 30+ days prior: full refund minus administrative fee."
        ],
        'totalINR' => $totalInr,
        'totalUSD' => $totalUsd
    ];
    $response['isDecorationIncluded'] = !empty($hasDecoration);

    return $response;
}
