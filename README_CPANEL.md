# Let's Explore DMC — PDF Generator Deployment Guide (Subdomain Architecture)

This guide provides exact, step-by-step instructions for deploying the complete PDF Generator application into your dedicated subdomain:
👉 **Subdomain URL:** `https://pdf.letsexploredmc.com/`  
👉 **Database Name:** `ihpyruhe_pdf_generator`  
👉 **Database User:** `ihpyruhe_pdf_admin`

---

## 1. Subdomain Architecture Overview

By deploying to `pdf.letsexploredmc.com`, your main website (`letsexploredmc.com`) remains **100% separate, untouched, and safe**.

```
cPanel Server Root
│
├── public_html/                     ← Main DMC Website (DO NOT TOUCH - COMPLETELY UNCHANGED)
│   ├── index.html, css/, js/        ← (Serves https://letsexploredmc.com/)
│
└── pdf.letsexploredmc.com/          ← SUBDOMAIN DOCUMENT ROOT (Deploy Everything Here)
    ├── index.html                   ← AI Travel Quotation & Invoice Studio (https://pdf.letsexploredmc.com/)
    ├── css/                         ← Studio Styling & Layouts
    ├── js/                          ← Studio Client Logic, PDF/DOCX Generators
    ├── images/                      ← Company Logo & Branding Graphics
    │
    ├── admin/                       ← Private PDF Management Portal (https://pdf.letsexploredmc.com/admin/)
    │   ├── index.php                ← Security guard (redirects unauthenticated users to login.html)
    │   ├── login.html               ← Private login screen
    │   ├── index.html               ← Document management dashboard
    │   ├── admin.css                ← Luxury dark & gold DMC branding
    │   └── admin.js                 ← Search, filter, upload, comments controller
    │
    ├── api/                         ← Secure PHP Backend Endpoints
    │   ├── .htaccess                ← Blocks direct web browser access to config.php
    │   ├── config.php               ← Database credentials & server paths
    │   ├── config.sample.php        ← Clean configuration template
    │   ├── db.php                   ← Secure PDO connection handler
    │   ├── auth.php                 ← Session authentication middleware
    │   ├── login.php                ← Admin authentication endpoint
    │   ├── logout.php               ← Session termination
    │   ├── documents.php            ← Search, filter by category, list & metadata update
    │   ├── upload.php               ← PDF validator (extension, MIME, magic bytes, safe filename)
    │   ├── delete.php               ← Deletes database record AND unlinks physical PDF file
    │   ├── categories.php           ← Topics & categories management
    │   ├── comments.php             ← Internal remarks & notes
    │   └── create_admin.php         ← One-time first admin account setup (self-locking)
    │
    ├── uploads/                     ← Physical PDF storage on cPanel server
    │   └── .htaccess                ← Security rule blocking script/PHP execution
    │
    ├── inquiry-admin/               ← Lead & inquiry management module
    │   ├── index.html               ← Lead admin login
    │   ├── dashboard.html           ← Leads dashboard
    │   ├── inquiries.html           ← Inquiries table & quote links
    │   ├── customers.html           ← Customer directory
    │   ├── analytics.html           ← Marketing channel insights
    │   └── api/                     ← Inquiry APIs
    │
    └── database.sql                 ← Turnkey schema file for phpMyAdmin
```

---

## 2. Complete List of Files Required in the ZIP

All of the following files and folders must be included in the deployment ZIP:

1. **`index.html`** — The AI Quotation Studio & Invoice Generator frontend.
2. **`css/`** — Stylesheets for the studio.
3. **`js/`** — Scripts: `config.js`, `data.js`, `preview.js`, `chatbot.js`, `pdf-generator.js`, `docx-generator.js`.
4. **`images/`** — `logo.png` and graphics.
5. **`admin/`** — Private Admin Portal files (`index.php`, `login.html`, `index.html`, `admin.css`, `admin.js`).
6. **`api/`** — All PHP backend files (`.htaccess`, `config.php`, `db.php`, `auth.php`, `login.php`, `logout.php`, `documents.php`, `upload.php`, `delete.php`, `categories.php`, `comments.php`, `create_admin.php`).
7. **`uploads/`** — Upload directory containing `.htaccess`.
8. **`inquiry-admin/`** — Lead management module.
9. **`database.sql`** — Database import file.

