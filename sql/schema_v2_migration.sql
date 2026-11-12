-- ============================================================================
-- LET'S EXPLORE DMC — SCHEMA V2 UPGRADE & LIFECYCLE COMPLETION MIGRATION
-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB 10.3+
-- Zero Data Loss: Zero DROP / Zero TRUNCATE statements
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 1. CREATE CORE ENTITY: bookings
-- ----------------------------------------------------------------------------
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
  `package_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,        -- Total supplier purchase cost
  `markup_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,       -- Gross margin
  `subtotal_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,     -- Base selling price
  `tax_percent` DECIMAL(5,2) NOT NULL DEFAULT 5.00,          -- GST 5%
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,          -- Tax total
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,         -- Total client billing
  `total_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,          -- Sum of approved payments
  `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,         -- Remaining receivable
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

-- ----------------------------------------------------------------------------
-- 2. CREATE CORE ENTITY: booking_items (Day-wise / Service Breakdown)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. CREATE CORE ENTITY: payments (Transaction Ledger & Receipts)
-- ----------------------------------------------------------------------------
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
  `transaction_ref` VARCHAR(120) DEFAULT NULL,            -- UTR, Bank Ref, Gateway Charge ID
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

-- ----------------------------------------------------------------------------
-- 4. CREATE CORE ENTITY: vouchers (Hotel, Cab & Activity Vouchers)
-- ----------------------------------------------------------------------------
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
  `vehicle_type` VARCHAR(100) DEFAULT NULL,             -- e.g. Innova Crysta / Luxury Van
  `driver_name` VARCHAR(120) DEFAULT NULL,
  `driver_contact` VARCHAR(50) DEFAULT NULL,
  `guest_details_json` LONGTEXT DEFAULT NULL,           -- [{name, age, type, phone, email}]
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

-- ----------------------------------------------------------------------------
-- 5. CREATE CORE ENTITY: supplier_assignments (Work Orders & POs)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. SEED INITIAL BOOKING & PAYMENT SAMPLES LINKED TO EXISTING CUSTOMERS
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `bookings` 
(`id`, `booking_no`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `destination`, `travel_start_date`, `travel_end_date`, `duration_text`, `adults`, `package_cost`, `markup_amount`, `subtotal_amount`, `tax_percent`, `tax_amount`, `grand_total`, `total_paid`, `balance_due`, `status`, `payment_status`, `assigned_coordinator`)
VALUES
(1, 'LEDMC-BKG-2026-001', 2, 'Akash Dewani', '9820011223', 'akash@dewanitravels.com', 'Dubai & Abu Dhabi', '2026-11-05', '2026-11-10', '6D/5N', 2, 115000.00, 18333.33, 133333.33, 5.00, 6666.67, 140000.00, 140000.00, 0.00, 'Confirmed', 'Paid', 'Nitin'),
(2, 'LEDMC-BKG-2026-002', 1, 'Dipesh Batra', '7020660318', 'dipeshbatra043@gmail.com', 'Rajasthan Heritage', '2026-11-08', '2026-11-12', '5D/4N', 2, 38000.00, 4857.14, 42857.14, 5.00, 2142.86, 45000.00, 45000.00, 0.00, 'Vouchers Issued', 'Paid', 'Nitin'),
(3, 'LEDMC-BKG-2026-003', 4, 'Mrs. Sneha Patil', '9833445566', 'sneha@aanaytours.com', 'Thailand Phuket & Krabi', '2026-11-14', '2026-11-20', '7D/6N', 4, 150000.00, 26190.48, 176190.48, 5.00, 8809.52, 185000.00, 95000.00, 90000.00, 'Pending Confirmation', 'Partially Paid', 'Ops Team');

-- Seed Corresponding Payments
INSERT IGNORE INTO `payments`
(`id`, `receipt_no`, `booking_id`, `invoice_id`, `customer_id`, `payment_type`, `amount`, `amount_inr`, `payment_method`, `transaction_ref`, `payment_date`, `status`)
VALUES
(1, 'LEDMC-REC-2026-001', 1, 1, 2, 'Full Balance', 140000.00, 140000.00, 'Bank Transfer (NEFT/RTGS/IMPS)', 'YESBNEFT261102001', '2026-11-02', 'Verified'),
(2, 'LEDMC-REC-2026-002', 2, 2, 1, 'Full Balance', 45000.00, 45000.00, 'UPI / QR', 'UPI/20261104/89123', '2026-11-04', 'Verified'),
(3, 'LEDMC-REC-2026-003', 3, 3, 4, 'Advance Token', 95000.00, 95000.00, 'Bank Transfer (NEFT/RTGS/IMPS)', 'HDFCNEFT261106099', '2026-11-06', 'Verified');

-- Seed Corresponding Vouchers
INSERT IGNORE INTO `vouchers`
(`id`, `voucher_no`, `voucher_type`, `booking_id`, `customer_id`, `supplier_id`, `supplier_confirmation_no`, `service_title`, `valid_from_date`, `valid_to_date`, `room_type`, `meal_plan`, `status`)
VALUES
(1, 'LEDMC-VCH-2026-001', 'hotel', 1, 2, 1, 'DG-DXB-9812', 'Atlantis The Palm Dubai (2N)', '2026-11-05', '2026-11-07', 'Ocean King Deluxe Room', 'Buffet Breakfast & Dinner', 'Issued'),
(2, 'LEDMC-VCH-2026-002', 'hotel', 2, 1, 4, 'TR-UDR-4410', 'Trident Udaipur (2N)', '2026-11-08', '2026-11-10', 'Deluxe Garden View Room', 'Buffet Breakfast Included', 'Issued');
