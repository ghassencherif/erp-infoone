-- AlterTable
ALTER TABLE `product` ADD COLUMN `invoiceableQuantity` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `InvoiceSubstitution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factureClientId` INTEGER NOT NULL,
    `realProductId` INTEGER NOT NULL,
    `invoicedProductId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvoiceSubstitution_factureClientId_idx`(`factureClientId`),
    INDEX `InvoiceSubstitution_realProductId_idx`(`realProductId`),
    INDEX `InvoiceSubstitution_invoicedProductId_idx`(`invoicedProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InvoiceSubstitution` ADD CONSTRAINT `InvoiceSubstitution_factureClientId_fkey` FOREIGN KEY (`factureClientId`) REFERENCES `FactureClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceSubstitution` ADD CONSTRAINT `InvoiceSubstitution_realProductId_fkey` FOREIGN KEY (`realProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceSubstitution` ADD CONSTRAINT `InvoiceSubstitution_invoicedProductId_fkey` FOREIGN KEY (`invoicedProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
