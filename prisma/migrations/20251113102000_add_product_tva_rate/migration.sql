-- Add TVA rate to Product with default 19
ALTER TABLE `product` ADD COLUMN `tvaRate` DOUBLE NOT NULL DEFAULT 19;