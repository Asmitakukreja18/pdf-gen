import urllib.request
import urllib.error
import ssl
import json
import time

urls = [
    ("Homepage Root", "https://pdf.letsexploredmc.com/"),
    ("Gateway Page", "https://pdf.letsexploredmc.com/index.html"),
    ("Admin Dashboard", "https://pdf.letsexploredmc.com/inquiry-admin/dashboard.html"),
    ("Admin Login API", "https://pdf.letsexploredmc.com/inquiry-admin/api/login.php"),
    ("AI Endpoint", "https://pdf.letsexploredmc.com/api/ai.php"),
    ("Save Quotation API", "https://pdf.letsexploredmc.com/api/save_quotation.php"),
    ("Quotation Studio", "https://pdf.letsexploredmc.com/studio.html")
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

results = []

print("=== VERIFYING DEPLOYED CPANEL SUBDOMAIN: https://pdf.letsexploredmc.com/ ===\n")

for label, url in urls:
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DMC-Verification-Bot/2.0'}
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
            elapsed = round((time.time() - t0) * 1000, 2)
            code = resp.getcode()
            headers = dict(resp.getheaders())
            sample = resp.read(500).decode('utf-8', errors='ignore')
            print(f"[PASS] {label} -> {url}")
            print(f"       Status: {code} OK | Response Time: {elapsed}ms | Server: {headers.get('server', 'N/A')}")
            print(f"       Snippet: {sample[:120].strip().replace(chr(10), ' ')}")
            results.append({
                'label': label,
                'url': url,
                'status': code,
                'time_ms': elapsed,
                'server': headers.get('server', 'cPanel/LiteSpeed/Apache'),
                'success': True
            })
    except urllib.error.HTTPError as e:
        elapsed = round((time.time() - t0) * 1000, 2)
        err_sample = e.read(300).decode('utf-8', errors='ignore') if e.fp else ''
        print(f"[HTTP {e.code}] {label} -> {url} (Time: {elapsed}ms)")
        print(f"       Response: {err_sample[:120].strip().replace(chr(10), ' ')}")
        results.append({
            'label': label,
            'url': url,
            'status': e.code,
            'time_ms': elapsed,
            'error': str(e),
            'success': (e.code in [401, 403, 405]) # Expected for some APIs when unauthenticated/GET
        })
    except Exception as ex:
        elapsed = round((time.time() - t0) * 1000, 2)
        print(f"[ERROR] {label} -> {url}: {ex} (Time: {elapsed}ms)")
        results.append({
            'label': label,
            'url': url,
            'status': 'CONN_FAIL',
            'time_ms': elapsed,
            'error': str(ex),
            'success': False
        })
    print("-" * 75)

print("\nSummary of Live cPanel Subdomain Verification:")
for r in results:
    status_str = "PASS" if r['success'] else "FAIL/BLOCKED"
    print(f" - {r['label']}: Status {r.get('status')} [{status_str}]")

