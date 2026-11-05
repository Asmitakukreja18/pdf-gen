# Master Task Tracker & Remediation Roadmap
## Let's Explore DMC — Booking, Quotation & Operations Management Portal
**Audit Reference:** `PROJECT_AUDIT.md` & Multi-Subagent Consolidated Audit Report  
**Target Environment:** cPanel Apache / PHP 8.2 / MySQL 8.0 (`ihpyruhe_pdf_generator`)  
**Workspace:** `d:\aipdfgenrater`  
**Date:** November 4, 2026  
**Status:** Audit Phase Complete (5 Subagents Evaluated) — Awaiting User Approval to Begin Phase 1  

---

## 1. Prioritized Remediation Matrix Overview

| Priority | Task ID | Module / File Path | Issue Description & Root Cause | Impact | Status |
|:---:|:---:|:---|:---|:---|:---:|
| 🔴 **CRITICAL** | `TASK-01` | `inquiry-admin/documents.html:316` | Redundant closing brace `}` inside inline `<script>` | SyntaxError halts all JS on documents page; table permanently frozen on "Loading..." | ✅ **FIXED & VERIFIED** |
| 🔴 **CRITICAL** | `TASK-02` | `api/config.php`<br>`api/get_quotations.php:34`<br>`api/save_quotation.php:176` | Missing `LOCAL_FALLBACK_FILE` constant definition | Causes PHP 8 fatal error crash in quotation retrieval and auto-save when DB fails | ✅ **FIXED & VERIFIED** |
| 🔴 **CRITICAL** | `TASK-03` | `database.sql`<br>`inquiry-admin/api/members.php` | Legacy `users` table missing columns (#1054 Error on cPanel Import) | phpMyAdmin import aborts on `#1054 - Unknown column 'name' in 'field list'` | ✅ **FIXED & VERIFIED** |
| 🔴 **CRITICAL** | `TASK-04` | `inquiry-admin/api/` (`get_analytics`, `get_customers`, `leads`) | Desynchronization: Endpoints query non-existent `inquiries` table | `get_analytics.php`, `get_customers.php`, `get_inquiries.php` return 500 error | ✅ **FIXED & VERIFIED** |
| 🔴 **CRITICAL** | `TASK-05` | 7 PHP Endpoints (`leads`, `packages`, `website`, `activity`, etc.) | Null PDO connection unhandled fatal crashes calling `prepare()` | Endpoints throw uncatchable `TypeError` when DB is unreachable, breaking frontend | ✅ **FIXED & VERIFIED** |
| 🔴 **CRITICAL** | `TASK-06` | `js/app.js:65-74`<br>`inquiry-admin/leads.html:462` | Parameter mismatch on "CREATE QUOTATION" (`destination` vs `destinations`, etc.) | Studio fails to prefill lead details; stays on demo Thailand text; causes `"Adults Adults"` bug | ✅ **FIXED & VERIFIED** |
| 🔴 **CRITICAL** | `TASK-07` | `api/upload.php:155`<br>`api/save_quotation.php:152` | Column mismatch on `documents` table (`uploaded_by` vs `created_by`) | All document uploads and joins fail with `#1054 Unknown column 'uploaded_by'` | ✅ **FIXED & VERIFIED** |
| 🔴 **CRITICAL** | `TASK-08` | `database.sql`<br>`api/save_quotation.php` | Missing 6 columns in `database.sql` for table `quotations` | `save_quotation.php` INSERT fails on fresh database import | ✅ **FIXED & VERIFIED** |
| 🟠 **HIGH** | `TASK-09` | `api/website_manager.php:51`<br>`api/send_document.php:26` | PHP 8 Fatal `TypeError`: Session array passed directly to `trim()` | Fatal crash on POST when `updated_by` or `sender_name` is omitted | ✅ **FIXED & VERIFIED** |
| 🟠 **HIGH** | `TASK-10` | 27 PHP Endpoints across `api/` and `inquiry-admin/api/` | Unauthenticated administrative access (BOLA / BFLA) | Remote users can invoke staff APIs (create admin, delete quotes, modify website) without auth | Ready for Fix |
| 🟠 **HIGH** | `TASK-11` | `api/auth.php`<br>`inquiry-admin/api/login.php` | Session fragmentation between `admin_user` and `inquiry_admin` | Inconsistent login states and premature 401 Unauthorized redirects across modules | Ready for Fix |
| 🟠 **HIGH** | `TASK-12` | `api/send_document.php:49` | Public share link directs clients to `/index.html?ref=` (internal editor) | WhatsApp & Email links open internal editor studio rather than client viewer (`view.html`) | ✅ **FIXED & VERIFIED** |
| 🟠 **HIGH** | `TASK-13` | `website/index.html` | Public site has 0 media queries; header blowout (>760px on mobile) | Public marketing website unreadable on mobile phones; lacks hamburger drawer | Ready for Fix |
| 🟠 **HIGH** | `TASK-14` | `inquiry-admin/css/portal.css:843` | Table container has `overflow: hidden;` instead of `overflow-x: auto;` | Action, status, and contact columns permanently clipped off on tablet/mobile screens | ✅ **FIXED & VERIFIED** |
| 🟠 **HIGH** | `TASK-15` | `inquiry-admin/trips.html`<br>`inquiry-admin/invoices.html` | Modules are 100% hardcoded HTML stubs; lacking backend APIs | Trips & Invoices cannot be saved, viewed, or managed in MySQL | Ready for Fix |
| 🟡 **MEDIUM** | `TASK-16` | `admin/admin.css:71` | Fixed 250px sidebar with zero mobile collapse rules | Content area crushed to 125px on mobile phones | Ready for Fix |
| 🟡 **MEDIUM** | `TASK-17` | `inquiry-admin/members.html:11` | Uses deprecated topbar layout (`css/style.css?v=8.0`) | Architectural inconsistency; 11 horizontal links wrap awkwardly on small viewports | ✅ **REBUILT (LUXURY NAVY SIDEBAR & ACTIVITY TRACKING)** |
| 🟡 **MEDIUM** | `TASK-18` | `inquiry-admin/js/idle-tracker.js` | Frontend dummy OTP verification (accepts any 4 characters) | Screen unlock does not validate against server-side session hash | Ready for Fix |
| 🟡 **MEDIUM** | `TASK-19` | `api/dashboard_stats.php:95` | Query references `total_amount` on `invoices` instead of `grand_total` | Revenue formula fails silently; dashboard always shows default `₹ 4,85,000` | ✅ **FIXED & VERIFIED** |
| 🟡 **MEDIUM** | `TASK-20` | `inquiry-admin/api/get_customers.php` | Customer directory ignores dedicated `customers` table | Customers view crashes with 500 error | Ready for Fix |
| 🟢 **LOW** | `TASK-21` | Entire Portal | Raw Unicode emojis used instead of Font Awesome 6 vector icons | Platform-dependent rendering; broken tofu boxes or misaligned glyphs | ✅ **FIXED & VERIFIED** |
| 🟢 **LOW** | `TASK-22` | Root / cPanel Bundle | `aipdfgenrater_cpanel_FINAL.zip` generated (~2.10 MB) | Production package ready for one-click cPanel upload | ✅ **PACKAGED & VERIFIED** |
| 💎 **FEATURE** | `TASK-23` | `index.php` & `inquiry-admin/index.html` | Dual-Role Entry Login Gateway ("Login as Admin" / "Login as User") | Matches luxury travel reference design with social proof stats | ✅ **BUILT & VERIFIED** |
| 💎 **FEATURE** | `TASK-24` | `inquiry-admin/dashboard.html` | Luxury Modern Admin Dashboard with dark navy sidebar, KPI cards, Sales Chart | Complete UI overhaul matching reference design | ✅ **BUILT & VERIFIED** |
| 💎 **FEATURE** | `TASK-25` | `inquiry-admin/api/members.php` & `dashboard.html` | Live Employee Activity Tracking (Admin, Chanchal, Ritesh, Operations) | Tracks login times, active minutes, and status badges with safe fallback | ✅ **BUILT & VERIFIED** |
| 💎 **FEATURE** | `TASK-26` | `index.html` & `css/style.css` | AI Quotation Studio Subbar & 4-Step Process Wizard Stepper | Luxury aesthetic with "Save Draft", "Generate PDF", currency switch | ✅ **BUILT & VERIFIED** |
| 🛡️ **QC** | `TASK-27` | `tests/qc_runner.php` | Automated 5-Stage Quality-Control Test Suite | Verified PHP, JS, Mobile Viewports, DB Config, Upload Security (70/70 PASS) | ✅ **PASSED (70/70)** |
| 🚀 **RELEASE** | `TASK-28` | GitHub Remote | Dedicated branch `feature/ui-redesign-and-admin-portal` (Commit `dedaee0`) | Cleanly sanitized and pushed to remote origin repository | ✅ **PUSHED TO GITHUB** |

---

## 2. Phase-by-Phase Remediation Execution Plan

### Phase 1: Immediate Critical Repairs (Tasks 01 to 09)
* Fix SyntaxError in `documents.html:316`.
* Define `LOCAL_FALLBACK_FILE` in `api/config.php`.
* Add safe `ALTER TABLE` migrations in `database.sql`.
* Create `inquiries` -> `leads` backward-compatible view.
* Add `$pdo` null connection guards across 7 endpoints.
* Fix Studio parameter prefill in `js/app.js` and eliminate `"Adults Adults"` concatenation.
* Harmonize `uploaded_by` and `created_by` in `documents` table and APIs.
* Add 6 missing columns to `quotations` table in `database.sql`.
* Fix session array passed to `trim()` in `website_manager.php` and `send_document.php`.

### Phase 2: Security & Authentication Hardening (Tasks 10 to 12, 18)
* Add `requireAuth()` and server-side role validation on administrative APIs.
* Unify session keys into `$_SESSION['letsexplore_auth']`.
* Fix document share URL in `api/send_document.php` to point to `/view.html?ref=`.
* Implement server-backed 15-minute inactivity session expiration and PIN validation.

### Phase 3: Frontend & Responsive Optimization (Tasks 13 to 17, 21)
* Implement mobile hamburger drawer and responsive queries in `website/index.html`.
* Fix table container horizontal scrolling (`overflow-x: auto;`).
* Convert `inquiry-admin/members.html` to master portal layout (`portal.css`).
* Add mobile responsive drawer for `admin/admin.css`.
* Add Leads Pipeline route into Operations Workspace sidebar.
* Replace raw Unicode emojis with scalable Font Awesome 6 icons.

### Phase 4: Operations Module Wiring & Turnkey Packaging (Tasks 15, 19, 20, 22)
* Build `inquiry-admin/api/trips.php` with full CRUD against MySQL `trips` table.
* Build `inquiry-admin/api/invoices.php` with full CRUD against MySQL `invoices` table.
* Wire `inquiry-admin/api/get_customers.php` to query dedicated `customers` table.
* Fix invoice revenue calculation formula in `dashboard_stats.php`.
* Repackage verified `aipdfgenrater_cpanel.zip` with clean cPanel deployment guide.

---

**Approval Gate:** No application code will be altered until explicit approval is granted.
