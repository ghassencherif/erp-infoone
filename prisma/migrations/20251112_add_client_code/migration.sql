-- AlterTable
ALTER TABLE `Client` ADD COLUMN `code` VARCHAR(191) NOT NULL DEFAULT '';

-- Create a unique index for code
ALTER TABLE `Client` ADD UNIQUE INDEX `Client_code_key`(`code`);
