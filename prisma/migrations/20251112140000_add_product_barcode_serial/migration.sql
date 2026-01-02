-- Add optional barcode and serialNumber columns to Product
ALTER TABLE `product` ADD COLUMN `barcode` VARCHAR(191) NULL, ADD COLUMN `serialNumber` VARCHAR(191) NULL;
