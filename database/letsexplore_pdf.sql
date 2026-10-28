-- ============================================================
-- Let's Explore DMC — PDF Generator & Document Management Database
-- Database Name: letsexplore_pdf
-- Compatible with: MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+
-- Import directly via phpMyAdmin -> Import -> Choose File -> Go
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Table structure for table `users`
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
-- Table structure for table `categories`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `documents`
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
-- Table structure for table `comments`
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
-- Seed Data: Initial Categories
-- --------------------------------------------------------
INSERT IGNORE INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Invoices', 'Client billing invoices, tax invoices, and payment receipts'),
(2, 'Quotations', 'DMC travel tour proposals, itineraries, and cost sheets'),
(3, 'Hotel Vouchers', 'Hotel booking confirmations, room allocations, and check-in vouchers'),
(4, 'Flight & Transport', 'Airline booking tickets, visa paperwork, and private transport vouchers'),
(5, 'Marketing & Guides', 'Destination brochures, travel guides, and marketing collaterals');

-- --------------------------------------------------------
-- Seed Data: Default Admin Account
-- Username: admin
-- Email: admin@letsexploredmc.com
-- Default Initial Password: Admin@LetsExplore2026!
-- (Hashed using PHP password_hash PASSWORD_BCRYPT)
-- --------------------------------------------------------
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password_hash`, `role`) VALUES
(1, 'admin', 'admin@letsexploredmc.com', '$2y$10$7R3vG6uK7Z2d7.aR18zJt.1LzQpBvhQomlV3x3h9oYj0jM4K6nJtO', 'admin');
