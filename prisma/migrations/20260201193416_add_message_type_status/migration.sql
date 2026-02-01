-- AlterTable
ALTER TABLE `messages` ADD COLUMN `message_type` ENUM('text', 'image', 'sticker', 'file', 'system') NOT NULL DEFAULT 'text',
    ADD COLUMN `status` ENUM('queued', 'sent', 'failed', 'received', 'read') NOT NULL DEFAULT 'received';
