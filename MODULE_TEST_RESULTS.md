# Module-by-Module Functional Test Results
**Live URL:** `https://pdf.letsexploredmc.com/`  
**Test Suite:** End-to-End Functional Verification  
**Evaluation Date:** November 5, 2026  
**Status Legend:**
- ✅ **PASS:** Feature empirically tested and fully operational with verified evidence.
- ❌ **FAIL:** Feature exists but fails to execute, throws an error, or produces incorrect output.
- ⚠️ **BLOCKED:** Test cannot proceed due to missing dependency, stubbed endpoint, or invalid credentials.
- ⏸️ **NOT TESTED:** Out of scope or deferred for destructive data safety.

---

## Module 1: Public Marketing Website (`/website/index.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD1-01` | Page Loading | Fetch `https://pdf.letsexploredmc.com/website/index.html` | ✅ **PASS** | HTTP 200 OK (Length: 27,702 bytes, Time: 968ms). Clean HTML document. |
| `MOD1-02` | Hero Section & CTAs | Hero headline, "Plan Your Holiday" & "Open AI Studio" links | ✅ **PASS** | Rendered cleanly. "Open AI Studio" routes to root `/index.html`. |
| `MOD1-03` | Destination Packages Carousel | 4 Featured destinations (Dubai, Thailand, Bali, Malaysia) | ✅ **PASS** | Cards render with Unsplash imagery, pricing tags, and day itineraries. |
| `MOD1-04` | Contact / Inquiry Form | Client lead submission form | ❌ **FAIL** | Form submits via client-side alert or mailto without saving to MySQL `leads` table. |
| `MOD1-05` | Mobile Navigation Drawer | Hamburger menu on screens < 768px | ❌ **FAIL** | Zero CSS media queries present; top navigation blows out viewport horizontally (>760px). |

---

## Module 2: AI Document Studio & PDF Engine (`/index.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD2-01` | Studio UI Initialization | Main document editor loading at `/index.html` | ✅ **PASS** | HTTP 200 OK (Length: 85,206 bytes). Three-column workspace loads in full. |
| `MOD2-02` | Document Type Switcher | Toggle between Itinerary, Quotation, Invoice, Voucher | ✅ **PASS** | `js/data.js` and `js/app.js` toggle modes; pricing summaries update dynamically. |
| `MOD2-03` | Live Quotations Retrieval | Fetch saved quotations via `api/get_quotations.php` | ✅ **PASS** | HTTP 200 OK. Returns 13 quotations from MySQL database (`ihpyruhe_pdf_generator`). |
| `MOD2-04` | Lead-to-Studio Prefill | Query parameters `?client_name=&phone=&destinations=` | ✅ **PASS** | `js/app.js` mappings verified. Pre-fills client, destination, phone, and clean pax string. |
| `MOD2-05` | PDF Preview Generation | Browser rendering of quotation document | ✅ **PASS** | `js/preview.js` renders real-time HTML canvas/iframe with dual currency totals. |
| `MOD2-06` | Client PDF Download | Export document via `js/pdf-generator.js` | ✅ **PASS** | Browser invokes native print dialog and client-side PDF renderer cleanly. |
| `MOD2-07` | Live AI Parsing (Claude/Gemini) | Upload itinerary PDF for AI extraction | ⚠️ **BLOCKED** | Claude returns 404 (user token prefix); Gemini returns 401. Fallback to local heuristic engine succeeds. |

---

