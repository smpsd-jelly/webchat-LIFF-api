-- CreateTable
CREATE TABLE `line_users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `line_user_id` VARCHAR(64) NOT NULL,
    `display_name` VARCHAR(255) NULL,
    `picture_url` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `last_seen_at` DATETIME(0) NULL,

    UNIQUE INDEX `line_users_line_user_id_key`(`line_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `line_user_id` VARCHAR(64) NOT NULL,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `last_message_at` DATETIME(0) NULL,
    `last_message_text` TEXT NULL,
    `unread_admin_count` INTEGER NOT NULL DEFAULT 0,
    `unread_user_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `conversations_line_user_id_key`(`line_user_id`),
    INDEX `idx_conversations_last_message_at`(`last_message_at`),
    INDEX `idx_conversations_updated_at`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `sender_type` ENUM('user', 'admin', 'system') NOT NULL,
    `text` TEXT NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `raw_event` JSON NULL,
    `admin_user_id` BIGINT UNSIGNED NULL,

    INDEX `idx_messages_conversation_created`(`conversation_id`, `created_at`),
    INDEX `idx_messages_admin_user_id`(`admin_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `line_user_id` VARCHAR(64) NULL,
    `display_name` VARCHAR(255) NULL,
    `picture_url` TEXT NULL,
    `username` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'superadmin') NOT NULL DEFAULT 'admin',
    `created_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `admin_users_line_user_id_key`(`line_user_id`),
    UNIQUE INDEX `admin_users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_user_id` BIGINT UNSIGNED NOT NULL,
    `session_token` VARCHAR(128) NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `admin_sessions_session_token_key`(`session_token`),
    INDEX `idx_admin_sessions_admin_user_id`(`admin_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `line_user_id` VARCHAR(64) NOT NULL,
    `session_token` VARCHAR(128) NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `user_sessions_session_token_key`(`session_token`),
    INDEX `idx_user_sessions_line_user_id`(`line_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_line_user_id_fkey` FOREIGN KEY (`line_user_id`) REFERENCES `line_users`(`line_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_line_user_id_fkey` FOREIGN KEY (`line_user_id`) REFERENCES `line_users`(`line_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
