import urllib.request
import urllib.error
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Test Live POST to inquiry-admin/api/login.php
login_url = "https://pdf.letsexploredmc.com/inquiry-admin/api/login.php"
payload = json.dumps({"username": "admin", "password": "LETSEXPLOREDMC"}).encode('utf-8')
req = urllib.request.Request(
    login_url,
    data=payload,
    headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DMC-Verification-Bot/2.0'
    }
)

print("--- Testing Live cPanel Login POST ---")
try:
    with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
        body = resp.read().decode('utf-8')
        print(f"Status: {resp.getcode()} OK")
        print(f"Response: {body}")
except urllib.error.HTTPError as e:
    err = e.read().decode('utf-8') if e.fp else ''
    print(f"HTTP {e.code}: {err}")
except Exception as ex:
    print(f"Error: {ex}")

# 2. Test Live POST to api/ai.php
ai_url = "https://pdf.letsexploredmc.com/api/ai.php"
ai_payload = json.dumps({"prompt": "Hello test ping", "provider": "claude"}).encode('utf-8')
req_ai = urllib.request.Request(
    ai_url,
    data=ai_payload,
    headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DMC-Verification-Bot/2.0'
    }
)

print("\n--- Testing Live cPanel AI Endpoint POST ---")
try:
    with urllib.request.urlopen(req_ai, context=ctx, timeout=12) as resp:
        body = resp.read().decode('utf-8')
        print(f"Status: {resp.getcode()} OK")
        print(f"Response: {body[:300]}")
except urllib.error.HTTPError as e:
    err = e.read().decode('utf-8') if e.fp else ''
    print(f"HTTP {e.code}: {err}")
except Exception as ex:
    print(f"Error: {ex}")

