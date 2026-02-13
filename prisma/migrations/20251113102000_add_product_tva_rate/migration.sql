-- Add TVA rate to Product with default 19
ALTER TABLE `Product` ADD COLUMN `tvaRate` DOUBLE NOT NULL DEFAULT 19;