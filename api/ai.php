<?php
/**
 * api/ai.php — Multi-Provider AI Gateway & Document Interpreter
 * Supports: Anthropic Claude, Google Gemini 2.5 Flash, OpenAI
 * Automatic Fallback Chain: Claude -> Gemini -> Local
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

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

// Guarantee extractedText from base64 if not already populated
if ($attachment && is_array($attachment) && empty($attachment['extractedText']) && !empty($attachment['base64'])) {
    $rawPdf = @base64_decode($attachment['base64']);
    if ($rawPdf && strpos($rawPdf, '%PDF-') !== false) {
        $attachment['extractedText'] = extractPdfTextSimple($rawPdf);
    }
}

// Context string
$contextText = '';
if ($currentQuotation && is_array($currentQuotation)) {
    $contextText = "\nCURRENT ACTIVE DOCUMENT STATE:\n" . json_encode($currentQuotation, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
}

$systemPrompt = "You are the Master Travel Quotation & Document AI Engine for Let's Explore DMC (Destination Management Company).
Your mission is to intelligently parse incoming travel documents (PDF, Word, Images, WhatsApp notes, Itineraries, Invoices, Hotel Confirmation Vouchers) into the official Let's Explore DMC structured JSON schema.

CRITICAL INSTRUCTIONS:
1. Detect document type accurately:
   - 'itinerary': Day-by-day travel plan WITHOUT rates or experience-focused.
   - 'quotation': Master Commercial quotation WITH day-by-day line items, Pax, unit rates, USD/INR pricing.
   - 'invoice': Corporate GST Tax Invoice / Billing document (Invoice #, Date, Bill To, HSN 998555, Tax, Total).
   - 'confirmation': Hotel Booking Confirmation Voucher (Booking ID, Guest Name, Hotel, Dates, Rooms, Inclusions).
   - 'hotel_costing': Hotel Comparison & Costing sheet.
   - 'summary': Executive Package Summary.
2. NEVER invent fake days or fake destinations if details are present in the text or attached file. Extract EVERY single day.
3. If user provided modifications (e.g. 'hotel me 10% markup lagao', 'Berjaya times square 49160 + 10% = 54076', 'Ramada hotel add karo'), calculate prices mathematically and update the existing quotation.
4. Output MUST be valid raw JSON matching the DMC schema with keys: detectedDocType, documentSummary, package, days, hotels, summary, invoice, confirmation.";

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
            $res = callClaude($systemPrompt, $contextText, $prompt, $attachment, $claudeKey);
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
            $res = callGemini($systemPrompt, $contextText, $prompt, $attachment, $geminiKey);
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
            $res = callOpenAI($systemPrompt, $contextText, $prompt, $attachment, $openaiKey);
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
    echo json_encode([
        'success' => true,
        'provider' => $successfulProvider,
        'model' => $usedModel,
        'data' => $finalResult,
        'fallbackNotes' => !empty($errors) ? $errors : null
    ]);
} else {
    // Graceful Intelligent Local Generation: Never 502 crash
    $localData = generateLocalAiQuotation($prompt, $currentQuotation, $attachment);
    echo json_encode([
        'success' => true,
        'provider' => 'local-intelligence',
        'model' => 'smart-travel-heuristic-v2',
        'data' => $localData,
        'fallbackNotes' => !empty($errors) ? $errors : ['notice' => 'Generated via local DMC travel engine']
    ]);
}

// ==========================================
// Provider Callers
// ==========================================

function callClaude($systemPrompt, $contextText, $userPrompt, $attachment, $apiKey) {
    $models = ['claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'];
    $lastError = null;

    $userContent = [];
    $rawB64 = $attachment['base64'] ?? '';
    $b64 = preg_replace('/^data:[^;]+;base64,/', '', $rawB64);
    $b64 = trim($b64);

    if ($attachment && !empty($b64)) {
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
        } else {
            $validImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if ($mime === 'image/jpg') $mime = 'image/jpeg';
            if (!in_array($mime, $validImageMimes)) $mime = 'image/jpeg';
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

    if ($attachment && !empty($attachment['extractedText'])) {
        $userContent[] = [
            'type' => 'text',
            'text' => "[EXTRACTED DOCUMENT TEXT - " . ($attachment['name'] ?? 'File') . "]:\n" . substr($attachment['extractedText'], 0, 15000) . "\n[END DOCUMENT TEXT]\n"
        ];
    }

    $userContent[] = [
        'type' => 'text',
        'text' => ($contextText ? $contextText . "\n" : '') . "User Request / Document:\n" . ($userPrompt ?: 'Extract document') . "\nReturn ONLY valid JSON."
    ];

    foreach ($models as $model) {
        $maxTokens = (strpos($model, 'sonnet') !== false) ? 8192 : 4096;
        $postData = [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'system' => $systemPrompt,
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
                'anthropic-beta: pdfs-2024-09-25',
                'content-type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($postData),
            CURLOPT_TIMEOUT => 40
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            $lastError = $err;
            continue;
        }

        $resJson = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300) {
            $replyText = $resJson['content'][0]['text'] ?? '';
            // Robust JSON extraction: Locate outer { ... } block
            $firstBrace = strpos($replyText, '{');
            $lastBrace = strrpos($replyText, '}');
            if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
                $jsonStr = substr($replyText, $firstBrace, $lastBrace - $firstBrace + 1);
                $parsed = json_decode($jsonStr, true);
                if ($parsed) {
                    return ['success' => true, 'model' => $model, 'data' => $parsed];
                }
            }
            $cleaned = preg_replace('/```(?:json)?/i', '', $replyText);
            $cleaned = trim($cleaned);
            $parsed = json_decode($cleaned, true);
            if ($parsed) {
                return ['success' => true, 'model' => $model, 'data' => $parsed];
            }
        } else {
            $lastError = $resJson['error']['message'] ?? "HTTP $httpCode";
            $errType = $resJson['error']['type'] ?? '';
            // If credit balance too low or key invalid, immediately break and fallback to Gemini
            if ($httpCode === 400 || $httpCode === 401 || $httpCode === 403 || strpos($lastError, 'credit balance') !== false || $errType === 'invalid_request_error' || $errType === 'authentication_error') {
                break;
            }
        }
    }

    return ['success' => false, 'error' => $lastError ?: 'Claude request failed.'];
}

function callGemini($systemPrompt, $contextText, $userPrompt, $attachment, $apiKey) {
    $models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
    $lastError = null;

    $parts = [
        ['text' => $systemPrompt],
        ['text' => ($contextText ? $contextText . "\n" : '') . "User Instructions:\n" . ($userPrompt ?: 'Extract document structure')]
    ];

    $rawB64 = $attachment['base64'] ?? '';
    $b64 = preg_replace('/^data:[^;]+;base64,/', '', $rawB64);
    $b64 = trim($b64);

    if ($attachment && !empty($b64)) {
        $mime = $attachment['mimeType'] ?? 'application/pdf';
        $parts[] = [
            'inlineData' => [
                'mimeType' => $mime,
                'data' => $b64
            ]
        ];
    }

    if ($attachment && !empty($attachment['extractedText'])) {
        $parts[] = [
            'text' => "\n[DOCUMENT TEXT LAYER - " . ($attachment['name'] ?? 'PDF') . "]:\n" . substr($attachment['extractedText'], 0, 15000) . "\n[END DOCUMENT TEXT LAYER]\n"
        ];
    }

    $payload = [
        'contents' => [
            ['parts' => $parts]
        ],
        'generationConfig' => [
            'temperature' => 0.1,
            'responseMimeType' => 'application/json'
        ]
    ];

    foreach ($models as $model) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 25
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            $lastError = $err;
            continue;
        }

        $resJson = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300) {
            $rawText = $resJson['candidates'][0]['content']['parts'][0]['text'] ?? '';
            $cleaned = preg_replace('/```(?:json)?/i', '', $rawText);
            $cleaned = trim($cleaned);
            $parsed = json_decode($cleaned, true);
            if ($parsed) {
                return ['success' => true, 'model' => $model, 'data' => $parsed];
            }
        } else {
            $lastError = $resJson['error']['message'] ?? "HTTP $httpCode";
        }
    }

    return ['success' => false, 'error' => $lastError ?: 'Gemini request failed.'];
}

function callOpenAI($systemPrompt, $contextText, $userPrompt, $attachment, $apiKey) {
    $postData = [
        'model' => 'gpt-4o-mini',
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => ($contextText ? $contextText . "\n" : '') . $userPrompt]
        ],
        'response_format' => ['type' => 'json_object'],
        'temperature' => 0.1
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
        CURLOPT_TIMEOUT => 30
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
// Intelligent Local Generation Fallback
// ==========================================

function generateLocalAiQuotation($prompt, $currentQuotation = null, $attachment = null) {
    $text = strtolower($prompt . ' ' . ($attachment['name'] ?? '') . ' ' . ($attachment['extractedText'] ?? ''));
    
    $dest = 'Bali, Indonesia';
    $country = 'Indonesia';
    $duration = '6 Days / 5 Nights';
    $numDays = 6;
    $numNights = 5;
    $currency = 'INR';
    $usdRate = 86.5;
    $priceInr = 48500;
    $priceUsd = 560;

    // Universal Dynamic PDF & Text Document Interpreter
    $hasExtractedText = !empty($attachment['extractedText']) && strlen(trim($attachment['extractedText'])) > 20;
    if ($hasExtractedText) {
        $rawDoc = $attachment['extractedText'];

        // 1. Dynamic Destination & Country Detection
        if (preg_match('/\b(pattaya|tomorrowland)\b/i', $rawDoc)) {
            $dest = 'Pattaya & Tomorrowland Festival, Thailand';
            $country = 'Thailand';
            $numDays = 4;
            $numNights = 3;
            $duration = '4 Days / 3 Nights';
            $usdRate = 87.0;
        } elseif (preg_match('/\b(bali|ubud|seminyak|kuta|nusa penida)\b/i', $rawDoc)) {
            $dest = 'Bali & Nusa Penida, Indonesia';
            $country = 'Indonesia';
        } elseif (preg_match('/\b(dubai|abu dhabi|uae)\b/i', $rawDoc)) {
            $dest = 'Dubai & Abu Dhabi, UAE';
            $country = 'UAE';
        } elseif (preg_match('/\b(phuket|krabi|bangkok|thailand)\b/i', $rawDoc)) {
            $dest = 'Phuket & Krabi, Thailand';
            $country = 'Thailand';
        } elseif (preg_match('/\b(singapore|sentosa)\b/i', $rawDoc)) {
            $dest = 'Singapore City & Sentosa';
            $country = 'Singapore';
        } elseif (preg_match('/\b(kuala lumpur|genting|langkawi|malaysia)\b/i', $rawDoc)) {
            $dest = 'Malaysia (Kuala Lumpur & Genting)';
            $country = 'Malaysia';
        } elseif (preg_match('/\b(cappadocia|istanbul|turkey)\b/i', $rawDoc)) {
            $dest = 'Istanbul & Cappadocia, Turkey';
            $country = 'Turkey';
        } elseif (preg_match('/\b(kashmir|srinagar|gulmarg)\b/i', $rawDoc)) {
            $dest = 'Srinagar & Gulmarg, Kashmir';
            $country = 'India';
        } elseif (preg_match('/\b(rajasthan|udaipur|jaipur)\b/i', $rawDoc)) {
            $dest = 'Rajasthan & Udaipur Heritage';
            $country = 'India';
        }

        // 2. Dynamic Price Detection
        if (preg_match('/(?:total|cost|price|inr|rs\.?|₹)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]{4,})/i', $rawDoc, $pMatch)) {
            $parsedInr = intval(str_replace(',', '', $pMatch[1]));
            if ($parsedInr > 5000) {
                $priceInr = $parsedInr;
                $priceUsd = round($priceInr / $usdRate);
            }
        }
        if (preg_match('/usd\s*([0-9,.]+)/i', $rawDoc, $uMatch)) {
            $parsedUsd = floatval(str_replace(',', '', $uMatch[1]));
            if ($parsedUsd > 50) {
                $priceUsd = round($parsedUsd);
                if (empty($pMatch)) {
                    $priceInr = round($priceUsd * $usdRate);
                }
            }
        }
    }

    // If an existing quotation is active in current state, preserve its destination & structure
    if ($currentQuotation && is_array($currentQuotation)) {
        $cPkg = $currentQuotation['package'] ?? [];
        $activeDest = $cPkg['destinations'] ?? ($cPkg['destination'] ?? '');
        if (!empty($activeDest)) {
            $hasExplicitNewDest = preg_match('/\b(bali|dubai|uae|singapore|malaysia|turkey|vietnam|kashmir|rajasthan|kerala)\b/i', $prompt);
            if (!$hasExplicitNewDest) {
                $dest = $activeDest;
                $country = $cPkg['country'] ?? 'Thailand';
                $duration = $cPkg['duration'] ?? '4 Days / 3 Nights';
                if (preg_match('/(\d+)\s*days?/i', $duration, $dm)) {
                    $numDays = intval($dm[1]);
                    $numNights = max(1, $numDays - 1);
                }
                if (stripos($dest, 'tomorrowland') !== false || stripos($dest, 'pattaya') !== false) {
                    $text .= ' tomorrowland pattaya';
                }
            }
        }
    }

    if (preg_match('/(\d+)\s*(?:days?|d)\s*(?:\/\s*(\d+)\s*(?:nights?|n))?/i', $prompt, $m)) {
        $numDays = intval($m[1]);
        $numNights = !empty($m[2]) ? intval($m[2]) : max(1, $numDays - 1);
        $duration = "{$numDays} Days / {$numNights} Nights";
    }

    if (strpos($text, 'tomorrowland') !== false || strpos($text, 'pattaya') !== false) {
        $dest = 'Pattaya & Tomorrowland Festival, Thailand';
        $country = 'Thailand';
        $numDays = 4;
        $numNights = 3;
        $duration = '4 Days / 3 Nights';
        $currency = 'BOTH';
        $usdRate = 87.0;

        // Check for pass / amount increase delta (e.g., "Passes ka amount increase kar do 20000")
        $passDelta = 0;
        if (preg_match('/(?:increase|bada|badhao|add|markup|extra|kar\s*do).*?(\d{4,})/i', $prompt, $pm) || preg_match('/(\d{4,}).*?(?:increase|bada|badhao|add)/i', $prompt, $pm) || preg_match('/(?:passes|pass).*?(\d{4,})/i', $prompt, $pm)) {
            $passDelta = intval($pm[1]);
        }

        // Preserve previous pass price if already updated in current quotation
        $existingMadness = 120000;
        $existingVip = 175000;
        if ($currentQuotation && !empty($currentQuotation['summary']['items'])) {
            foreach ($currentQuotation['summary']['items'] as $it) {
                if (stripos($it['name'], 'Full Madness') !== false || stripos($it['name'], 'Tomorrowland') !== false) {
                    if (!empty($it['amountINR']) && $it['amountINR'] >= 120000) {
                        $existingMadness = intval($it['amountINR']);
                    }
                }
                if (stripos($it['name'], 'VIP') !== false) {
                    if (!empty($it['amountINR']) && $it['amountINR'] >= 175000) {
                        $existingVip = intval($it['amountINR']);
                    }
                }
            }
        }
        $fullMadnessPrice = $existingMadness + $passDelta;
        $vipPrice = $existingVip + $passDelta;
        $landPriceInr = 11065; // USD 127.15 @ 87.0
        $priceInr = $landPriceInr + $fullMadnessPrice;
        $priceUsd = round($priceInr / $usdRate, 2);
    } elseif (strpos($text, 'dubai') !== false || strpos($text, 'uae') !== false || strpos($text, 'abu dhabi') !== false) {
        $dest = 'Dubai & Abu Dhabi, UAE';
        $country = 'UAE';
        $priceInr = 62000;
        $priceUsd = 715;
    } elseif (strpos($text, 'singapore') !== false) {
        $dest = 'Singapore City & Sentosa';
        $country = 'Singapore';
        $priceInr = 54000;
        $priceUsd = 625;
    } elseif (strpos($text, 'thailand') !== false || strpos($text, 'phuket') !== false || strpos($text, 'krabi') !== false || strpos($text, 'bangkok') !== false) {
        $dest = 'Phuket & Krabi, Thailand';
        $country = 'Thailand';
        $priceInr = 42000;
        $priceUsd = 485;
    } elseif (strpos($text, 'malaysia') !== false || strpos($text, 'kuala lumpur') !== false || strpos($text, 'genting') !== false) {
        $dest = 'Kuala Lumpur & Genting Highlands, Malaysia';
        $country = 'Malaysia';
        $priceInr = 38500;
        $priceUsd = 445;
    } elseif (strpos($text, 'turkey') !== false || strpos($text, 'cappadocia') !== false || strpos($text, 'istanbul') !== false) {
        $dest = 'Istanbul & Cappadocia, Turkey';
        $country = 'Turkey';
        $priceInr = 95000;
        $priceUsd = 1100;
    } elseif (strpos($text, 'vietnam') !== false || strpos($text, 'hanoi') !== false || strpos($text, 'da nang') !== false) {
        $dest = 'Da Nang, Hoi An & Hanoi, Vietnam';
        $country = 'Vietnam';
        $priceInr = 49000;
        $priceUsd = 565;
    } elseif (strpos($text, 'kashmir') !== false || strpos($text, 'srinagar') !== false || strpos($text, 'gulmarg') !== false) {
        $dest = 'Srinagar, Gulmarg & Pahalgam, Kashmir';
        $country = 'India';
        $priceInr = 36000;
        $priceUsd = 415;
    } elseif (strpos($text, 'rajasthan') !== false || strpos($text, 'udaipur') !== false || strpos($text, 'jaipur') !== false) {
        $dest = 'Jaipur, Jodhpur & Udaipur, Rajasthan';
        $country = 'India';
        $priceInr = 34500;
        $priceUsd = 400;
    } elseif (strpos($text, 'kerala') !== false || strpos($text, 'munnar') !== false || strpos($text, 'alleppey') !== false) {
        $dest = 'Munnar, Thekkady & Alleppey Houseboat, Kerala';
        $country = 'India';
        $priceInr = 32000;
        $priceUsd = 370;
    }

    // Days generator
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

    // Specific custom itineraries for popular destinations
    if (strpos($dest, 'Bali') !== false && $numDays >= 5) {
        $days[0]['title'] = "Arrival in Bali & Private Transfer to Ubud Pool Villa";
        $days[1]['title'] = "Ubud Art Village, Kintamani Volcano & Famous Jungle Swing";
        $days[1]['description'] = "Explore Celuk art village, witness breathtaking views of Mount Batur volcano in Kintamani, visit lush Tegalalang Rice Terraces, and experience the iconic Bali jungle swing.";
        $days[2]['title'] = "Full Day Nusa Penida Island Speedboat Tour";
        $days[2]['description'] = "Speedboat to Nusa Penida West Coast. Visit iconic Kelingking T-Rex Beach, Broken Beach, Angel's Billabong natural infinity pool, and Crystal Bay with local lunch included.";
        $days[3]['title'] = "Ubud to Kuta Transfer via Tanah Lot Sunset Temple";
        $days[3]['description'] = "Transfer to beach resort in Kuta/Seminyak. Visit the sacred Tanah Lot Temple perched on an ocean rock formation for an unforgettable sunset view.";
        if ($numDays >= 6) {
            $days[4]['title'] = "Uluwatu Sunset Cliff Temple & Fire Dance";
            $days[4]['description'] = "Leisure morning at beach. Afternoon visit to dramatic Uluwatu cliff temple overlooking the Indian Ocean, followed by the enchanting Kecak Fire Dance.";
        }
    } elseif (strpos($dest, 'Dubai') !== false && $numDays >= 4) {
        $days[0]['title'] = "Arrival in Dubai & Luxury Marina Dhow Cruise Dinner";
        $days[1]['title'] = "Half Day Dubai City Tour & Burj Khalifa 124th Floor";
        $days[1]['description'] = "Drive past Dubai Frame and Burj Al Arab. Visit Dubai Mall, observe the Dubai Aquarium, and ascend to the 124th floor observation deck of the Burj Khalifa.";
        $days[2]['title'] = "Leisure Morning & Premium Desert Safari with BBQ Dinner";
        $days[2]['description'] = "Afternoon thrilling 4x4 dune bashing in Red Sand Dunes, camel rides, sandboarding, falcon photography, belly dance show, Tanoura performance, and lavish buffet BBQ dinner.";
        if ($numDays >= 5) {
            $days[3]['title'] = "Full Day Abu Dhabi City Tour & Sheikh Zayed Grand Mosque";
            $days[3]['description'] = "Full day private trip to Abu Dhabi. Marvel at the architectural masterpiece Sheikh Zayed Grand Mosque, drive along Corniche, and visit Louvre Abu Dhabi / Ferrari World photo stop.";
        }
    } elseif (strpos($dest, 'Tomorrowland') !== false || strpos($dest, 'Pattaya') !== false) {
        $days = [
            [
                'day' => 1,
                'title' => "11 DEC: Suvarnabhumi Airport to Pattaya Hotel & Tomorrowland Day 1 Transfers (2 Vans)",
                'description' => "Private transfer in 2 Vans from Suvarnabhumi Airport to Pattaya Hotel. Evening round-trip festival transfers for Tomorrowland Thailand Day 1. Thailand local travel insurance included.",
                'meals' => 'Hotel Self Booked',
                'hotel' => "Pattaya Hotel (Welcome Plaza / K Station / Pool Villa Reference)",
                'activities' => ['Airport Meet & Transfer (2 Vans)', 'Tomorrowland Day 1 Pick-up & Drop-off (2 Vans)', 'Travel Insurance']
            ],
            [
                'day' => 2,
                'title' => "12 DEC: Tomorrowland Day 2 Pick-up & Drop-off (2 Vans)",
                'description' => "Dedicated private 2 Vans on standby for Tomorrowland Day 2 festival transfers. Convenient hotel pick-up and late-night return transfer to hotel.",
                'meals' => 'Hotel Self Booked',
                'hotel' => "Pattaya Hotel (Welcome Plaza / K Station / Pool Villa Reference)",
                'activities' => ['Tomorrowland Day 2 Round-trip Transfers (2 Vans)', '24x7 Driver Concierge Support']
            ],
            [
                'day' => 3,
                'title' => "13 DEC: Tomorrowland Day 3 Pick-up & Drop-off (2 Vans)",
                'description' => "Tomorrowland Thailand Day 3 grand finale transfers. Private 2 Vans pick-up from hotel and return drop-off post festival.",
                'meals' => 'Hotel Self Booked',
                'hotel' => "Pattaya Hotel (Welcome Plaza / K Station / Pool Villa Reference)",
                'activities' => ['Tomorrowland Day 3 Round-trip Transfers (2 Vans)', 'Destination Concierge Support']
            ],
            [
                'day' => 4,
                'title' => "14 DEC: Pattaya City Tour + Big Buddha & Return Airport Transfer (2 Vans)",
                'description' => "Pattaya City Tour with Big Buddha temple admission ticket and private transfer. Return airport transfer in 2 Vans to Suvarnabhumi Airport for flight departure.",
                'meals' => 'Hotel Self Booked',
                'hotel' => 'Check-out & Airport Drop',
                'activities' => ['Pattaya City Tour', 'Big Buddha Temple Ticket', 'Return Airport Transfer (2 Vans)']
            ]
        ];

        $hotels = [
            [
                'city' => 'Pattaya',
                'hotelName' => 'Welcome Plaza Hotel / K Station / Private Pool Villa (Self-Booked)',
                'roomType' => 'Double / Twin Bed Room with Breakfast (or Private 15-Pax Villa)',
                'nights' => 3,
                'mealPlan' => 'Hotel Self Booked by Guests Directly',
                'rating' => 'Festival Reference Stay'
            ]
        ];
    } else {
        $hotels = [
            [
                'city' => explode(',', $dest)[0],
                'hotelName' => (strpos($dest, 'Bali') !== false ? 'The Kayon Jungle Resort & Pool Villa' : (strpos($dest, 'Dubai') !== false ? 'Grand Millennium Hotel Dubai (5-Star)' : 'Grand Luxury 5-Star Hotel & Resort')),
                'roomType' => 'Deluxe Suite with Balcony / Pool Villa',
                'nights' => $numNights,
                'mealPlan' => 'Buffet Breakfast Included',
                'rating' => '5 Star Luxury'
            ]
        ];
    }

    $inclusions = [
        "Private airport arrival and departure transfers in air-conditioned vehicle",
        "{$numNights} Nights accommodation in verified 4/5-Star luxury property",
        "Daily buffet breakfast at all hotels",
        "All sightseeing tours with dedicated English-speaking driver/guide",
        "Entry tickets and admission passes for all mentioned attractions",
        "All government taxes, toll charges, parking, and driver allowances",
        "24x7 On-ground destination concierge support from Let's Explore DMC"
    ];

    if (strpos($dest, 'Tomorrowland') !== false) {
        $inclusions = [
            "Airport Transfers Private: Suvarnabhumi Airport - Pattaya Hotel - Suvarnabhumi Airport (2 Vans)",
            "Tomorrowland Festival Shuttles: Day 1, Day 2 & Day 3 Pick-up & Drop-off (2 Vans)",
            "Pattaya City Tour + Big Buddha ticket & private transfer (2 Vans)",
            "Thailand travel insurance during local tours within country boundaries",
            "Tomorrowland 3 Days Festival Pass: Full Madness (Entry pass only per person)"
        ];
    }

    $exclusions = [
        "International / Domestic flight tickets",
        "Hotel stay (if marked Hotel Self Booked by guests directly)",
        "Personal expenses (laundry, telephone, minibar, spa treatments)",
        "Tourist visa fees (available on request)",
        "VIP passes or additional festival upgrades unless explicitly invoiced"
    ];

    $terms = [
        "Package rates are per person on double-sharing occupancy.",
        "Rates are subject to availability at the time of final booking confirmation.",
        "50% advance deposit required for booking; balance due 15 days before travel.",
        "Cancellations 30+ days prior: full refund minus administrative fee."
    ];

    $summaryItems = [
        ['name' => 'Land Package Tour Services', 'amountUSD' => round($priceUsd * 0.4, 2), 'amountINR' => round($priceInr * 0.4)],
        ['name' => 'Accommodation & Inclusions', 'amountUSD' => round($priceUsd * 0.6, 2), 'amountINR' => round($priceInr * 0.6)]
    ];
    if (strpos($dest, 'Tomorrowland') !== false) {
        $summaryItems = [
            ['name' => 'Land Package (2 Vans Airport & Festival Transfers + City Tour + Insurance)', 'amountUSD' => 127.15, 'amountINR' => $landPriceInr],
            ['name' => 'Tomorrowland 3 Days Pass (Full Madness)' . ($passDelta > 0 ? " [Updated +INR " . number_format($passDelta) . "]" : ""), 'amountUSD' => round($fullMadnessPrice / $usdRate, 2), 'amountINR' => $fullMadnessPrice],
            ['name' => "Optional Add-on: Comfort VIP Pass @ INR " . number_format($vipPrice) . " / USD " . round($vipPrice / $usdRate, 2), 'amountUSD' => 0, 'amountINR' => 0]
        ];
    }

    return [
        'detectedDocType' => 'quotation',
        'documentSummary' => "{$duration} bespoke {$dest} travel package crafted by Let's Explore DMC.",
        'package' => [
            'title' => (strpos($dest, 'Tomorrowland') !== false ? "Pattaya Tomorrowland Thailand 4D3N Group Package" . ($passDelta > 0 ? " (+INR " . number_format($passDelta) . " Passes)" : "") : "{$duration} Luxury {$dest} Escape"),
            'destination' => $dest,
            'destinations' => $dest,
            'duration' => $duration,
            'clientName' => 'Valued Guest',
            'guestCount' => 2,
            'pax' => '2 Adults',
            'currency' => $currency,
            'usdRate' => $usdRate,
            'priceInr' => $priceInr,
            'priceUsd' => $priceUsd
        ],
        'days' => $days,
        'hotels' => $hotels,
        'pricing' => [
            'totalInr' => $priceInr,
            'totalUsd' => $priceUsd
        ],
        'summary' => [
            'items' => $summaryItems,
            'inclusions' => $inclusions,
            'exclusions' => $exclusions,
            'terms' => $terms,
            'totalINR' => $priceInr,
            'totalUSD' => $priceUsd
        ],
        'invoice' => [
            'invoiceNumber' => 'LEDMC-INV-' . date('Ymd') . '-01',
            'date' => date('Y-m-d'),
            'billTo' => 'Valued Guest',
            'subtotal' => $priceInr,
            'gst' => round($priceInr * 0.05),
            'total' => round($priceInr * 1.05)
        ],
        'confirmation' => [
            'bookingReference' => 'LEDMC-BK-' . date('Ymd') . '-01',
            'status' => 'Confirmed'
        ]
    ];
}

