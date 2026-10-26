-- ====================================================================
-- Let's Explore DMC — Quotation Management System Database Schema
-- Compatible with cPanel MySQL / MariaDB and phpMyAdmin
-- ====================================================================

-- 1. Create Quotations Table
CREATE TABLE IF NOT EXISTS `quotations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quote_ref` VARCHAR(60) NOT NULL UNIQUE,
    `client_name` VARCHAR(150) NOT NULL,
    `client_phone` VARCHAR(50) DEFAULT NULL,
    `client_email` VARCHAR(120) DEFAULT NULL,
    `destination` VARCHAR(100) NOT NULL,
    `travel_date` VARCHAR(80) DEFAULT NULL,
    `duration` VARCHAR(60) DEFAULT NULL,
    `pax_count` VARCHAR(50) DEFAULT '2 Adults',
    `hotel_name` VARCHAR(200) DEFAULT NULL,
    `hotel_nights` VARCHAR(50) DEFAULT NULL,
    `flight_airline` VARCHAR(100) DEFAULT NULL,
    `flight_sector` VARCHAR(100) DEFAULT NULL,
    `flights_total` DECIMAL(12, 2) DEFAULT 0.00,
    `land_total` DECIMAL(12, 2) DEFAULT 0.00,
    `grand_total` DECIMAL(12, 2) DEFAULT 0.00,
    `status` VARCHAR(30) DEFAULT 'Confirmed',
    `full_data_json` LONGTEXT NOT NULL COMMENT 'Complete QuotationData JSON for 100% fidelity reload',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_client` (`client_name`),
    INDEX `idx_dest` (`destination`),
    INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Initial Data (Rohit Sharma - Dubai Trip)
INSERT INTO `quotations` (
    `quote_ref`, `client_name`, `client_phone`, `destination`, 
    `travel_date`, `duration`, `pax_count`, `hotel_name`, 
    `flight_airline`, `flights_total`, `land_total`, `grand_total`, 
    `status`, `full_data_json`
) VALUES (
    'LEDMC-DXB-2027-0892', 
    'Rohit Sharma', 
    '9876543210', 
    'Dubai, UAE', 
    'March 2027', 
    '5 Days / 4 Nights', 
    '2 Adults', 
    '4-Star Marina View Hotel', 
    'Emirates / IndiGo Airlines', 
    55000.00, 
    48000.00, 
    103000.00, 
    'Confirmed', 
    '{"client":{"name":"Rohit Sharma","phone":"9876543210","travelDate":"March 2027","duration":"5 Days / 4 Nights","pax":"2 Adults","originCity":"Delhi"},"destination":"Dubai, UAE","grandTotal":103000}'
) ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