> **Pre-Packaged ZIP Available**:  
> A clean ZIP containing all these files (excluding Git history) has already been generated in your workspace:  
> `d:\aipdfgenrater\aipdfgenerater_cpanel.zip` (~720 KB).

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Import `database.sql` in phpMyAdmin
1. Log into your **cPanel**.
2. Under **Databases**, open **phpMyAdmin**.
3. In the left sidebar, click on your existing database: **`ihpyruhe_pdf_generator`**.
4. Click on the **Import** tab at the top toolbar.
5. Click **Choose File** and select **`database.sql`**.
6. Click **Go** (or **Import**) at the bottom.
7. Verify that the 5 tables are created:
   * `users` — Admin accounts and password hashes.
   * `categories` — Pre-seeded with *Invoices*, *Quotations*, *Hotel Vouchers*, *Flight & Transport*, *Marketing & Guides*.
   * `documents` — Document metadata and server file paths.
   * `comments` — Internal notes and remarks.
   * `inquiries` — Website lead inquiries.

---

### Step 2: Upload and Extract into Subdomain Document Root
1. In cPanel, open **File Manager**.
2. Locate the folder for your subdomain:
   * Normally this is `pdf.letsexploredmc.com/` (or `public_html/pdf/` depending on how cPanel created the subdomain).
   * Confirm it is the **Document Root** listed in cPanel ➔ **Subdomains** for `pdf.letsexploredmc.com`.
3. Open this subdomain folder in File Manager.
4. Click **Upload** at the top.
5. Select `aipdfgenrater_cpanel.zip` from your computer and wait for the upload bar to turn green (100%).
6. Return to File Manager, right-click `aipdfgenrater_cpanel.zip` and select **Extract**.
7. Confirm that `index.html`, `admin/`, `api/`, `css/`, `js/`, `images/`, and `uploads/` are now directly inside your subdomain document root (not nested inside an extra subfolder).
8. Delete `aipdfgenrater_cpanel.zip` to keep disk storage clean.

---

### Step 3: Set Uploads Folder Permissions
1. In File Manager inside your subdomain root, find the **`uploads/`** folder.
2. Right-click **`uploads/`** ➔ select **Change Permissions**.
3. Set permissions to **`755`** (or `775` if required by your host).
4. Verify that `uploads/.htaccess` exists inside `uploads/`. This file disables PHP/script execution inside the upload folder so uploaded files cannot execute malicious code.

---

### Step 4: Configure Database Password in `api/config.php`
1. In File Manager, open the **`api/`** folder inside your subdomain root.
2. Right-click **`config.php`** ➔ select **Edit**.
3. Locate line 19:
   ```php
   defined('DB_PASS') or define('DB_PASS', 'YOUR_CPANEL_DATABASE_PASSWORD_HERE');
   ```
4. Replace `'YOUR_CPANEL_DATABASE_PASSWORD_HERE'` with the actual password you assigned to user `ihpyruhe_pdf_admin` when you created the database user in cPanel.
5. Confirm lines 13-17 match:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'ihpyruhe_pdf_generator');
   define('DB_USER', 'ihpyruhe_pdf_admin');
   ```
6. Click **Save Changes**.

---

### Step 5: Create Your Secure Admin Account
Because `database.sql` does not include any insecure hardcoded passwords:
1. Open your browser and navigate to:
   ```text
   https://pdf.letsexploredmc.com/api/create_admin.php
   ```
2. Enter your desired **Username**, **Email**, and a **Strong Password** (minimum 8 characters).
3. Click **Create Secure Admin Account**.
   * The password is encrypted using native PHP `PASSWORD_BCRYPT`.
   * The setup page automatically locks itself once the account is created, preventing any unauthorized duplicate creations.

---

### Step 6: Test Your Application

1. **Test the Private Admin Portal**:
   * Open: `https://pdf.letsexploredmc.com/admin/`
   * It should present the private login page (`login.html`).
   * Sign in with the credentials created in Step 5.
   * You will be redirected to the Document Management Dashboard (`https://pdf.letsexploredmc.com/admin/index.html`).

2. **Test PDF Upload**:
   * On the Admin Dashboard, click **"+ Upload New PDF"**.
   * Upload a test PDF, select a category (*Quotations* or *Invoices*), and click submit.
   * Verify it appears in your document list and updates the storage counter.

3. **Test Search & Filtering**:
   * Type in the search box to filter by title or keyword.
   * Click on category pills (*Quotations*, *Invoices*) to filter by topic.

4. **Test PDF View & Download**:
   * Click **"View PDF"** to open the preview modal.
   * Click the download icon to verify the file downloads correctly.

5. **Test AI Studio**:
   * Open: `https://pdf.letsexploredmc.com/`
   * Verify the Quotation Studio & Invoice Generator loads cleanly with no broken styles or missing images.
