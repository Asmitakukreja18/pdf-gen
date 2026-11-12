# Let's Explore DMC — Database Schema & Relational Integrity Audit (Phase 3)

**Database Name:** `ihpyruhe_pdf_generator`  
**Master Schema File:** `database.sql` & `sql/schema_v2_migration.sql`  
**Date:** November 12, 2026  
**Auditor:** Antigravity Senior Database Architect & Forensic Auditor  

---

## 1. Executive Summary

An exhaustive forensic schema audit was performed on the MySQL database architecture of Let's Explore DMC. 

The audit identified that while individual tables (`leads`, `customers`, `quotations`, `documents`, `packages`, `trips`, `suppliers`, `invoices`, `users`, `settings`) existed in `database.sql`, the critical transactional entities **`bookings`** and **`payments`** were **completely missing**, and downstream relational foreign key links connecting the 10-stage DMC lifecycle were disconnected.

A safe, **100% backward-compatible Schema V2 upgrade** was designed and integrated into `database.sql` and `sql/schema_v2_migration.sql` with **ZERO `DROP` or `TRUNCATE` statements**, fully preserving all existing live customer and operations data.

---

## 2. Table Inventory & Entity Status (23 Tables Total)

| Table Name | Primary Key | Key Indexes & Constraints | Purpose in DMC Workflow | V2 Status |
|:---|:---|:---|:---|:---:|
| `users` | `id` (INT UNSIGNED) | UNIQUE(`username`), UNIQUE(`email`) | Staff, Agent & Admin User Accounts | Verified |
| `user_sessions` | `id` (INT UNSIGNED) | FK `user_id` -> `users.id` (CASCADE) | Active Browser Sessions & Tokens | Verified |
| `login_history` | `id` (INT UNSIGNED) | FK `user_id` -> `users.id` (CASCADE) | Security Audit Trail & IP Addresses | Verified |
| `user_activity_logs`| `id` (INT UNSIGNED) | INDEX(`user_id`), INDEX(`module`) | Internal Staff Action Logs | Verified |
| `customers` | `id` (INT UNSIGNED) | UNIQUE(`customer_code`), INDEX(`phone`) | Central Client CRM Directory | Enhanced |
| `leads` | `id` (INT UNSIGNED) | UNIQUE(`lead_no`), INDEX(`phone`) | Sales Pipeline Kanban & Inquiries | Enhanced |
| `inquiries` | `id` (INT UNSIGNED) | INDEX(`phone`), INDEX(`status`) | Public Website & WhatsApp Leads | Enhanced |
| `quotations` | `id` (INT UNSIGNED) | UNIQUE(`quote_ref`), INDEX(`client_phone`) | Itinerary Costing & Quotation Data | Enhanced |
| `bookings` | `id` (INT UNSIGNED) | UNIQUE(`booking_no`), INDEX(`customer_id`) | **Confirmed Tour Contracts (NEW)** | **ADDED (V2)** |
| `booking_items` | `id` (INT UNSIGNED) | INDEX(`booking_id`), INDEX(`supplier_id`) | **Day-Wise Service Breakdown (NEW)** | **ADDED (V2)** |
| `payments` | `id` (INT UNSIGNED) | UNIQUE(`receipt_no`), INDEX(`booking_id`) | **Financial Transaction Ledger (NEW)** | **ADDED (V2)** |
| `vouchers` | `id` (INT UNSIGNED) | UNIQUE(`voucher_no`), INDEX(`booking_id`) | **Hotel, Cab & Activity Vouchers (NEW)**| **ADDED (V2)** |
| `supplier_assignments`| `id` (INT UNSIGNED)| UNIQUE(`po_number`), INDEX(`supplier_id`)| **Ground Partner Work Orders (NEW)** | **ADDED (V2)** |
| `suppliers` | `id` (INT UNSIGNED) | INDEX(`destination`), INDEX(`category`) | DMC Ground Partner Directory | Enhanced |
| `trips` | `id` (INT UNSIGNED) | UNIQUE(`trip_code`), INDEX(`status`) | On-Ground Guest & Flight Tracking | Enhanced |
| `invoices` | `id` (INT UNSIGNED) | UNIQUE(`invoice_no`), INDEX(`customer_id`) | Commercial GST Tax Invoices | Enhanced |
| `documents` | `id` (INT UNSIGNED) | UNIQUE(`doc_no`), INDEX(`doc_type`) | Central Document & PDF Repository | Enhanced |
| `document_shares` | `id` (INT UNSIGNED) | INDEX(`document_id`), INDEX(`sender_id`) | Email & WhatsApp Distribution Log | Verified |
| `packages` | `id` (INT UNSIGNED) | UNIQUE(`package_code`), INDEX(`country`) | Published & Draft Package Catalog | Verified |
| `categories` | `id` (INT UNSIGNED) | UNIQUE(`slug`) | Central Document Classification | Verified |
| `comments` | `id` (INT UNSIGNED) | INDEX(`document_id`), INDEX(`user_id`) | Internal Team Collaboration Notes | Verified |
| `website_content` | `id` (INT UNSIGNED) | UNIQUE(`section_key`) | Live Public Website CMS Storage | Verified |
| `settings` | `id` (INT UNSIGNED) | UNIQUE(`setting_key`) | System Defaults, Billing & AI Provider | Verified |

