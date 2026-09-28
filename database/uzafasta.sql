-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 28, 2026 at 02:41 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `uzafasta`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `role` enum('super_admin','staff') NOT NULL DEFAULT 'staff'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `full_name`, `email`, `password_hash`, `created_at`, `role`) VALUES
(1, 'admin', 'Jonathan Massanja', 'admin@uzafasta.co.tz', '$2b$10$6bcX8oPwbYhAkTKF097qMe34lXXjslZIxZ1q1/9If4o3GcxRR2A8K', '2026-09-15 08:09:06', 'super_admin'),
(4, 'ivan', 'Ivan Graphics', 'hamisimaulid064@gmail.com', '$2b$10$HI0nckbRl0EYC3hfFnPN1.dYIPW9gn3PcDfneb2C80tj99USXi9/S', '2026-09-15 09:03:24', 'staff');

-- --------------------------------------------------------

--
-- Table structure for table `blogs`
--

CREATE TABLE `blogs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `slug` varchar(90) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `excerpt` varchar(300) DEFAULT NULL,
  `content` text NOT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `status` enum('draft','published') DEFAULT 'published',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `views` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blogs`
--

INSERT INTO `blogs` (`id`, `admin_id`, `title`, `slug`, `category`, `excerpt`, `content`, `cover_image`, `video_url`, `status`, `created_at`, `updated_at`, `views`) VALUES
(6, 1, 'GALATA -EXIBITION MLIMANI CITY', 'galata-exibition-mlimani-city', 'Video Highlight', 'Covering highlight', 'Provided professional event and exhibition coverage for Galata Wood & Furniture during its exhibition at Mlimani City.The coverage highlighted Galata’s products, exhibition setup, customer interactions, and overall brand presence, capturing engaging visual content for use across the company’s digital marketing and social media platforms.', NULL, '/uploads/vid-1789975126207-137191609.mp4', 'published', '2026-09-21 07:18:47', '2026-09-28 14:27:30', 20),
(7, 1, 'Atlantic Samia Construction – Exhibition & Special Offer Campaign', 'atlantic-samia-construction-exhibition-special-offer-campaign', 'Graphics design', 'Design Poster', 'Designed a professional promotional poster for Atlantic Samia Construction to promote its exhibition campaign and communicate the “Get 10% Off” special offer.The poster was created to capture attention, clearly present the promotional message, and strengthen the client’s visual marketing presence.', '/uploads/vid-1789976463504-898871304.jpeg', NULL, 'published', '2026-09-21 07:41:03', '2026-09-22 12:28:39', 9),
(8, 1, 'BIST – First Year Welcome Poster', 'bist-first-year-welcome-poster', 'Graphics design', 'BIST – First Year Welcome Poster', 'Designed a professional and engaging Welcome First Year poster for BIST to welcome and encourage newly admitted students joining the institution.The design focused on creating a welcoming first impression, presenting the key message clearly, and aligning the visual content with BIST’s institutional identity.', '/uploads/vid-1789976777609-569696474.jpeg', NULL, 'published', '2026-09-21 07:46:17', '2026-09-22 12:28:23', 4);

-- --------------------------------------------------------

--
-- Table structure for table `inquiries`
--

CREATE TABLE `inquiries` (
  `id` int(11) NOT NULL,
  `tracking_code` varchar(12) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `subject` varchar(150) DEFAULT NULL,
  `message` text NOT NULL,
  `is_viewed` tinyint(1) DEFAULT 0,
  `reply` text DEFAULT NULL,
  `replied_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inquiries`
--

INSERT INTO `inquiries` (`id`, `tracking_code`, `name`, `email`, `phone`, `subject`, `message`, `is_viewed`, `reply`, `replied_at`, `created_at`) VALUES
(3, 'UZF-VT836Y', 'MAULID MWALIMU', 'hamisimaulid064@gmail.com', '0742700833', 'Website Design & Development', 'Enquiry request submitted from the Services page.', 0, NULL, NULL, '2026-09-15 11:32:47'),
(5, 'UZF-33S3FN', 'MAULID MWALIMU', 'hamisimaulid064@gmail.com', '0742700833', 'Graphic Design', 'Enquiry request submitted from the Services page.', 1, NULL, NULL, '2026-09-15 11:34:57'),
(6, 'UZF-MC9UNU', 'MAULID MWALIMU', 'hamisimaulid064@gmail.com', '0742700833', 'Video Production', 'Enquiry request submitted from the Services page.', 1, 'well we will call u soon', '2026-09-15 14:39:31', '2026-09-15 11:36:30'),
(9, 'UZF-XFNT6A', 'maulid hamisi', 'hamisimaulid064@gmail.com', '0742700833', 'E-Commerce Solutions', 'Enquiry request submitted from the Services page.', 0, NULL, NULL, '2026-09-15 15:01:50');

-- --------------------------------------------------------

--
-- Table structure for table `leaves`
--

CREATE TABLE `leaves` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `leave_type` varchar(50) NOT NULL DEFAULT 'annual',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `category` varchar(80) NOT NULL,
  `client` varchar(100) DEFAULT NULL,
  `description` text NOT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `status` enum('active','hidden') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `admin_id`, `title`, `category`, `client`, `description`, `cover_image`, `video_url`, `link`, `status`, `created_at`, `updated_at`) VALUES