## Module 3: Authentication & Sub-User Management

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD3-01` | Admin Login (`inquiry-admin/index.html`) | Authenticate user `admin` with `Admin@123` | ✅ **PASS** | HTTP 200 OK. Returns role `admin` and redirects to `dashboard.html`. |
| `MOD3-02` | Sub-User 1 Login (`chanchal`) | Authenticate user `chanchal` with `Admin@123` | ✅ **PASS** | HTTP 200 OK. Returns role `executive`. |
| `MOD3-03` | Sub-User 2 Login (`ritesh`) | Authenticate user `ritesh` with `Admin@123` | ✅ **PASS** | HTTP 200 OK. Returns role `executive`. |
| `MOD3-04` | Sub-User 3 Login (`operations`) | Authenticate user `operations` with `Admin@123` | ✅ **PASS** | HTTP 200 OK. Returns role `agent`. |
| `MOD3-05` | Invalid Password Rejection | Authenticate user `admin` with `WrongPassword123` | ✅ **PASS** | HTTP 401 Unauthorized. Correctly prevents unauthorized access. |
| `MOD3-06` | Cross-Module Session Sharing | Root APIs reading `inquiry-admin` session | ❌ **FAIL** | `inquiry-admin` sets `inquiry_admin`; root APIs require `admin_user`. Triggers false 401. |
| `MOD3-07` | 15-Minute Inactivity Screen Lock | Screen idle lock modal | ❌ **FAIL** | Client-side only in `idle-tracker.js`; accepts any 4 characters without destroying server session. |

---

## Module 4: Operations Dashboard (`inquiry-admin/dashboard.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD4-01` | Dashboard Shell & Topbar | Navigation bar, user avatar, quick actions | ✅ **PASS** | HTTP 200 OK (Length: 26,754 bytes). Renders brand header and user profile. |
| `MOD4-02` | KPI Metrics Fetch | Request to `api/dashboard_stats.php` | ✅ **PASS** | HTTP 200 OK. Returns inquiries count, customer count, and MTD gross revenue. |
| `MOD4-03` | Inquiries Feed | Live inquiries listing on dashboard | ✅ **PASS** | Backed by `leads` table and `inquiries` compatibility view. |
| `MOD4-04` | Recent Quotations Feed | Top 5 recent quotations display | ✅ **PASS** | Directly queries `quotations` table in MySQL. |
| `MOD4-05` | Sidebar Collapsing | Toggle button `#sidebarToggleBtn` | ✅ **PASS** | Toggles `.collapsed` class; state persisted in `localStorage`. |

---

## Module 5: Leads & Inquiry Pipeline (`inquiry-admin/leads.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD5-01` | Pipeline Interface Loading | Fetch `inquiry-admin/leads.html` | ✅ **PASS** | HTTP 200 OK (Length: 33,847 bytes). |
| `MOD5-02` | Stage Filter Buttons | 8-stage filters (All, Fresh, Follow-up, etc.) | ✅ **PASS** | Styled pills (`portal.css` v12.0) render without 3D bevels; filters table rows. |
| `MOD5-03` | Create Lead (Safe Test) | POST to `inquiry-admin/api/add_inquiry.php` | ✅ **PASS** | HTTP 200 OK. Test record `QA Automated Test Client` inserted into MySQL. |
| `MOD5-04` | Retrieve Leads | GET `inquiry-admin/api/get_inquiries.php` | ✅ **PASS** | HTTP 200 OK. Returns all live leads with customer name, phone, destination, status. |
| `MOD5-05` | Delete Lead (Cleanup) | POST to `inquiry-admin/api/delete_inquiry.php` | ✅ **PASS** | HTTP 200 OK. Test record safely removed. Zero orphan data left. |
| `MOD5-06` | "CREATE QUOTATION" Workflow | Button click linking lead to Studio | ✅ **PASS** | URL parameters mapped cleanly; pre-fills Document Studio without `"Adults Adults"` error. |

---

## Module 6: Customers Directory (`inquiry-admin/customers.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD6-01` | Customer Directory Loading | Fetch `inquiry-admin/customers.html` | ✅ **PASS** | HTTP 200 OK (Length: 20,518 bytes). |
| `MOD6-02` | Live Customers Fetch | Request to `inquiry-admin/api/get_customers.php` | ✅ **PASS** | HTTP 200 OK. Returns customer list from MySQL `customers` table. |
| `MOD6-03` | Add Customer Modal | Save new customer to MySQL | ❌ **FAIL** | Modal form uses frontend mock array; POST API handler missing in `get_customers.php`. |

---

## Module 7: Destination Packages (`inquiry-admin/packages.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD7-01` | Packages Page Loading | Fetch `inquiry-admin/packages.html` | ✅ **PASS** | HTTP 200 OK (Length: 19,630 bytes). |
| `MOD7-02` | Country Filter Pills | Filter tabs for India, Singapore, Malaysia, Indonesia, Turkey | ✅ **PASS** | Styled rounded pills render cleanly; filters package cards by country. |
| `MOD7-03` | Packages Retrieval | GET `api/packages_manager.php` | ✅ **PASS** | HTTP 200 OK. Returns published packages from MySQL `packages` table. |
| `MOD7-04` | Google Drive Import | Import original itineraries from shared Google Drive | ⚠️ **BLOCKED** | Google Drive API credentials not yet bound; mock preview active. |

---

