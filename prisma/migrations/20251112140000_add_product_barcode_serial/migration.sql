-- Add optional barcode and serialNumber columns to Product
ALTER TABLE `Product` ADD COLUMN `barcode` VARCHAR(191) NULL, ADD COLUMN `serialNumber` VARCHAR(191) NULL;
