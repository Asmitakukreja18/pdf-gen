-- ============================================================
-- Let's Explore DMC — Database Schema for cPanel & phpMyAdmin
-- Database: ihpyruhe_pdf_generator
-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB 10.3+
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Table: users (Admin accounts for PDF Generator)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: categories (Topics / Categories for organizing PDFs)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: documents (PDF Metadata and physical file paths)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  `uploaded_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_uploaded_by` (`uploaded_by`),
  INDEX `idx_created` (`created_at`),
  CONSTRAINT `fk_documents_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_documents_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: comments (Internal remarks and notes on documents)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `document_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `comment` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_document` (`document_id`),
  INDEX `idx_comment_user` (`user_id`),
  CONSTRAINT `fk_comments_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: inquiries (Customer Leads from Website Forms)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `source` ENUM('Website', 'WhatsApp', 'Instagram', 'Facebook', 'Walk-in', 'Referral', 'Other') NOT NULL DEFAULT 'Website',
  `destination` VARCHAR(150) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('New', 'Contacted', 'Follow-up', 'Converted', 'Lost') NOT NULL DEFAULT 'New',
  `assigned_to` VARCHAR(100) DEFAULT 'Admin',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_source` (`source`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Initial Default Categories for Let's Explore DMC
-- --------------------------------------------------------
INSERT IGNORE INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Invoices', 'Client tax invoices, billing receipts, and payment statements'),
(2, 'Quotations', 'DMC travel proposals, destination packages, and cost sheets'),
(3, 'Hotel Vouchers', 'Hotel booking confirmations, room bookings, and check-in vouchers'),
(4, 'Flight & Transport', 'Airline booking tickets, transfers, and transport vouchers'),
(5, 'Marketing & Guides', 'Destination brochures, itineraries, and travel marketing materials');

-- NOTE: No default admin password or credentials are hardcoded into this file.
-- To create your first admin account securely, use the provided helper script:
-- visit: https://yourdomain.com/api/create_admin.php
-- or execute: INSERT INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@letsexploredmc.com', '<YOUR_BCRYPT_HASH>', 'admin');
