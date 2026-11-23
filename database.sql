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
  `hotel_category` VARCHAR(100) DEFAULT '4 Star Deluxe',
  `hotel_details` TEXT DEFAULT NULL,
  `inclusions` TEXT DEFAULT NULL,
  `exclusions` TEXT DEFAULT NULL,
  `highlights` TEXT DEFAULT NULL,
  `itinerary_json` LONGTEXT DEFAULT NULL,
  `full_data` LONGTEXT DEFAULT NULL,
  `pricing_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pricing_usd` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `markup_percent` DECIMAL(5,2) DEFAULT 10.00,
  `client_name` VARCHAR(150) DEFAULT 'Valued Traveler',
  `client_phone` VARCHAR(40) DEFAULT NULL,
  `client_email` VARCHAR(120) DEFAULT NULL,
  `doc_type` VARCHAR(50) NOT NULL DEFAULT 'quotation',
  `version` INT UNSIGNED NOT NULL DEFAULT 1,
  `file_path` VARCHAR(500) DEFAULT NULL,
  `source_drive_file` VARCHAR(255) DEFAULT NULL,
  `original_pdf_url` VARCHAR(500) DEFAULT NULL,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pkg_code` (`package_code`),
  INDEX `idx_country` (`country`),
  INDEX `idx_destination` (`destination`),
  INDEX `idx_pkg_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: package_versions (Historical Versions & Full Rollback Snapshots)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `package_versions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `package_id` INT UNSIGNED NOT NULL,
  `package_code` VARCHAR(50) NOT NULL,
  `version` INT UNSIGNED NOT NULL DEFAULT 1,
  `change_summary` VARCHAR(255) DEFAULT NULL,
  `doc_type` VARCHAR(50) DEFAULT 'quotation',
  `full_data` LONGTEXT NOT NULL,
  `pricing_inr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pricing_usd` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_by` VARCHAR(100) DEFAULT 'AI Studio',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pv_pkg` (`package_id`),
  INDEX `idx_pv_ver` (`package_id`, `version`)
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
  `coordinator` VARCHAR(100) NOT NULL DEFAULT 'Operations',
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

-- Staff Members (Admin + Sub-Users Kashish, Asmita, Chanchal)
-- Passwords:
-- Admin: Admin@123 / admin@123
-- Kashish Adwani: kashish@123
-- Asmita Kukreja: asmita@123
-- Chanchal: chanchal@123
INSERT INTO `users` (`id`, `username`, `name`, `email`, `phone`, `password_hash`, `role`, `status`) VALUES
(1, 'admin', 'Let\'s Explore DMC', 'admin@letsexploredmc.com', '+91 98765 00001', '$2y$10$q3gEHykTCVPbdlbWSxB/B.u/q/S5PeP6uY6r7fu9zDRw6GJMlqgKa', 'admin', 'active'),
(2, 'kashish', 'Kashish Adwani (SU-1)', 'kashish@letsexploredmc.com', '+91 98765 00002', '$2y$10$WblC6gSxpaUU6k9jSB9su.M8JyjUI2FLgQqocMFQzMaSEqmTBNvhe', 'executive', 'active'),
(3, 'asmita', 'Asmita Kukreja (SU-2)', 'asmita@letsexploredmc.com', '+91 98765 00003', '$2y$10$fetalUtjo0NdcrTsfZGHJ.g0szQ0iqVW40Y/SulL8nGt3ThYluwZO', 'executive', 'active'),
(4, 'chanchal', 'Chanchal Sharma (SU-3)', 'chanchal@letsexploredmc.com', '+91 98765 00004', '$2y$10$ECppqLfvvnXgrtJDNLxSDOjM2UneJFuBnDE2g5FD3kqdK.lRbqOBm', 'executive', 'active')', 'ops@letsexploredmc.com', '+91 98765 00006', '$2y$10$YDGHsqlStaf2yETHfneDIuDDP15MoKT1YnJ4dwxybn6OIcVxe3sCG', 'agent', 'active')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `status` = 'active', `name` = VALUES(`name`);

-- Seed Customers
-- Dummy data for `customers` removed. Clean real-time empty state initialized.

-- Seed Leads
-- Dummy data for `leads` removed. Clean real-time empty state initialized.

-- Seed Website Inquiries
-- Dummy data for `inquiries` removed. Clean real-time empty state initialized.

-- Seed Country Packages
-- Clean real-time empty state initialized (0 dummy packages). Real packages created via Admin Portal.

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
  `assigned_coordinator` VARCHAR(100) DEFAULT 'Operations',
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
  `assigned_coordinator` VARCHAR(100) DEFAULT 'Operations',
  `status` ENUM('Assigned', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Assigned',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sa_booking` (`booking_id`),
  INDEX `idx_sa_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Seed Data: 33 Authentic Destination Packages (PDF & DOCX Itineraries)
-- --------------------------------------------------------
INSERT INTO `packages` (`id`, `package_code`, `name`, `country`, `destination`, `duration_days`, `duration_nights`, `hotel_category`, `hotel_details`, `pricing_inr`, `pricing_usd`, `markup_percent`, `highlights`, `inclusions`, `exclusions`, `is_published`, `status`, `source_drive_file`, `file_path`, `created_at`) VALUES
(100, 'PKG-MLE-VN-DINING', 'Villa Nautica Maldives — Candle Light & Beach Dining Experiences (With Decoration)', 'Maldives', 'Paradise Island, Maldives', 1, 0, '5-Star Luxury Resort Dining', 'Villa Nautica Paradise Island Maldives (7 Romantic Dining Selections with Decoration)', 35000.00, 400.00, 15.00, 'Candle Light Dinner ($400++), Dig-In Beach Dinner ($488++), Seafood Lunch ($256++-$322++), Vegetarian Dinner ($340++), Oriental Night ($488++), Private BBQ ($368++), Crow''s Nest ($396++)', 'Private Beachfront Canopy Setup, Floral Decoration, Candlelit Path, Ambient Lanterns, Personalized Welcome Board, Dedicated Private Server & Multi-Course Dining', 'Beverages / Alcohol unless specified, International Airfare, Resort Accommodation (Available as separate booking)', 1, 'active', 'VillaNautica_Maldives_Dining_Experiences_Doubled.html', 'uploads/VillaNautica_Maldives_Dining_Experiences_Doubled.html', '2026-11-17 17:00:00'),
(201, 'PKG-IN-KER-52400', 'Kerala Scenic Hills & Backwaters — Arti Meghani Tour (7D/6N)', 'India', 'Munnar, Thekkady & Alleppey Houseboat, Kerala', 7, 6, '4-Star Deluxe Resorts & Private Houseboat', '2N Munnar Tea Valley + 1N Thekkady Spice Resort + 1N Alleppey Deluxe Houseboat + 2N Cochin', 52400.00, 630.00, 12.00, 'Munnar Tea Plantations, Eravikulam National Park, Mattupetty Dam, Periyar Wildlife Sanctuary boating, Traditional Alleppey Backwater cruise with onboard freshly cooked Kerala meals, Fort Kochi heritage walk', '6 Nights Deluxe Stay, Daily Breakfast & All Meals on Houseboat, Dedicated AC Sedan Cochin-to-Cochin, Fuel, Toll, Driver Allowance', 'Flight/Train tickets, Monument entry & boating fees, Personal expenses', 1, 'active', 'Arti-meghani_KERALA-52400.pdf', 'uploads/packages/Arti-meghani_KERALA-52400.pdf', '2026-11-17 14:00:00'),
(202, 'PKG-VN-HAN-20927', 'Vietnam Grand Explorer — Ashutosh Sahu Tour (10D/9N)', 'Vietnam', 'Hanoi, Halong Bay, Da Nang, Hoi An & Ba Na Hills', 10, 9, '4-Star & 5-Star Luxury Cruise', 'Hanoi Golden Silk + 5-Star Overnight Halong Bay Cruise + Da Nang Beachfront Resort + Hoi An Ancient Boutique', 148000.00, 1780.00, 15.00, 'Overnight 5-Star Halong Bay Cruise with kayaking and cave discovery, Sun World Ba Na Hills Golden Bridge, Hoi An lantern ancient town, Hanoi Old Quarter street food tour, Marble Mountains', '9 Nights Accommodation, Full Board on Halong Cruise, Ba Na Hills Cable Car & Golden Bridge tickets, Private Airport Transfers, English Speaking Guide', 'International Flights, Vietnam Visa stamping fee, Beverages & personal tips', 1, 'active', 'ashutosh-sahu_VIETNAM-TRIP-20927.pdf', 'uploads/packages/ashutosh-sahu_VIETNAM-TRIP-20927.pdf', '2026-11-17 14:00:00'),
(203, 'PKG-SG-SIN-24589', 'Singapore Super Saver — Chabbra Dental Clinic Tour (7D/6N)', 'Singapore', 'Singapore City & Sentosa Island', 7, 6, '4-Star Deluxe City Hotel', 'Orchard / Marina Bay Area 4-Star Hotel with daily buffet breakfast', 82800.00, 995.00, 12.00, 'Universal Studios Singapore full day pass with Express access, Sentosa Island Cable Car, Wings of Time fireworks show, Gardens by the Bay Cloud Forest & Flower Dome, Marina Bay Sands SkyPark observation deck', '6 Nights Stay with Daily Breakfast, Return Airport Transfers, All attraction entrance tickets mentioned, AC Minivan Coach transfers', 'Airfare, Singapore Visa, Meals outside breakfast, Personal expenses', 1, 'active', 'chabbra-dental-clinic_SINGAPORE-TRIP-24589.pdf', 'uploads/packages/chabbra-dental-clinic_SINGAPORE-TRIP-24589.pdf', '2026-11-17 14:00:00'),
(204, 'PKG-IN-KER-54486', 'Kerala Exotic Wilderness & Houseboat — Darshan D Tour (7D/6N)', 'India', 'Cochin, Munnar, Thekkady, Alleppey & Kovalam', 7, 6, 'Deluxe Hill & Coastal Resorts', 'Luxury Resorts with valley views + Private Houseboat', 54486.00, 655.00, 10.00, 'Cheeyappara & Valara waterfalls, Tea Museum & processing tour, Spice plantations walk, Kathakali & Kalaripayattu martial arts show, Alleppey backwaters Vembanad lake cruise', '6 Nights Accommodation, Daily Breakfast, Houseboat all meals (Kerala Cuisine), AC Vehicle for full itinerary', 'Airfare, Elephant rides & spice garden entry, Personal tipping', 1, 'active', 'darshan-D_KERALA-54486.pdf', 'uploads/packages/darshan-D_KERALA-54486.pdf', '2026-11-17 14:00:00'),
(205, 'PKG-ID-DPS-26456', 'Bali Tropical Paradise Escape — Mohit Kodwani Tour (7D/6N)', 'Indonesia', 'Kuta, Seminyak, Ubud & Nusa Penida, Bali', 7, 6, '4-Star Beach Resort & Ubud Jungle Pool Villa', '4N Kuta/Seminyak Resort + 2N Ubud Private Pool Villa', 26456.00, 320.00, 15.00, 'Nusa Penida West Island tour (Kelingking Beach, Broken Beach, Angel Billabong, Crystal Bay), Ubud Aloha Swing & Tegalalang Rice Terrace, Kintamani Volcano view with Indonesian lunch, Uluwatu sunset sea temple & Kecak dance', '6 Nights Stay, Daily Breakfast, Return Fastboat to Nusa Penida, Private AC Minivan for all tours, English speaking Balinese driver-guide', 'Flight tickets, Indonesia Tourist Visa ($35 on arrival), Lunches & Dinners unless specified', 1, 'active', 'MOHIT-KODWANI_Bali-Indonesia-26456.pdf', 'uploads/packages/MOHIT-KODWANI_Bali-Indonesia-26456.pdf', '2026-11-17 14:00:00'),
(206, 'PKG-MY-KUL-12225', 'Malaysia with Bali Duo Explorer — Mohit Kodwani Tour (8D/7N)', 'Malaysia', 'Kuala Lumpur, Genting & Bali Island', 8, 7, '4-Star City & Island Resorts', '3N Kuala Lumpur City Centre + 4N Bali Seminyak Resort', 122138.00, 1470.00, 12.00, 'Petronas Twin Towers photo stop, Batu Caves Murugan Temple, Genting Skyway Cable Car, Tanjung Benoa Watersports (Banana Boat, Jet Ski), Tanah Lot Sunset Temple', '7 Nights Accommodation, Daily Breakfast, Inter-city AC transfers, Genting Cable Car tickets, All listed sightseeing tours with transfers', 'International & Inter-country air tickets, Malaysia Tourism Tax (MYR 10/night), Personal tipping', 1, 'active', 'Mohit-Kodwani_Malaysia-with-Bali-12225.pdf', 'uploads/packages/Mohit-Kodwani_Malaysia-with-Bali-12225.pdf', '2026-11-17 14:00:00'),
(207, 'PKG-TH-HKT-DEC12', 'Thailand Phuket & Bangkok Festive Grand Tour (12D/11N)', 'Thailand', 'Phuket, Phi Phi, Krabi & Bangkok', 12, 11, '5-Star & 4-Star Deluxe Beach Resorts', 'My Beach Resort Phuket + Ramada by Wyndham / Panwaburi Resort + Bangkok Luxury Hotel', 168000.00, 2020.00, 12.00, 'Phuket City Tour & Promthep Cape Sunset, Phi Phi Island & Maya Bay speedboat tour with buffet lunch, James Bond Island sea canoeing, Bangkok Grand Palace & Chao Phraya Dinner Cruise', '11 Nights Stay with Daily Breakfast, All speedboat island excursions with national park fees, Private airport & pier transfers, Bangkok temple tour', 'International flights, Personal expenses, Alcoholic beverages', 1, 'active', 'Package_tour_21_Dec_till_27_Dec_Phuket_27_Dec_till_1_Jan_12pct_markup.pdf', 'uploads/packages/Package_tour_21_Dec_till_27_Dec_Phuket_27_Dec_till_1_Jan_12pct_markup.pdf', '2026-11-17 14:00:00'),
(208, 'PKG-AE-DXB-75610', 'Dubai Luxury Skyline & Desert Safari — Pax Trip (5D/4N)', 'UAE', 'Dubai & Arabian Desert, UAE', 5, 4, '4-Star Deluxe Millennium / Grand Excelsior', 'Premium Dubai City Hotel with rooftop pool & central Metro connectivity', 42598.00, 515.00, 12.00, 'Burj Khalifa 124th Floor At the Top observation ticket, Red Dune Desert Safari with 4x4 Dune Bashing, Camel ride, Tanoura & Belly Dance with BBQ dinner, Dubai Marina Luxury Dhow Cruise with buffet dinner, Dubai Frame visit', '4 Nights Accommodation, Daily Breakfast, Desert Safari with BBQ, Dhow Cruise Dinner, All Private AC Transfers, 5% UAE VAT', 'International Flight, UAE Tourist Visa, Tourism Dirham Fee, Lunches', 1, 'active', 'pax-trip_DUBAI-TOUR-75610.pdf', 'uploads/packages/pax-trip_DUBAI-TOUR-75610.pdf', '2026-11-17 14:00:00'),
(209, 'PKG-MY-KUL-82107', 'Malaysia Twin Wonders — Pax Trip (5D/4N)', 'Malaysia', 'Kuala Lumpur & Genting Highlands, Malaysia', 5, 4, '4-Star Central City Hotel', 'Dorsett / Furama Bukit Bintang + Genting First World Resort', 39364.00, 475.00, 12.00, 'KL Tower observation deck, Batu Caves rainbow steps, Genting Skyway Cable Car, Chin Swee Caves Temple, Putrajaya administrative capital tour & cruise', '4 Nights Stay with Daily Breakfast, Return Airport Transfers, Two-way Genting Cable Car, AC Minivan transfers with driver', 'Airfare, Malaysia Tourism Tax (MYR 10/rm/night), Theme park entry tickets', 1, 'active', 'pax-trip_MALAYSIA-TOUR-82107.pdf', 'uploads/packages/pax-trip_MALAYSIA-TOUR-82107.pdf', '2026-11-17 14:00:00'),
(210, 'PKG-SG-SIN-62898', 'Singapore City & Universal Thrills — Pax Trip (5D/4N)', 'Singapore', 'Singapore City & Sentosa Island', 5, 4, '4-Star Hotel City Centre', 'Hotel Boss / V Hotel Lavender with MRT direct access', 58563.00, 705.00, 12.00, 'Universal Studios Singapore full day adventure pass, Night Safari with tram ride, Gardens by the Bay Flower Dome & Supertree Grove, Sentosa Cable Car Sky Pass', '4 Nights Accommodation, Daily Breakfast, Return Changi Airport Transfers, All attraction tickets with shared transfers', 'Airfare, Singapore Visa, Meals outside breakfast', 1, 'active', 'pax-trip_SINGAPORE-TRIP-62898.pdf', 'uploads/packages/pax-trip_SINGAPORE-TRIP-62898.pdf', '2026-11-17 14:00:00'),
(211, 'PKG-LK-CMB-87074', 'Sri Lanka Cultural & Scenic Trail — Pax Trip (5D/4N)', 'Sri Lanka', 'Colombo, Kandy, Nuwara Eliya & Bentota, Sri Lanka', 5, 4, '4-Star Deluxe Resorts', '1N Kandy Hill Resort + 1N Nuwara Eliya Tea Country + 1N Bentota Beachfront + 1N Colombo', 23064.00, 280.00, 15.00, 'Pinnawala Elephant Orphanage, Temple of the Sacred Tooth Relic Kandy, Nuwara Eliya tea factory & Ramboda falls, Madu River boat safari with cinnamon island visit, Colombo city & shopping tour', '4 Nights Stay with Daily Breakfast, AC Private Car with English speaking chauffeur-guide for full tour, All toll & parking charges', 'Airfare, Sri Lanka ETA Visa fee, Entry tickets to monuments, Lunch & Dinners', 1, 'active', 'pax-trip_srilanka-87074.pdf', 'uploads/packages/pax-trip_srilanka-87074.pdf', '2026-11-17 14:00:00'),
(212, 'PKG-ID-DPS-QUOT', 'Bali Luxury Island Escape — Official DMC Quotation (7D/6N)', 'Indonesia', 'Kuta, Ubud, Bedugul & Nusa Dua, Bali', 7, 6, '4-Star Beach Resort & Luxury Villa', 'Grand Mirage / Aston Kuta + Ubud Royal Villa with private plunge pool', 39014.00, 470.00, 12.00, 'Ulun Danu Beratan Lake Temple, Handara Iconic Gate, Wanagiri Hidden Hills selfie spot, Waterblow Nusa Dua, Jimbaran Bay Candle Light Seafood Dinner by the waves', '6 Nights Stay, Daily Breakfast, Candlelight Dinner at Jimbaran Beach, Full sightseeing tours in private AC car with dedicated driver', 'Flight tickets, Indonesia Tourist Visa ($35), Water sports activities on spot', 1, 'active', 'Quotation - bali.pdf', 'uploads/packages/Quotation - bali.pdf', '2026-11-17 14:00:00'),
(213, 'PKG-CN-CAN-FAIR', 'China Canton Fair & Guangzhou City Highlights (7D/6N)', 'China', 'Guangzhou & Pearl River, China', 7, 6, '4-Star Business & Trade Hotel', 'Central Guangzhou Hotel near Pazhou Complex / Metro with shuttle service', 79200.00, 950.00, 12.00, 'Canton Fair trade complex visits, Canton Tower observation deck, Pearl River evening cruise with city illumination, Shamian Island European architecture, Beijing Road shopping pedestrian street', '6 Nights Accommodation with Daily Breakfast, Airport & Fair shuttle transfers, Pearl River Cruise tickets, English speaking tour guide', 'China Visa invitation letter fee, International flights, Lunches & dinners', 1, 'active', 'Quotation - canton.pdf', 'uploads/packages/Quotation - canton.pdf', '2026-11-17 14:00:00'),
(214, 'PKG-AE-DXB-RHVI', 'Dubai Marina & Burj Skyline — Rahul Vi Tour (7D/6N)', 'UAE', 'Dubai Marina, Palm Jumeirah & Downtown, UAE', 7, 6, '4-Star Deluxe Marina Hotel', 'Millennium Place Dubai Marina / Stella Di Mare with marina views', 64410.00, 775.00, 12.00, 'Burj Khalifa 124th Floor At the Top non-prime ticket, Red Dunes Desert Safari with quad bike option & BBQ buffet, Miracle Garden & Global Village entry tickets, Luxury Dubai Marina Mega Yacht Cruise with dinner', '6 Nights Stay, Daily Breakfast, Mega Yacht Cruise Dinner, Desert Safari with BBQ, All Private AC Transfers, 5% UAE VAT', 'International Flights, UAE Visa, Tourism Dirham Fee', 1, 'active', 'Quotation - DUBAI rahul vi.pdf', 'uploads/packages/Quotation - DUBAI rahul vi.pdf', '2026-11-17 14:00:00'),
(215, 'PKG-AE-DXB-6D5N', 'Dubai Extravaganza with Miracle Garden (6D/5N)', 'UAE', 'Dubai, Palm Jumeirah & Desert, UAE', 6, 5, '4-Star Deluxe', '4-Star Hotel in Al Barsha / Bur Dubai with swimming pool & gym', 66848.00, 805.00, 12.00, 'Half day Dubai City tour (Gold Souk, Spice Souk, Dubai Creek Abra ride, Jumeirah Beach photo stop), Burj Khalifa 124th floor, Desert Safari with BBQ, Dhow Cruise Marina', '5 Nights Stay with Daily Breakfast, Desert Safari BBQ Dinner, Dhow Cruise Dinner, Private AC Transfers for all tours', 'Airfare, UAE Visa, Tourism Dirham (AED 15/rm/night)', 1, 'active', 'Quotation - DUBAI TOUR.pdf', 'uploads/packages/Quotation - DUBAI TOUR.pdf', '2026-11-17 14:00:00'),
(216, 'PKG-SG-SIN-6D5N', 'Singapore Complete Family Discovery (6D/5N)', 'Singapore', 'Singapore & Sentosa Island', 6, 5, '4-Star Deluxe', '4-Star City Hotel (Novotel / Furama / Hotel Boss)', 56784.00, 685.00, 12.00, 'Singapore City Tour (Merlion Park, Chinatown, Little India), Sentosa Island Cable Car + S.E.A. Aquarium + Wings of Time, Universal Studios Singapore full day, Gardens by the Bay', '5 Nights Stay, Daily Breakfast, All Transfers & Attraction tickets on SIC / Private basis', 'Airfare, Singapore Visa, Personal expenses', 1, 'active', 'Quotation - SINGAPORE TRIP.pdf', 'uploads/packages/Quotation - SINGAPORE TRIP.pdf', '2026-11-17 14:00:00'),
(217, 'PKG-TH-HKT-6D5N', 'Thailand Phuket & Krabi Island Escapes (6D/5N)', 'Thailand', 'Phuket & Krabi, Thailand', 6, 5, '4-Star Deluxe Beach Resorts', '3N Ashlee Plaza Patong Phuket + 2N GLOW Ao Nang Krabi Resort', 100614.00, 1210.00, 15.00, 'Phi Phi Island + Khai Island speedboat excursion with buffet lunch, James Bond Island & Phang Nga Bay sea canoeing, Krabi 4 Islands tour by longtail boat, Inter-destination land transfer', '5 Nights Accommodation with Daily Breakfast, All speedboat island tours with buffet lunch & national park fees, Private airport & inter-city AC transfers', 'International Flights, Thailand Visa on arrival fees, Personal water sports', 1, 'active', 'Quotation - thailand.pdf', 'uploads/packages/Quotation - thailand.pdf', '2026-11-17 14:00:00'),
(218, 'PKG-HK-HKG-98386', 'Hong Kong & Macau Adventure — Rahul Vi Tour (7D/6N)', 'Hong Kong', 'Hong Kong Island, Kowloon & Macau', 7, 6, '4-Star Central Hotel', '4N Hong Kong City Centre Hotel + 2N Macau 4-Star Resort', 130985.00, 1575.00, 12.00, 'Victoria Peak tram ride & Sky Terrace 428, Hong Kong Disneyland full day 1-day pass, Ocean Park thrill rides & giant panda exhibit, TurboJET ferry to Macau, Ruins of St. Paul''s & Venetian Macau casino visit', '6 Nights Stay with Daily Breakfast, Disneyland & Ocean Park tickets, Two-way TurboJET ferry Hong Kong - Macau, All airport and city tour transfers', 'International Airfare, Visa fees (PAR registration for Indians is free online), Personal tipping', 1, 'active', 'rahul-vi_hong-kong-tour-98386.pdf', 'uploads/packages/rahul-vi_hong-kong-tour-98386.pdf', '2026-11-17 14:00:00'),
(219, 'PKG-TH-BKK-96090', 'Thailand Complete Bangkok & Pattaya — Rajesh Chawla Tour (8D/7N)', 'Thailand', 'Pattaya & Bangkok, Thailand', 8, 7, '4-Star Deluxe Resorts', '4N Pattaya Beach Resort + 3N Bangkok Sukhumvit Hotel', 62362.00, 750.00, 12.00, 'Coral Island speedboat tour with Indian buffet lunch, Alcazar Cabaret VIP show, Nong Nooch Tropical Botanical Garden & cultural elephant show, Bangkok Golden Buddha & Marble Temple tour, Safari World & Marine Park with lunch', '7 Nights Accommodation, Daily Breakfast, Coral Island with Lunch, Safari World with Lunch, All Transfers in Private AC Minivan', 'International Flights, Water sports in Pattaya (parasailing, undersea walk), Personal shopping', 1, 'active', 'Rajesh-chawla_THAILAND-TOUR-96090.pdf', 'uploads/packages/Rajesh-chawla_THAILAND-TOUR-96090.pdf', '2026-11-17 14:00:00'),
(220, 'PKG-SG-SIN-54916', 'Singapore Quick Escape — Shyam Lalwani Tour (4D/3N)', 'Singapore', 'Singapore City & Sentosa Island', 4, 3, '4-Star City Centre Hotel', 'Hotel Boss / V Hotel Bencoolen (Centrally Located)', 52062.00, 625.00, 12.00, 'Sentosa Island Cable Car + Madame Tussauds 4-in-1, Marina Bay Sands observation deck, Night Safari tram ride, Half day city tour with Merlion photo stop', '3 Nights Stay with Daily Breakfast, Return Airport Transfers, Listed attraction tickets with shared transfers', 'Airfare, Singapore Visa, Personal shopping and meals outside breakfast', 1, 'active', 'Shyam-lalwani_SINGAPORE-54916.pdf', 'uploads/packages/Shyam-lalwani_SINGAPORE-54916.pdf', '2026-11-17 14:00:00'),
(221, 'PKG-IN-UJJ-13258', 'Ujjain Mahakal & Omkareshwar Divine Yatra — Suman Bhartia (5D/4N)', 'India', 'Indore, Ujjain, Omkareshwar & Maheshwar, India', 5, 4, '3-Star & 4-Star Premium Heritage Hotels', '2N Ujjain Deluxe Hotel near Temple + 2N Indore Central Hotel', 27708.00, 335.00, 10.00, 'Mahakaleshwar Jyotirlinga Bhasma Aarti VIP Darshan assistance, Mahakal Lok Corridor walking tour, Omkareshwar Jyotirlinga & Narmada river boat ride, Maheshwar Ahilya Fort & Narmada Ghats, Indore Sarafa Night Food Market', '4 Nights Accommodation, Daily Breakfast, Dedicated AC Sedan for full tour Indore-to-Indore, Toll, Parking & Driver allowances', 'Special pooja / Bhasma Aarti official trust fees, Train / Flight tickets, Meals outside breakfast', 1, 'active', 'suman-bhartia_ujjain-13258.pdf', 'uploads/packages/suman-bhartia_ujjain-13258.pdf', '2026-11-17 14:00:00'),
(222, 'PKG-KG-FRU-3N4D', 'Kyrgyzstan Bishkek & Ala-Archa Nature Discovery (4D/3N)', 'Kyrgyzstan', 'Bishkek & Ala-Archa National Park, Kyrgyzstan', 4, 3, '4-Star City Centre Hotel', 'Plaza Hotel Bishkek / Orion Hotel (4-Star)', 38500.00, 460.00, 15.00, 'Ala-Archa Gorge panoramic alpine hike, Ala-Too Central Square, Oak Park & Open-Air Sculpture Museum, Osh Bazaar traditional spices & dry fruits, Traditional Kyrgyz folklore dinner', '3 Nights 4-Star Accommodation, Daily Breakfast, Ala-Archa National Park entry & transfers, Private AC Vehicle for all tours, English speaking guide', 'International Airfare, Kyrgyzstan E-Visa, Lunches & dinners unless specified', 1, 'active', '3N_Kyrgyzstan_itinerary_LetsExploreDMC.docx', 'uploads/itineraries/3N_Kyrgyzstan_itinerary_LetsExploreDMC.docx', '2026-11-17 14:00:00'),
(223, 'PKG-AM-EVN-5N6D', 'Armenia Yerevan & Lake Sevan Discovery (6D/5N)', 'Armenia', 'Yerevan, Garni, Geghard & Lake Sevan, Armenia', 6, 5, '4-Star Boutique City Hotel', 'Ani Plaza Hotel Yerevan / Opera Suite Hotel (4-Star)', 54000.00, 650.00, 15.00, 'Garni Pagan Temple & Symphony of Stones basalt gorge, Geghard UNESCO rock-cut monastery with traditional lavash bread baking masterclass, Lake Sevan high-altitude blue lake & Sevanavank monastery, Yerevan Cascade & Republic Square dancing fountains', '5 Nights 4-Star Stay, Daily Breakfast, Lavash baking masterclass with lunch, All entrance fees, Dedicated AC Mercedes Sprinter/Minivan, Professional English guide', 'International Flights, Armenia Visa, Personal expenses', 1, 'active', '5N Armenia itinerary.docx', 'uploads/itineraries/5N Armenia itinerary.docx', '2026-11-17 14:00:00'),
(224, 'PKG-AZ-BAK-5N6D', 'Azerbaijan Baku & Land of Fire Discovery (6D/5N)', 'Azerbaijan', 'Baku, Gobustan & Absheron, Azerbaijan', 6, 5, '4-Star & 5-Star Central Hotel', 'Midtown Hotel Baku / Courtyard by Marriott Baku (4-Star)', 48500.00, 585.00, 15.00, 'Baku Old City Icherisheher (Maiden Tower & Shirvanshahs'' Palace), Flame Towers & Highland Park Caspian Sea panoramic view, Gobustan Rock Art & active Mud Volcanoes, Ateshgah Zoroastrian Fire Temple & Yanar Dag Burning Mountain', '5 Nights Hotel Stay, Daily Buffet Breakfast, Return Baku Heydar Aliyev Airport Transfers, Gobustan 4x4 Mud Volcano ride, All entrance tickets & private transport', 'International Flights, ASAN Visa fee ($26), Meals outside breakfast', 1, 'active', '5N_Baku_itinerary_LetsExploreDMC.docx', 'uploads/itineraries/5N_Baku_itinerary_LetsExploreDMC.docx', '2026-11-17 14:00:00'),
(225, 'PKG-EG-CAI-4N5D', 'Egypt Cairo Pyramids & Pharaoh Heritage (5D/4N)', 'Egypt', 'Cairo, Giza & Nile, Egypt', 5, 4, '4-Star & 5-Star Pyramid View Hotel', 'Steigenberger Pyramids Cairo / Ramses Hilton (Pyramid/Nile View)', 46000.00, 550.00, 15.00, 'Great Pyramids of Giza (Khufu, Khafre, Menkaure) & Great Sphinx, Grand Egyptian Museum (GEM) & Tutankhamun golden treasures, Sakkara Step Pyramid, Khan El-Khalili medieval bazaar, Nile River traditional felucca sail', '4 Nights Accommodation, Daily Breakfast, Private Egyptologist tour guide for all excursions, All entrance tickets to Giza plateau & museum, AC transport', 'International Flights, Entry inside Pyramids, Egypt Visa on arrival, Tipping to guides/drivers', 1, 'active', 'Egypt_4nights_Cairo.docx', 'uploads/itineraries/Egypt_4nights_Cairo.docx', '2026-11-17 14:00:00'),
(226, 'PKG-EG-EGY-8N9D', 'Egypt Grand Wonders — Cairo, 5-Star Nile Cruise & Hurghada (9D/8N)', 'Egypt', 'Cairo, Aswan, Kom Ombo, Edfu, Luxor & Hurghada Red Sea', 9, 8, '5-Star Hotels & 5-Star Deluxe Nile Cruise', '3N Cairo Hotel + 3N 5-Star Deluxe Nile Cruise Ship (Full Board) + 2N Hurghada All-Inclusive Red Sea Resort', 92000.00, 1100.00, 15.00, 'Giza Pyramids & Sphinx, High Dam Aswan & Philae Temple, Kom Ombo crocodile temple, Edfu Horus temple by horse carriage, Valley of the Kings Luxor & Karnak Temple, Hurghada Red Sea snorkeling & private beach relaxation', '8 Nights Stay (including 3N Full Board Nile Cruise & 2N All-Inclusive Hurghada Resort), All sightseeing with licensed Egyptologist, Inter-city transfers', 'International & domestic Cairo-Aswan/Hurghada-Cairo flights, Hot air balloon over Luxor, Egypt Visa', 1, 'active', 'Egypt_8N_-_Cairo-Cruise-Hurghada.docx', 'uploads/itineraries/Egypt_8N_-_Cairo-Cruise-Hurghada.docx', '2026-11-17 14:00:00'),
(227, 'PKG-JO-AMM-5N6D', 'Jordan Kingdom Classic — Dead Sea, Petra & Wadi Rum (6D/5N)', 'Jordan', 'Amman, Jerash, Dead Sea, Petra & Wadi Rum Desert', 6, 5, '4-Star Hotels & Luxury Martian Bubble Desert Camp', '2N Amman Hotel + 1N Dead Sea Resort with private beach + 1N Petra Hotel + 1N Wadi Rum Luxury Desert Camp', 78000.00, 940.00, 15.00, 'Float in mineral-rich Dead Sea waters with mud therapy, Full day exploration of the UNESCO Wonder Rose-Red City of Petra through the Siq to the Treasury, 2-Hour 4x4 Bedouin Jeep Tour across red sand dunes of Wadi Rum, Jerash Roman ruins', '5 Nights Stay, Daily Breakfast & Traditional Zarb Dinner in Wadi Rum, 2-Hour 4x4 Jeep Tour in Wadi Rum, Petra entrance ticket, Private AC Car with English speaking chauffeur', 'International Flights, Jordan Visa (waived with Jordan Pass / group regulations), Lunches & personal drinks', 1, 'active', 'LetsExplore_Jordan_5nights_DeadSea-Petra-WadiRum-Amman.docx', 'uploads/itineraries/LetsExplore_Jordan_5nights_DeadSea-Petra-WadiRum-Amman.docx', '2026-11-17 14:00:00'),
(228, 'PKG-TR-IST-6N7D', 'Turkey Fairy Tale — Istanbul & Cappadocia Cave Discovery (7D/6N)', 'Turkey', 'Istanbul & Cappadocia, Turkey', 7, 6, '4-Star City Hotel & Authentic Cave Resort', '4N Istanbul Old City / Taksim Hotel + 2N Cappadocia Authentic Cave Hotel (Goreme)', 68500.00, 825.00, 15.00, 'Hagia Sophia, Blue Mosque & Topkapi Palace, Bosphorus Cruise between Europe and Asia, Cappadocia Goreme Open Air Museum, Underground City of Kaymakli, Devrent Fairy Chimney Valley, Hot air balloon viewing over fairy chimneys at sunrise', '6 Nights Stay, Daily Breakfast, Red Tour Cappadocia with lunch, Bosphorus Strait Cruise, All airport transfers, Professional licensed Turkish guide', 'International flights, Hot Air Balloon flight ticket (optional add-on), Turkey E-Visa', 1, 'active', 'LetsExplore_Turkey_6_nights.docx', 'uploads/itineraries/LetsExplore_Turkey_6_nights.docx', '2026-11-17 14:00:00'),
(229, 'PKG-TR-IST-7N8D', 'Turkey Grand Highlights — Istanbul, Cappadocia & Pamukkale (8D/7N)', 'Turkey', 'Istanbul, Cappadocia & Pamukkale / Kusadasi, Turkey', 8, 7, '4-Star Hotels & Cave Suites', '3N Istanbul + 2N Cappadocia Cave Suite + 2N Pamukkale Thermal Resort', 79000.00, 950.00, 15.00, 'Grand Bazaar & Spice Market shopping, Bosphorus sunset boat tour, Cappadocia valleys & pigeon valley hike, Pamukkale white travertine thermal terraces & Hierapolis ancient theater, Cleopatra antique thermal pool swim', '7 Nights Accommodation with Daily Breakfast, All guided tours mentioned with lunch, Inter-city transfers in AC coach, English speaking guide', 'International Flights, Domestic Turkish air tickets, Hot air balloon ride', 1, 'active', 'LetsExplore_Turkey_7_nights.docx', 'uploads/itineraries/LetsExplore_Turkey_7_nights.docx', '2026-11-17 14:00:00'),
(101, 'PKG-IN-ALIBG-4D3N', 'Alibag 4 Days / 3 Nights — Let''s Explore DMC', 'India', 'Alibaug, Maharashtra', 4, 3, '4-Star Deluxe', 'Mansha Tropicana Resort Alibaug (2N in 2Rm / 1 Room Double Occupancy - MAP)', 32500.00, 390.00, 10.00, 'Pickup from Mumbai Airport/City, Kihim Beach Water Sports, Revdanda Fort Sunset, Alibaug Local Sightseeing, Dedicated AC Vehicle for all transfers', '3 Nights Luxury Accommodation, Daily Breakfast & Dinner (MAP Plan), AC Private Vehicle Mumbai-Alibaug-Mumbai, Driver charges, toll & parking', 'Personal water sports activities, Airfare / Train fare, Lunch and extra meals, Travel insurance', 1, 'active', 'akash Dewani.pdf', 'images/pdf/akash Dewani.pdf', '2026-11-14 10:00:00'),
(103, 'PKG-UAE-DXB8D', 'Dubai & Abu Dhabi Discovery — Let''s Explore DMC (8D/7N)', 'UAE', 'Dubai & Abu Dhabi, UAE', 8, 7, '4-Star Deluxe & Desert Resort', '5N Grand Excelsior / Millennium Al Barsha + 2N Premium Desert Safari Resort', 68000.00, 820.00, 12.00, 'Burj Khalifa 124th Floor, Dubai Aquarium & Underwater Zoo, Premium Desert Safari with Dune Bashing & BBQ, 1-Hr Private Yacht Cruise at Marina, Full Day Abu Dhabi & Grand Mosque, Return Airport Transfers', '7 Nights Stay, Daily Buffet Breakfast, Desert Safari with BBQ Dinner & Shows, Yacht Cruise, Sheikh Zayed Mosque Tour, All AC Transfers, 5% VAT & Tourism Dirham', 'International Flight Tickets, UAE Tourist Visa, Lunches & Personal Expenses', 1, 'active', 'LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf', 'images/pdf/LetsExploreDMC_Dubai_AbuDhabi_6D5N (2).pdf', '2026-11-14 10:30:00'),
(105, 'PKG-TH-PTY-TMRW', 'Pattaya Tomorrowland Music & Beach Escape (5D/4N)', 'Thailand', 'Pattaya & Bangkok, Thailand', 5, 4, '4-Star Deluxe / Private Pool Villa', '4-Star Pattaya Beach Hotel or The Palm Pool Villa Pattaya', 35000.00, 420.00, 10.00, 'Tomorrowland Festival Thailand Event Venue Private Transfers, Coral Island Speedboat excursion with lunch, Alcazar VIP Show, Walking Street Pattaya nightlife, Bangkok Suvarnabhumi Airport private transfers', '4 Nights Deluxe Accommodation, Daily Breakfast, Event festival transfers in private AC minivan, Coral Island tour with seafood lunch, Airport pickup and drop', 'Festival entry pass tickets (sold separately), International flights, Personal expenses, Alcohol', 1, 'active', 'Pattaya_Tomorrowland_Package_Quotation_4N_updated_3 (4).pdf', 'format/Pattaya_Tomorrowland_Package_Quotation_4N_updated_3 (4).pdf', '2026-11-14 11:00:00')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `country`=VALUES(`country`), `destination`=VALUES(`destination`), `pricing_inr`=VALUES(`pricing_inr`), `pricing_usd`=VALUES(`pricing_usd`), `hotel_details`=VALUES(`hotel_details`), `file_path`=VALUES(`file_path`), `source_drive_file`=VALUES(`source_drive_file`), `highlights`=VALUES(`highlights`), `inclusions`=VALUES(`inclusions`), `exclusions`=VALUES(`exclusions`), `status`=VALUES(`status`), `is_published`=VALUES(`is_published`);


-- --------------------------------------------------------
-- Seed Data: Authentic Invoices & Vouchers for Let's Explore DMC
-- --------------------------------------------------------
INSERT INTO `invoices` (`id`, `invoice_no`, `invoice_type`, `customer_name`, `invoice_date`, `due_date`, `billing_description`, `hsn_code`, `gst_rate`, `subtotal`, `tax_amount`, `grand_total`, `currency`, `particulars_json`, `payment_status`, `created_by`, `created_at`) VALUES
(1, 'LEDMC-INV-2026-081', 'billing', 'Ramesh Kumar & Family', '2026-11-16', '2026-11-23', 'Phuket & Krabi 6D5N Land Package with 4-Star Accommodation & Private Transfers', '998555', 5.0, 79900.0, 3995.0, 83895.0, 'INR', '[{"item": "Phuket 3 Nights Hotel + Tours", "amount": 42000.0}, {"item": "Krabi 2 Nights Hotel + 4 Islands Tour", "amount": 28000.0}, {"item": "Airport & Inter-city Private AC Transfers", "amount": 9900.0}]', 'Paid', 'Admin', '2026-11-16 11:20:00'),
(2, 'LEDMC-INV-2026-082', 'billing', 'Direct Guest / Couple (Villa Nautica Maldives)', '2026-11-17', '2026-11-20', 'Villa Nautica Maldives Romantic Candle Light Beach Dining & Decoration Package', '998555', 5.0, 35000.0, 1750.0, 36750.0, 'INR', '[{"item": "Private Beachfront Dining for 2 Adults", "amount": 28000.0}, {"item": "Canopy Setup & Floral Romantic Decoration", "amount": 7000.0}]', 'Paid', 'Admin', '2026-11-17 14:15:00'),
(3, 'LEDMC-VCH-2026-104', 'hotel', 'Ramesh Kumar (2 Adults, 1 Child)', '2026-11-16', '2026-11-16', 'Hotel Voucher: Ramada by Wyndham Phuket (Superior Room, 3 Nights, Breakfast Included)', '998555', 0.0, 24500.0, 0.0, 24500.0, 'INR', '[{"item": "Check-in: 10 Dec 2026 | Check-out: 13 Dec 2026", "amount": 24500.0}]', 'Confirmed', 'Admin', '2026-11-16 11:45:00'),
(4, 'LEDMC-VCH-2026-105', 'hotel', 'Ramesh Kumar (2 Adults, 1 Child)', '2026-11-16', '2026-11-16', 'Hotel Voucher: GLOW Ao Nang Krabi (Deluxe Room, 2 Nights, Breakfast Included)', '998555', 0.0, 18200.0, 0.0, 18200.0, 'INR', '[{"item": "Check-in: 13 Dec 2026 | Check-out: 15 Dec 2026", "amount": 18200.0}]', 'Confirmed', 'Admin', '2026-11-16 11:50:00'),
(5, 'LEDMC-VCH-2026-209', 'cab', 'Ramesh Kumar (2 Adults, 1 Child)', '2026-11-16', '2026-11-16', 'Transport Voucher: Phuket Airport - Hotel - Laemtong Pier Transfer Chain (Private Van)', '998555', 0.0, 12500.0, 0.0, 12500.0, 'INR', '[{"item": "Private AC Van + Ferry SIC Ticket Chain", "amount": 12500.0}]', 'Confirmed', 'Admin', '2026-11-16 12:00:00'),
(6, 'LEDMC-INV-2026-083', 'billing', 'Mohit Kodwani', '2026-11-18', '2026-11-25', 'Bali & Malaysia 7D6N Twin-Destination Executive Holiday Package', '998555', 5.0, 68000.0, 3400.0, 71400.0, 'INR', '[{"item": "Kuala Lumpur 3N + Bali 3N Package", "amount": 68000.0}]', 'Pending', 'Admin', '2026-11-18 10:30:00')
ON DUPLICATE KEY UPDATE `customer_name`=VALUES(`customer_name`), `grand_total`=VALUES(`grand_total`), `payment_status`=VALUES(`payment_status`);
