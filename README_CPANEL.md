# Let's Explore DMC — Private PDF Generator cPanel Deployment Guide

This guide explains how to deploy the **Private PDF Generator & Document Management System** on your cPanel hosting using the database:
- **Database Name:** `ihpyruhe_pdf_generator`
- **Database User:** `ihpyruhe_pdf_admin`

---

## 1. Project Files Overview

```
your-cPanel-server (public_html)/
│
├── /                    ← Existing DMC Website (COMPLETELY UNTOUCHED & PRESERVED)
│   ├── index.html / index.php
│   ├── css/
│   ├── js/
│   └── images/
│
├── /admin/              ← Private PDF Generator Admin Route (Accessible only to you)
│   ├── index.php        ← Server-side PHP security guard (redirects unauthenticated users)
│   ├── login.html       ← Private Admin login interface
│   ├── index.html       ← Private PDF Management Dashboard
│   ├── admin.css        ← Luxury DMC dark & gold branding
│   └── admin.js         ← Search, filter, upload, comments controller
│
├── /api/                ← Secure PHP Backend
│   ├── .htaccess        ← Blocks direct web browser access to config files
│   ├── config.php       ← Database credentials & server paths
│   ├── config.sample.php← Sample config template with placeholders
│   ├── db.php           ← Secure PDO database connector
│   ├── auth.php         ← Session authentication middleware
│   ├── login.php        ← Admin authentication
│   ├── logout.php       ← Session termination
│   ├── documents.php    ← Search, filter by topic, view & metadata update
│   ├── upload.php       ← Multi-layer secure PDF validator & file storage
│   ├── delete.php       ← Deletes database record AND unlinks physical PDF file
│   ├── categories.php   ← Topics / categories management
│   ├── comments.php     ← Internal remarks & notes
│   └── create_admin.php ← One-time initial admin account creation helper
│
├── /uploads/            ← Physical PDF storage on cPanel server
│   └── .htaccess        ← Security rule blocking script/PHP execution
│
└── database.sql         ← Database schema ready to import in phpMyAdmin
```

---

## 2. Step-by-Step cPanel Setup Instructions

### Step 1: Import `database.sql` into phpMyAdmin
1. Log into your **cPanel**.
2. Under the **Databases** section, click on **phpMyAdmin**.
3. In the left-hand navigation column, click on your database: **`ihpyruhe_pdf_generator`**.
4. Click on the **Import** tab at the top.
5. Under "File to import", click **Choose File** and select **`database.sql`** from this project.
6. Scroll down and click **Import** (or **Go**).
7. phpMyAdmin will execute the script and create your tables:
   - `users`
   - `categories` (with 5 default travel topics: *Invoices, Quotations, Hotel Vouchers, Flight & Transport, Marketing & Guides*)
   - `documents`
   - `comments`
   - `inquiries`

---

### Step 2: Upload Files in cPanel File Manager
1. In cPanel, open **File Manager**.
2. Navigate to **`public_html/`** (this is where your Let's Explore website files live).
   > **IMPORTANT:** Do NOT delete or overwrite any of your existing DMC website files!
3. Upload the following folders from this project into `public_html/`:
   - `admin/`
   - `api/`
   - `uploads/`
4. Confirm permissions:
   - Right-click the **`uploads/`** folder in File Manager, select **Change Permissions**, and ensure it is set to **`755`** (or `775`) so PHP can write uploaded PDF files.

---

### Step 3: Configure Database Connection
1. In cPanel File Manager, navigate inside **`public_html/api/`**.
2. Right-click **`config.php`** and select **Edit**.
3. Replace `YOUR_CPANEL_DATABASE_PASSWORD_HERE` with the actual password you assigned to `ihpyruhe_pdf_admin` when you created the user in cPanel:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'ihpyruhe_pdf_generator');
   define('DB_USER', 'ihpyruhe_pdf_admin');
   define('DB_PASS', 'YOUR_ACTUAL_PASSWORD');
   ```
4. Click **Save Changes**.

---

### Step 4: Create Your First Secure Admin Account
Since `database.sql` does not include any insecure hardcoded passwords, use the built-in helper:
1. Open your browser and navigate to:
   ```
   https://letsexploredmc.com/api/create_admin.php
   ```
2. Enter your desired **Username**, **Email**, and a **Strong Password** (minimum 8 characters).
3. Click **Create Secure Admin Account**.
   - The password will be encrypted using PHP's native BCrypt (`PASSWORD_BCRYPT`).
   - The helper will instantly lock itself once the account is created, preventing anyone else from creating accounts.

---

### Step 5: Test the Private PDF Generator
1. Open your private admin URL in your browser:
   ```
   https://letsexploredmc.com/admin/
   ```
   *(If not logged in, it will automatically show the private login page)*.
2. Sign in with the credentials you just created in Step 4.
3. Test the features on your dashboard:
   - **Upload:** Click "+ Upload New PDF" or drag and drop a PDF file. Select a category (e.g. *Invoices* or *Quotations*).
   - **Search:** Type in the search box to find your PDF by title, category, or keyword.
   - **View & Download:** Click "View PDF" to preview it in the built-in viewer, or the download icon to save it.
   - **Delete:** Delete a document and verify that both the database record and the physical file in `/uploads/` are removed safely.

---

## 3. Security Highlights

1. **Physical File Storage:** PDFs are saved as physical files in `/uploads/` with randomized collision-resistant filenames (`date_hash_name.pdf`). MySQL stores only metadata and file paths.
2. **Execution Block:** `/uploads/.htaccess` denies execution of any `.php`, `.py`, or `.sh` script inside the upload directory.
3. **MIME & Magic Bytes Inspection:** Uploads are verified by file extension, MIME type, and binary header (`%PDF-`) to prevent disguised files.
4. **Zero Public Footprint:** The private route `/admin/` does not appear anywhere on your public Let's Explore DMC website.