(4, 1, 'GALATA WOOD & FURNITURE', 'web design', 'Galata', 'Designed and developed a modern, responsive corporate website for Galata Wood & Furniture Limited, a Tanzania-based furniture and architectural woodwork manufacturer.The website presents Galata’s premium products and services, including custom furniture, premium wooden doors, built-in cabinetry, timber flooring, interior solutions, and commercial fit-outs. It also provides structured company information, product pages, consultation calls-to-action, and contact information to improve the company’s online presence and customer engagement.', '/uploads/1789972976951-284633690.png', NULL, 'https://galata.co.tz/', 'active', '2026-09-21 06:42:57', '2026-09-21 09:44:27'),
(5, 1, 'Tanzanian Association for Educational Assessment and Evaluation', 'web design', 'TAEAE', 'Designed and developed a professional, responsive website for TAEAE, a national hub serving educators, researchers, policymakers, and assessment professionals in Tanzania.The website provides organized information about the association, its activities, and educational assessment resources, while making it easier for visitors to access important information, research resources, useful links, and contact details.', '/uploads/1789974101018-537190847.png', NULL, 'https://taeae.or.tz/', 'active', '2026-09-21 07:01:41', NULL),
(6, 1, 'Pure Soil – Food & Beverage Supply', 'web design', 'pure soil', 'Designed and developed a professional, responsive website for Pure Soil, a Tanzania-based food and beverage supply company.The website presents Pure Soil’s food and beverage supply, FMCG supply chain management, distribution and logistics, and wholesale business supply services. It also highlights the company’s products, industries served, mission and vision, while providing clear contact and supply-request channels for potential customers.', '/uploads/1789974414373-42751407.png', NULL, 'https://puresoil.co.tz/', 'active', '2026-09-21 07:06:54', NULL),
(7, 1, 'Galata – Exhibition Coverage at Mlimani City', 'video', 'Galata', 'Provided professional event and exhibition coverage for Galata Wood & Furniture during its exhibition at Mlimani City.The coverage highlighted Galata’s products, exhibition setup, customer interactions, and overall brand presence, capturing engaging visual content for use across the company’s digital marketing and social media platforms.', NULL, '/uploads/vid-1789981082058-687588430.mp4', NULL, 'active', '2026-09-21 08:58:02', NULL),
(8, 1, 'Atlantic Samia Construction – Promotional Poster', 'Branding', 'Atlantic', 'Designed a professional promotional poster for Atlantic Samia Construction to promote its exhibition campaign and communicate the “Get 10% Off” special offer.The poster was created to capture attention, clearly present the promotional message, and strengthen the client’s visual marketing presence.', '/uploads/vid-1789990447263-182625788.jpeg', NULL, NULL, 'active', '2026-09-21 11:34:07', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('QXMXnjcCtMnJ72TIZW2IYOYk1f-3r8lI', 1790681260, '{\"cookie\":{\"originalMaxAge\":86399999,\"expires\":\"2026-09-28T16:01:47.455Z\",\"httpOnly\":true,\"path\":\"/\"},\"adminId\":1}');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `due_date` date NOT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `created_by`, `staff_id`, `title`, `description`, `due_date`, `priority`, `status`, `created_at`, `updated_at`, `completed_at`) VALUES
(4, 1, 4, 'poster for galata', NULL, '2026-09-25', 'high', 'pending', '2026-09-24 10:52:43', '2026-09-24 10:52:43', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `blogs`
--
ALTER TABLE `blogs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `inquiries`
--
ALTER TABLE `inquiries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tracking_code` (`tracking_code`);

--
-- Indexes for table `leaves`
--
ALTER TABLE `leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_id` (`staff_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_id` (`staff_id`),
  ADD KEY `due_date` (`due_date`),
  ADD KEY `tasks_ibfk_2` (`created_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `blogs`
--
ALTER TABLE `blogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `inquiries`
--
ALTER TABLE `inquiries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `leaves`
--
ALTER TABLE `leaves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `blogs`
--
ALTER TABLE `blogs`
  ADD CONSTRAINT `blogs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leaves`
--
ALTER TABLE `leaves`
  ADD CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leaves_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