## Module 8: Central Documents Repository (`inquiry-admin/documents.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD8-01` | Repository Page Loading | Fetch `inquiry-admin/documents.html` | ✅ **PASS** | HTTP 200 OK (Length: 22,772 bytes). |
| `MOD8-02` | JavaScript Execution | Table loading without syntax halts | ✅ **PASS** | Fixed line 316 extra `}`. Repository table populates without syntax errors. |
| `MOD8-03` | Documents API Fetch | GET `inquiry-admin/api/documents.php` | ✅ **PASS** | HTTP 200 OK. Returns all documents from MySQL `documents` table. |
| `MOD8-04` | Malicious File Upload Gate | Upload executable `.php` file | ✅ **PASS** | HTTP 406 Not Acceptable. Strict extension check blocks all non-PDF files. |
| `MOD8-05` | Genuine PDF Upload | Upload legitimate `.pdf` itinerary file | ⚠️ **BLOCKED** | Blocked by session key fragmentation (`requireAuth` 401). |

---

## Module 9: Public Quotation Viewer & Sharing (`/view.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD9-01` | Public Viewer Route | Fetch `https://pdf.letsexploredmc.com/view.html` | ✅ **PASS** | HTTP 200 OK (Length: 13,215 bytes). Clean client layout without edit controls. |
| `MOD9-02` | Load Saved Quote by Ref | Fetch `view.html?ref=LEDMC-GEN-2026-7799` | ✅ **PASS** | HTTP 200 OK. Client view loads quote from MySQL database. |
| `MOD9-03` | WhatsApp Dispatch Link | POST to `api/send_document.php` | ✅ **PASS** | HTTP 200 OK. Generates valid `https://api.whatsapp.com/send` URL pointing to `/view.html?ref=`. |
| `MOD9-04` | Email Dispatch Link | POST to `api/send_document.php` (email channel) | ✅ **PASS** | HTTP 200 OK. Dispatches via PHP mailer and logs to `document_shares` table. |

---

## Module 10: Running Trips & Operations (`inquiry-admin/trips.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD10-01` | Trips Interface Loading | Fetch `inquiry-admin/trips.html` | ✅ **PASS** | HTTP 200 OK (Length: 18,044 bytes). |
| `MOD10-02` | Trips Backend API | Request to `inquiry-admin/api/trips.php` | ❌ **FAIL** | HTTP 404 Not Found. Backend API does not exist; page renders static mock table. |
| `MOD10-03` | Add / Update Trip Modal | Save live departure, driver, coordinator details | ❌ **FAIL** | Modal triggers browser `alert()` without persisting to MySQL `trips` table. |

---

## Module 11: Invoices & Vouchers (`inquiry-admin/invoices.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD11-01` | Invoices Interface Loading | Fetch `inquiry-admin/invoices.html` | ✅ **PASS** | HTTP 200 OK (Length: 20,386 bytes). |
| `MOD11-02` | Invoices Backend API | Request to `inquiry-admin/api/invoices.php` | ❌ **FAIL** | HTTP 404 Not Found. Backend API does not exist; page renders static mock invoices. |
| `MOD11-03` | Generate GST Invoice | Create official tax invoice with HSN 998555 | ❌ **FAIL** | UI form exists, but submission is not connected to MySQL `invoices` table. |

---

## Module 12: Reports, Analytics & Settings (`inquiry-admin/analytics.html`, `settings.html`)

| Test ID | Feature / Component | Description | Status | Evidence / Observation |
|:---:|:---|:---|:---:|:---|
| `MOD12-01` | Analytics Page Loading | Fetch `inquiry-admin/analytics.html` | ✅ **PASS** | HTTP 200 OK (Length: 30,954 bytes). |
| `MOD12-02` | Button Styling & Icons | Time period and sub-user view buttons | ✅ **PASS** | Rendered as modern rounded pills with Font Awesome 6 icons (`portal.css` v12.0). |
| `MOD12-03` | Metric Card Value Overflow | Gross Booking Value ₹ 24,85,000 card | ✅ **PASS** | Fluid clamp styling prevents text truncation or overflow blowout. |
| `MOD12-04` | Security Settings Loading | Fetch `inquiry-admin/settings.html` | ✅ **PASS** | HTTP 200 OK (Length: 21,426 bytes). |
| `MOD12-05` | Save Settings Form | POST settings to `api/settings.php` | ❌ **FAIL** | Saves to browser `localStorage` only; not persisted to MySQL `settings` table. |

