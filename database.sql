-- ============================================================
-- Let's Explore DMC — Centralized Master Database Schema
-- Brand: Let's Explore DMC (Destination Management Company)
-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB 10.3+
-- Target cPanel Database: ihpyruhe_pdf_generator
-- Database User: ihpyruhe_pdf_admin
-- 
-- CPANEL PHPMYADMIN IMPORT INSTRUCTIONS:
-- 1. In phpMyAdmin, click `ihpyruhe_pdf_generator` in the left sidebar first.
-- 2. Click the 'Import' tab in top navigation bar.
-- 3. Choose this file (`database.sql`) and click 'Import'.
-- (This file contains ZERO 'DROP' or 'TRUNCATE' statements to preserve existing data)
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Table: users (Master Admin & Unlimited Sub-Users / Staff)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL DEFAULT '',
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(30) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(30) NOT NULL DEFAULT 'admin', -- 'admin', 'manager', 'executive', 'agent'
  `permissions` TEXT DEFAULT NULL,            -- JSON array of granted module permissions
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `last_login` DATETIME DEFAULT NULL,
  `last_activity` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: user_sessions (Active User Sessions & Inactivity Tracking)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `session_token` VARCHAR(128) NOT NULL UNIQUE,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `last_activity` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `otp_hash` VARCHAR(255) DEFAULT NULL,
  `otp_expires_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_session_user` (`user_id`),
  INDEX `idx_token` (`session_token`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: user_activity_logs (Real-time Employee Action Auditing)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `employee_name` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) NOT NULL,            -- 'created_lead', 'sent_quotation', 'generated_invoice', etc.
  `module` VARCHAR(50) NOT NULL,            -- 'Leads', 'Documents', 'Invoices', 'Trips', 'Settings'
  `entity_id` VARCHAR(100) DEFAULT NULL,     -- Lead ID, Quotation Ref, Invoice #
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_log` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_module` (`module`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: login_history (Audit Trail for User Logins, Logouts & Inactivity Re-logins)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `login_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `employee_name` VARCHAR(100) NOT NULL,
  `login_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_time` DATETIME DEFAULT NULL,
  `last_active` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `session_duration_mins` INT UNSIGNED DEFAULT 0,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `status` ENUM('active', 'logged_out', 'expired', 're_login') NOT NULL DEFAULT 'active',
  `is_relogin` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `idx_lh_user` (`user_id`),
  INDEX `idx_lh_login` (`login_time`),
  INDEX `idx_lh_status` (`status`),
  CONSTRAINT `fk_lh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: categories (Document Organizing Categories)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: customers (Centralized Client Directory: B2C & B2B)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(150) DEFAULT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `gstin` VARCHAR(30) DEFAULT NULL,
  `category` ENUM('B2C', 'B2B') NOT NULL DEFAULT 'B2C',
  `destinations_history` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  INDEX `idx_category` (`category`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: leads (Renamed & Enhanced Proposals/Leads Pipeline)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lead_no` VARCHAR(50) NOT NULL UNIQUE,
  `client_type` VARCHAR(30) DEFAULT 'B2C',
  `customer_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `destination` VARCHAR(150) DEFAULT NULL,
  `travel_start_date` DATE DEFAULT NULL,
  `travel_end_date` DATE DEFAULT NULL,
  `adults` INT NOT NULL DEFAULT 2,
  `children` INT NOT NULL DEFAULT 0,
  `rooms` INT NOT NULL DEFAULT 1,
  `budget` DECIMAL(12,2) DEFAULT NULL,
  `lead_source` VARCHAR(50) NOT NULL DEFAULT 'Website',
  `assigned_user_id` INT UNSIGNED DEFAULT NULL,
  `assigned_employee` VARCHAR(100) DEFAULT 'Admin',
  `followup_date` DATE DEFAULT NULL,
  `status` ENUM('New Lead', 'Fresh', 'Follow-up', 'In Review', 'Opportunity', 'Quotation Sent', 'Confirmed', 'Lost') NOT NULL DEFAULT 'Fresh',
  `internal_notes` TEXT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_lead_status` (`status`),
  INDEX `idx_lead_assigned` (`assigned_employee`),
  INDEX `idx_lead_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: documents (Centralized Documents Repository)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `doc_no` VARCHAR(60) DEFAULT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `doc_type` VARCHAR(50) NOT NULL DEFAULT 'quotation', -- 'quotation', 'itinerary', 'invoice', 'voucher', 'costing', 'summary'
  `customer_id` INT UNSIGNED DEFAULT NULL,
  `customer_name` VARCHAR(150) DEFAULT NULL,
  `destination` VARCHAR(150) DEFAULT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  `uploaded_by` INT UNSIGNED DEFAULT 1,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_by_name` VARCHAR(100) DEFAULT 'Admin',
  `last_updated_by` VARCHAR(100) DEFAULT 'Admin',
  `status` VARCHAR(30) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Final', 'Sent', 'Archived'
  `admin_remarks` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_doc_no` (`doc_no`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_doc_type` (`doc_type`),
  INDEX `idx_doc_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: document_shares (SEND NOW Email & WhatsApp Dispatch Logs)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `document_shares` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `document_id` INT UNSIGNED DEFAULT NULL,
  `doc_ref` VARCHAR(100) NOT NULL,
  `sender_id` INT UNSIGNED DEFAULT NULL,
  `sender_name` VARCHAR(100) NOT NULL,
  `recipient_name` VARCHAR(150) DEFAULT NULL,
  `recipient_email` VARCHAR(150) DEFAULT NULL,
  `recipient_phone` VARCHAR(50) DEFAULT NULL,
  `channel` ENUM('email', 'whatsapp') NOT NULL DEFAULT 'email',
  `subject` VARCHAR(255) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `delivery_status` ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'sent',
  `delivery_meta` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_share_doc` (`document_id`),
  INDEX `idx_share_sender` (`sender_name`),
  INDEX `idx_share_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: packages (Country-wise Packages & Itineraries Directory)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `package_code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `country` VARCHAR(100) NOT NULL,
  `destination` VARCHAR(150) NOT NULL,
  `duration_days` INT NOT NULL DEFAULT 6,
  `duration_nights` INT NOT NULL DEFAULT 5,
  `hotel_category` VARCHAR(50) DEFAULT '4 Star Deluxe',
  `hotel_details` TEXT DEFAULT NULL,
  `inclusions` TEXT DEFAULT NULL,
  `exclusions` TEXT DEFAULT NULL,
  `highlights` TEXT DEFAULT NULL,
  `itinerary_json` LONGTEXT DEFAULT NULL,
  `pricing_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pricing_usd` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `markup_percent` DECIMAL(5,2) DEFAULT 10.00,
  `original_pdf_url` VARCHAR(500) DEFAULT NULL,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_country` (`country`),
  INDEX `idx_destination` (`destination`),
  INDEX `idx_pkg_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: website_content (Live Public Website CMS Configuration)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `website_content` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_key` VARCHAR(60) NOT NULL UNIQUE,
  `section_name` VARCHAR(120) NOT NULL,
  `content_json` LONGTEXT NOT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` VARCHAR(100) DEFAULT 'Admin',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_section_key` (`section_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: suppliers (DMC Suppliers & Vendors Directory)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `destination` VARCHAR(150) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `services` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sup_destination` (`destination`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: trips (Live Running Tours & Guest Coordinator Tracking)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trips` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `trip_code` VARCHAR(50) NOT NULL UNIQUE,
  `client_name` VARCHAR(150) NOT NULL,
  `client_phone` VARCHAR(40) DEFAULT NULL,
  `destination` VARCHAR(150) NOT NULL,
  `duration` VARCHAR(50) DEFAULT '6D/5N',
  `travel_start_date` DATE NOT NULL,
  `travel_end_date` DATE NOT NULL,
  `flight_details` VARCHAR(255) DEFAULT NULL,
  `flight_sector` VARCHAR(150) DEFAULT 'BOM-DXB-BOM',
  `coordinator` VARCHAR(100) NOT NULL DEFAULT 'Nitin',
  `supplier_name` VARCHAR(150) DEFAULT NULL,
  `hotel_details` TEXT DEFAULT NULL,
  `emergency_contact` VARCHAR(100) DEFAULT '+91 98765 43210',
  `status` ENUM('Upcoming', 'Running', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Running',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_trip_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: invoices (Billing Invoices, Hotel Vouchers & Cab Details)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_no` VARCHAR(60) NOT NULL UNIQUE,
  `invoice_type` ENUM('billing', 'hotel_voucher', 'cab_details') NOT NULL DEFAULT 'billing',
  `customer_id` INT UNSIGNED DEFAULT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE DEFAULT NULL,
  `billing_description` VARCHAR(255) NOT NULL DEFAULT 'As your regards P. (Pvt Ltd)',
  `hsn_code` VARCHAR(20) DEFAULT '998555',
  `gst_rate` DECIMAL(5,2) DEFAULT 5.00,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `particulars_json` LONGTEXT DEFAULT NULL,
  `payment_status` ENUM('Unpaid', 'Paid', 'Partially Paid') NOT NULL DEFAULT 'Unpaid',
  `created_by` VARCHAR(100) DEFAULT 'Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_inv_no` (`invoice_no`),
  INDEX `idx_inv_type` (`invoice_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: settings (Centralized System & Business Configuration)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: comments (Internal remarks on documents)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `document_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `comment` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: quotations (Master Quotation JSON storage)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote_ref` VARCHAR(50) NOT NULL UNIQUE,
  `client_name` VARCHAR(150) NOT NULL,
  `client_phone` VARCHAR(50) DEFAULT NULL,
  `client_email` VARCHAR(150) DEFAULT NULL,
  `destination` VARCHAR(150) DEFAULT NULL,
  `travel_date` VARCHAR(100) DEFAULT NULL,
  `duration` VARCHAR(100) DEFAULT NULL,
  `pax_count` VARCHAR(50) DEFAULT NULL,
  `hotel_name` VARCHAR(150) DEFAULT NULL,
  `hotel_nights` VARCHAR(50) DEFAULT NULL,
  `flight_airline` VARCHAR(100) DEFAULT NULL,
  `flight_sector` VARCHAR(100) DEFAULT NULL,
  `flights_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `land_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
  `admin_remarks` TEXT DEFAULT NULL,
  `full_data_json` LONGTEXT DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT 'Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_q_ref` (`quote_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: inquiries (Direct Inquiries from Website Forms & Lead Funnel)
-- Safe, Non-Destructive: Preserves all existing client inquiries
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL DEFAULT '',
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'Website',
  `destination` VARCHAR(150) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('New', 'Fresh', 'Contacted', 'Followup', 'Follow-up', 'Prospect', 'Opportunity', 'Booking', 'Converted', 'Loss', 'Lost', 'Complete') NOT NULL DEFAULT 'New',
  `assigned_to` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_inq_phone` (`phone`),
  INDEX `idx_inq_status` (`status`),
  INDEX `idx_inq_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SEED DATA: CATEGORIES, USERS (STAFF), LEADS, PACKAGES & SETTINGS
-- ============================================================

INSERT IGNORE INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Invoices', 'Client tax invoices, billing receipts, and payment statements'),
(2, 'Quotations', 'DMC travel proposals, destination packages, and cost sheets'),
(3, 'Hotel Vouchers', 'Hotel booking confirmations, room bookings, and check-in vouchers'),
(4, 'Flight & Transport', 'Airline booking tickets, transfers, and transport vouchers'),
(5, 'Marketing & Guides', 'Destination brochures, itineraries, and travel marketing materials'),
(6, 'Itineraries', 'Day-by-day guest travel timelines and sightseeing itineraries'),
(7, 'Hotel Costings', 'Multi-tier hotel tariff comparison and costing sheets'),
(8, 'Package Summaries', 'Executive holiday package overviews and pricing summaries');

-- Staff Members (Admin + Sub-Users Kashish, Asmita, Chanchal, Ritesh, Ops)
-- Passwords:
-- Admin: Admin@123 / admin@123
-- Kashish Adwani: kashish@123
-- Asmita Kukreja: asmita@123
-- Chanchal: chanchal@123
INSERT INTO `users` (`id`, `username`, `name`, `email`, `phone`, `password_hash`, `role`, `status`) VALUES
(1, 'admin', 'Main Admin', 'admin@letsexploredmc.com', '+91 98765 00001', '$2y$10$q3gEHykTCVPbdlbWSxB/B.u/q/S5PeP6uY6r7fu9zDRw6GJMlqgKa', 'admin', 'active'),
(2, 'kashish', 'Kashish Adwani (SU-1)', 'kashish@letsexploredmc.com', '+91 98765 00002', '$2y$10$WblC6gSxpaUU6k9jSB9su.M8JyjUI2FLgQqocMFQzMaSEqmTBNvhe', 'executive', 'active'),
(3, 'asmita', 'Asmita Kukreja (SU-2)', 'asmita@letsexploredmc.com', '+91 98765 00003', '$2y$10$fetalUtjo0NdcrTsfZGHJ.g0szQ0iqVW40Y/SulL8nGt3ThYluwZO', 'executive', 'active'),
(4, 'chanchal', 'Chanchal Sharma (SU-3)', 'chanchal@letsexploredmc.com', '+91 98765 00004', '$2y$10$ECppqLfvvnXgrtJDNLxSDOjM2UneJFuBnDE2g5FD3kqdK.lRbqOBm', 'executive', 'active'),
(5, 'ritesh', 'Ritesh Verma (SU-4)', 'ritesh@letsexploredmc.com', '+91 98765 00005', '$2y$10$YDGHsqlStaf2yETHfneDIuDDP15MoKT1YnJ4dwxybn6OIcVxe3sCG', 'executive', 'active'),
(6, 'operations', 'Ops Team (SU-5)', 'ops@letsexploredmc.com', '+91 98765 00006', '$2y$10$YDGHsqlStaf2yETHfneDIuDDP15MoKT1YnJ4dwxybn6OIcVxe3sCG', 'agent', 'active')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `status` = 'active', `name` = VALUES(`name`);

-- Seed Customers
-- Dummy data for `customers` removed. Clean real-time empty state initialized.

-- Seed Leads
-- Dummy data for `leads` removed. Clean real-time empty state initialized.

-- Seed Website Inquiries
-- Dummy data for `inquiries` removed. Clean real-time empty state initialized.

-- Seed Country Packages
INSERT IGNORE INTO `packages` (`id`, `package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `pricing_inr`, `pricing_usd`, `original_pdf_url`) VALUES
(1, 'PKG-IN-01', 'Kerala God\'s Own Country Holiday', 'India', 'Munnar, Thekkady, Alleppey', 6, 5, 28500.00, 340.00, 'images/pdf/anaytours.pdf'),
(2, 'PKG-IN-02', 'Kashmir Paradise Valley Tour', 'India', 'Srinagar, Gulmarg, Pahalgam', 6, 5, 34000.00, 410.00, 'images/pdf/anaytours.pdf'),
(3, 'PKG-SG-01', 'Singapore City Wonders & Sentosa', 'Singapore', 'Singapore City, Sentosa Island', 5, 4, 48000.00, 580.00, 'images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf'),
(4, 'PKG-MY-01', 'Malaysia Skyline & Highlands', 'Malaysia', 'Kuala Lumpur, Genting Highlands', 6, 5, 32000.00, 385.00, 'images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf'),
(5, 'PKG-MY-02', 'Langkawi Island Escape & KL', 'Malaysia', 'Langkawi & Kuala Lumpur', 7, 6, 42000.00, 505.00, 'images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf'),
(6, 'PKG-ID-01', 'Bali Bliss & Cultural Ubud Tour', 'Indonesia', 'Ubud, Kuta, Nusa Penida', 6, 5, 36500.00, 440.00, 'images/pdf/Thailand_12D11N_Itinerary_Without_Rates.pdf'),
(7, 'PKG-TR-01', 'Turkey Historical & Cappadocia Caves', 'Turkey', 'Istanbul, Cappadocia', 7, 6, 68000.00, 820.00, 'images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf');

-- Seed Running Trips
-- Dummy data for `trips` removed. Clean real-time empty state initialized.

-- Seed Suppliers
-- Dummy data for `suppliers` removed. Clean real-time empty state initialized.

-- Seed Default Settings
INSERT INTO `settings` (`id`, `setting_key`, `setting_value`) VALUES
(1, 'company_name', 'Let\'s Explore DMC (Pvt Ltd)'),
(2, 'company_email', 'info@letsexploredmc.com'),
(3, 'company_phone', '+91 98765 43210'),
(4, 'company_address', 'Suite 401, Sapphire Corporate Tower, Bandra Kurla Complex, Mumbai, India'),
(5, 'company_gstin', '27AABCL1234F1Z8'),
(6, 'default_billing_desc', 'As your regards P. (Pvt Ltd)'),
(7, 'inactivity_timeout_minutes', '15'),
(8, 'ai_primary_provider', 'claude'),
(9, 'invoice_prefix', 'LEDMC-INV-2026-')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- Seed Initial Activity Log
-- Dummy data for `user_activity_logs` removed. Clean real-time empty state initialized.

-- Seed Showcase Documents in Central Repository (Universal Base Columns)
-- Dummy data for `documents` removed. Clean real-time empty state initialized.

-- --------------------------------------------------------
-- Seed Live Public Website Content
-- --------------------------------------------------------
INSERT INTO `website_content` (`id`, `section_key`, `section_name`, `content_json`, `is_published`) VALUES
(1, 'hero_banner', 'Homepage Hero Banner', '{"badge":"Official Destination Management Company","headline":"Explore More... Travel Better. With Let\'s Explore DMC.","subheadline":"Premier B2B and B2C travel experiences across Thailand, Dubai, Bali, Malaysia, Singapore, Kashmir, and Kerala. Instant custom quotations and guaranteed on-ground operations.","cta_primary_text":"Plan Your Holiday","cta_secondary_text":"Open AI Studio","bg_image_url":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop"}', 1),
(2, 'destinations', 'Featured Destinations', '[{"name":"Dubai & Abu Dhabi","region":"Middle East","desc":"Atlantis The Palm, Desert Safari, Burj Khalifa, private luxury transfers, and dhow cruise dinner.","img_url":"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&auto=format&fit=crop"},{"name":"Thailand (Phuket & Krabi)","region":"South East Asia","desc":"Phi Phi Island speedboats, luxury beach resorts, Koh Yao Yai retreat, and city cultural tours.","img_url":"https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&auto=format&fit=crop"},{"name":"Bali Island Paradise","region":"Indonesia","desc":"Private pool villas in Ubud, Nusa Penida day tours, sunset seafood dinners, and swing experiences.","img_url":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop"},{"name":"Malaysia (Kuala Lumpur & Genting)","region":"Malaysia","desc":"Petronas Twin Towers, Batu Caves, Genting SkyWorlds cable car, and Langkawi island cruises.","img_url":"https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&auto=format&fit=crop"}]', 1),
(3, 'seo_meta', 'SEO & Meta Tags', '{"meta_title":"Let\'s Explore DMC — Your Trusted Travel Partner","meta_description":"Leading Destination Management Company for bespoke leisure, honeymoon, family and corporate MICE travel packages across Asia & Europe.","meta_keywords":"DMC, travel agency, Dubai tour, Thailand package, Bali itinerary, Kashmir package, DMC Mumbai"}', 1)
ON DUPLICATE KEY UPDATE `content_json` = VALUES(`content_json`);


-- ============================================================================
-- SCHEMA V2: ENTERPRISE OPERATIONS & FINANCIAL LEDGER ADDITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_no` VARCHAR(60) NOT NULL UNIQUE,
  `quotation_id` INT UNSIGNED DEFAULT NULL,
  `lead_id` INT UNSIGNED DEFAULT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(40) NOT NULL,
  `customer_email` VARCHAR(120) DEFAULT NULL,
  `destination` VARCHAR(150) NOT NULL,
  `travel_start_date` DATE NOT NULL,
  `travel_end_date` DATE NOT NULL,
  `duration_text` VARCHAR(50) DEFAULT '6D/5N',
  `adults` INT UNSIGNED NOT NULL DEFAULT 2,
  `children` INT UNSIGNED NOT NULL DEFAULT 0,
  `infants` INT UNSIGNED NOT NULL DEFAULT 0,
  `rooms_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `exchange_rate` DECIMAL(10,4) NOT NULL DEFAULT 87.5000,
  `package_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `markup_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `subtotal_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_percent` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Draft', 'Pending Confirmation', 'Confirmed', 'Vouchers Issued', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending Confirmation',
  `payment_status` ENUM('Unpaid', 'Partially Paid', 'Paid', 'Refunded') NOT NULL DEFAULT 'Unpaid',
  `special_requests` TEXT DEFAULT NULL,
  `assigned_coordinator` VARCHAR(100) DEFAULT 'Nitin',
  `created_by_user_id` INT UNSIGNED DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_bkg_no` (`booking_no`),
  INDEX `idx_bkg_cust` (`customer_id`),
  INDEX `idx_bkg_quote` (`quotation_id`),
  INDEX `idx_bkg_status` (`status`),
  INDEX `idx_bkg_payment_status` (`payment_status`),
  INDEX `idx_bkg_dates` (`travel_start_date`, `travel_end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` INT UNSIGNED NOT NULL,
  `day_number` INT UNSIGNED DEFAULT 1,
  `item_date` DATE DEFAULT NULL,
  `item_type` ENUM('hotel', 'flight', 'transfer', 'activity', 'sightseeing', 'meal', 'visa', 'insurance', 'other') NOT NULL DEFAULT 'sightseeing',
  `service_name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `supplier_id` INT UNSIGNED DEFAULT NULL,
  `pax` INT UNSIGNED NOT NULL DEFAULT 2,
  `cost_unit_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `cost_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sell_unit_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sell_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `confirmation_status` ENUM('Pending', 'Requested', 'Confirmed', 'Rejected') NOT NULL DEFAULT 'Pending',
  `confirmation_ref` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_bi_booking` (`booking_id`),
  INDEX `idx_bi_supplier` (`supplier_id`),
  INDEX `idx_bi_type` (`item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receipt_no` VARCHAR(60) NOT NULL UNIQUE,
  `booking_id` INT UNSIGNED NOT NULL,
  `invoice_id` INT UNSIGNED DEFAULT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `payment_type` ENUM('Advance Token', 'Stage Payment', 'Full Balance', 'Security Deposit', 'Refund') NOT NULL DEFAULT 'Stage Payment',
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `exchange_rate` DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
  `amount_inr` DECIMAL(12,2) NOT NULL,
  `payment_method` ENUM('Bank Transfer (NEFT/RTGS/IMPS)', 'UPI / QR', 'Credit Card', 'Debit Card', 'Cash', 'Cheque', 'Payment Gateway') NOT NULL DEFAULT 'Bank Transfer (NEFT/RTGS/IMPS)',
  `transaction_ref` VARCHAR(120) DEFAULT NULL,
  `bank_name` VARCHAR(100) DEFAULT 'YES BANK LIMITED',
  `account_no` VARCHAR(50) DEFAULT '108163400004886',
  `payment_date` DATE NOT NULL,
  `status` ENUM('Pending', 'Verified', 'Bounced', 'Failed', 'Refunded') NOT NULL DEFAULT 'Verified',
  `notes` TEXT DEFAULT NULL,
  `recorded_by_user_id` INT UNSIGNED DEFAULT 1,
  `recorded_by_name` VARCHAR(100) DEFAULT 'Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pay_receipt` (`receipt_no`),
  INDEX `idx_pay_booking` (`booking_id`),
  INDEX `idx_pay_invoice` (`invoice_id`),
  INDEX `idx_pay_customer` (`customer_id`),
  INDEX `idx_pay_date` (`payment_date`),
  INDEX `idx_pay_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `voucher_no` VARCHAR(60) NOT NULL UNIQUE,
  `voucher_type` ENUM('hotel', 'transport', 'activity', 'flight') NOT NULL DEFAULT 'hotel',
  `booking_id` INT UNSIGNED NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `supplier_id` INT UNSIGNED DEFAULT NULL,
  `trip_id` INT UNSIGNED DEFAULT NULL,
  `supplier_confirmation_no` VARCHAR(100) DEFAULT NULL,
  `service_title` VARCHAR(255) NOT NULL,
  `service_location` VARCHAR(255) DEFAULT NULL,
  `maps_url` VARCHAR(500) DEFAULT NULL,
  `valid_from_date` DATE NOT NULL,
  `valid_to_date` DATE DEFAULT NULL,
  `check_in_time` VARCHAR(30) DEFAULT '14:00',
  `check_out_time` VARCHAR(30) DEFAULT '11:00',
  `room_type` VARCHAR(150) DEFAULT NULL,
  `meal_plan` VARCHAR(100) DEFAULT 'Breakfast Included',
  `rooms_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `vehicle_type` VARCHAR(100) DEFAULT NULL,
  `driver_name` VARCHAR(120) DEFAULT NULL,
  `driver_contact` VARCHAR(50) DEFAULT NULL,
  `guest_details_json` LONGTEXT DEFAULT NULL,
  `inclusions_text` TEXT DEFAULT NULL,
  `important_instructions` TEXT DEFAULT NULL,
  `emergency_contact` VARCHAR(100) DEFAULT '+91 80075 86881',
  `status` ENUM('Draft', 'Issued', 'Used', 'Cancelled') NOT NULL DEFAULT 'Issued',
  `voucher_pdf_path` VARCHAR(500) DEFAULT NULL,
  `created_by_user_id` INT UNSIGNED DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_vch_no` (`voucher_no`),
  INDEX `idx_vch_booking` (`booking_id`),
  INDEX `idx_vch_customer` (`customer_id`),
  INDEX `idx_vch_supplier` (`supplier_id`),
  INDEX `idx_vch_type` (`voucher_type`),
  INDEX `idx_vch_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `supplier_assignments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `po_number` VARCHAR(60) NOT NULL UNIQUE,
  `booking_id` INT UNSIGNED NOT NULL,
  `supplier_id` INT UNSIGNED NOT NULL,
  `service_description` TEXT NOT NULL,
  `agreed_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `supplier_payment_status` ENUM('Unpaid', 'Advance Paid', 'Settled') NOT NULL DEFAULT 'Unpaid',
  `supplier_paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `assigned_coordinator` VARCHAR(100) DEFAULT 'Nitin',
  `status` ENUM('Assigned', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Assigned',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sa_booking` (`booking_id`),
  INDEX `idx_sa_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