---

## 3. End-to-End Business Relational Trace

```
[1. Lead] (leads / inquiries)
    │
    ▼ (Convert to Customer Profile)
[2. Customer] (customers.id)
    │
    ▼ (Generate Itinerary & Costing)
[3. Quotation] (quotations.quote_ref)
    │
    ▼ (Client & Manager Sign-off)
[4. Approval] (quotations.status = 'Approved')
    │
    ▼ (Lock Travel Dates & Tour Contract)
[5. Booking] (bookings.booking_no)
    ├────────────────────────────────────────┐
    ▼                                        ▼
[6. Payment] (payments.receipt_no)    [7. Supplier Assignment] (supplier_assignments)
    │                                        │
    ▼                                        ▼
[9. Tax Invoice] (invoices.invoice_no) [8. Running Trip] (trips.trip_code)
                                             │
                                             ▼
                                      [10. Vouchers] (vouchers.voucher_no)
```

### Relational Mapping Rules:
1. `Lead -> Customer`: Upserted by primary phone number (`phone`), assigning auto-generated unique `customer_code` (e.g. `CUST-982001`).
2. `Customer -> Quotation`: Quotation stores `customer_id` and denormalized `client_name` and `client_phone` for independent document version stability.
3. `Quotation -> Booking`: Approving a quotation copies the structured itinerary JSON into `bookings` and populates `booking_items` with individual service lines (hotels, flights, private transfers, excursions).
4. `Booking -> Payment & Invoice`: Payments record advance deposits and balance settlements directly against `booking_id` and `invoice_id`, updating `bookings.total_paid` and `bookings.balance_due`.
5. `Booking -> Supplier & Trip`: Creates purchase orders (`supplier_assignments`), assigns the tour to `trips` with coordinator contact, and issues hotel/cab `vouchers`.

---

## 4. Calculation Consistency & GST Standardization

- **Service Accounting Code (SAC)**: Standardized to **HSN `998555`** (Tour Operator Services).
- **Tax Rate**: Standardized across the application to **5.00% GST** (without Input Tax Credit).
- **Formula Standard**: Base price / Subtotal is tax-exclusive; 5% GST is added to calculate Grand Total:
  $$\text{Subtotal} = \sum (\text{Service Costs}) + \text{DMC Margin}$$
  $$\text{Tax Amount} = \text{Subtotal} \times 0.05$$
  $$\text{Grand Total (Billing)} = \text{Subtotal} + \text{Tax Amount}$$
- **Foreign Exchange Baseline**: Default currency rate standardized at **87.50 INR per USD** in `settings` table, supporting dynamic foreign markup conversion.

---

## 5. Migration Execution & Safety Verification
- **Backward Compatibility**: Fully verified. All existing tables and seed records preserved.
- **Data Protection**: Zero `DROP` or `TRUNCATE` operations.
- **Migration Script**: Stored in `d:\aipdfgenrater\sql\schema_v2_migration.sql` and appended to `d:\aipdfgenrater\database.sql`.
- **Status**: **PASS (Local Architecture Validated)** / **BLOCKED (Remote cPanel Port 3306 Restricted to Server Localhost)**.
