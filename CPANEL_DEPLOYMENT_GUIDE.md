# Let's Explore DMC — Private PDF System & Admin Deployment Guide

This guide explains how to deploy the **Private Admin & PDF Management Module** inside the existing Let's Explore cPanel hosting without affecting the main public DMC website.

---

## 1. Architecture Overview

```
letsexploredmc.com/
│
├── /                    ← Existing DMC Website (COMPLETELY UNTOUCHED & UNCHANGED)
│   ├── index.html / index.php
│   ├── css/
│   ├── js/
│   └── images/
│
├── /admin/              ← Private Admin & PDF Document Portal (Protected by Login)
│   ├── login.html       ← Secure login screen (Username / Email & Password)
│   ├── index.html       ← PDF Document Manager & Dashboard
│   ├── admin.css        ← Luxury DMC dark & gold branding
│   └── admin.js         ← API client & UI controller
│
├── /api/                ← Secure PHP Backend Endpoints
│   ├── config.php       ← MySQL credentials & upload paths
│   ├── db.php           ← PDO connection handler
│   ├── auth.php         ← Session verification middleware
│   ├── login.php        ← Admin authentication
│   ├── logout.php       ← Session termination
│   ├── documents.php    ← List, search, filter & metadata updates
│   ├── upload.php       ← Secure PDF validation & storage
│   ├── delete.php       ← Unlink file & remove record
│   ├── categories.php   ← Topic / Category CRUD
│   ├── comments.php     ← Internal remarks & notes
│   └── setup.php        ← Turnkey 1-click database installer & tester
│
├── /uploads/            ← Physical PDF storage on cPanel server
│   └── .htaccess        ← Security rule blocking script/PHP execution
│
└── /database/
    └── letsexplore_pdf.sql  ← Turnkey schema ready for phpMyAdmin
```

---

## 2. Step-by-Step cPanel Setup

### Step A: Create MySQL Database & User in cPanel
1. Log into your **cPanel**.
2. Go to **Databases** ➔ **MySQL® Databases**.
3. Under **Create New Database**, enter:
   - Database Name: `letsexplore_pdf` (or your cPanel prefix: `username_letsexplore_pdf`).
   - Click **Create Database**.
4. Scroll down to **Add New User**:
   - Username: `letsexplore_admin`
   - Password: Create a strong password (e.g., `AdminPass_2026!`).
   - Click **Create User**.
5. Under **Add User to Database**:
   - Select User: `letsexplore_admin`
   - Select Database: `letsexplore_pdf`
   - Click **Add**.
   - Check **ALL PRIVILEGES** and click **Make Changes**.

---

### Step B: Import Database Schema via phpMyAdmin
1. In cPanel, click on **phpMyAdmin**.
2. In the left sidebar, click on the database you just created (`letsexplore_pdf`).
3. Click on the **Import** tab at the top.
4. Click **Choose File** and select `database/letsexplore_pdf.sql`.
5. Scroll to the bottom and click **Import** (or **Go**).
6. phpMyAdmin will create the 4 tables:
   - `users` (with pre-seeded admin user)
   - `categories` (with 5 pre-seeded travel categories: Invoices, Quotations, Hotel Vouchers, Flight & Transport, Marketing)
   - `documents`
   - `comments`

---

### Step C: Configure `api/config.php`
Open `api/config.php` and update the constants with your exact cPanel database credentials:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'yourcpanelprefix_letsexplore_pdf');
define('DB_USER', 'yourcpanelprefix_letsexplore_admin');
define('DB_PASS', 'YourActualStrongPassword');
```

---

### Step D: Upload Files to cPanel File Manager
1. In cPanel, open **File Manager** and navigate to your `public_html/`.
2. Upload the folders:
   - `admin/`
   - `api/`
   - `uploads/`
3. Verify that `uploads/` has write permissions (`0755` or `0775`).
4. Keep all existing files of the Let's Explore DMC website as they are.

---

## 3. Initial Login Credentials

- **Admin URL:** `https://letsexploredmc.com/admin/login.html`
- **Default Username:** `admin` or `admin@letsexploredmc.com`
- **Default Password:** `Admin@LetsExplore2026!`

*(You can change the password or username at any time from phpMyAdmin or via `api/setup.php`)*.

---

## 4. Key Security Features Built-in

1. **Physical PDF Storage**: Large PDF files are kept in `/uploads/` on the server disk; MySQL only stores metadata and file paths for maximum query performance.
2. **Script Execution Block**: The `.htaccess` in `/uploads/` prevents any uploaded script from being executed.
3. **MIME & Magic Bytes Validation**: `upload.php` checks both the MIME header and binary header (`%PDF-`) to reject any disguised or non-PDF files.
4. **Session Authentication**: All API endpoints and admin views require active session verification. Unauthorized requests receive a 401 response and redirect to login.
5. **Prepared Statements**: All database queries use PDO prepared statements to guarantee full SQL injection protection.
