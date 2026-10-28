-- ============================================================
-- Let's Explore DMC — Inquiries & Lead Management Database Schema
-- Table: inquiries
-- Import via phpMyAdmin -> Import -> Choose File -> Go
-- ============================================================

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

-- Sample Seed Inquiries for Let's Explore DMC
INSERT INTO `inquiries` (`name`, `phone`, `email`, `source`, `destination`, `message`, `status`, `assigned_to`, `notes`, `created_at`) VALUES
('Rahul Mehta', '+91 98201 44521', 'rahul.mehta@gmail.com', 'Instagram', 'Dubai Luxury (5D/4N)', 'Looking for 5-star hotel package with desert safari for 2 adults.', 'New', 'Admin', 'Came from Instagram Reel ad', NOW() - INTERVAL 1 HOUR),
('Priya Sharma', '+91 97110 88234', 'priya.sharma@outlook.com', 'WhatsApp', 'Thailand Escape (7D/6N)', 'Need quotation for Phuket & Krabi island hopping for family of 4.', 'Follow-up', 'Admin', 'Sent initial itinerary, waiting for dates confirmation', NOW() - INTERVAL 5 HOUR),
('Amit Verma', '+91 98102 33490', 'amit.verma@techcorp.in', 'Website', 'Switzerland & Paris (10D)', 'Corporate incentive tour proposal required for 15 members in June.', 'Contacted', 'Admin', 'Shared master DMC proposal deck', NOW() - INTERVAL 1 DAY),
('Neha Patel', '+91 94260 12890', 'neha.patel@yahoo.com', 'Website', 'Kashmir Paradise (6D/5N)', 'Houseboat stay in Dal Lake and Gulmarg Gondola tickets needed.', 'Converted', 'Admin', 'Advance token received, quotation generated', NOW() - INTERVAL 2 DAY),
('Vikram Malhotra', '+91 99887 76655', 'vikram.m@gmail.com', 'Facebook', 'Bali Villa Package (6D)', 'Private pool villa in Ubud + Seminyak beach club access.', 'New', 'Admin', 'Inquired through Facebook Lead Form', NOW() - INTERVAL 3 HOUR);
