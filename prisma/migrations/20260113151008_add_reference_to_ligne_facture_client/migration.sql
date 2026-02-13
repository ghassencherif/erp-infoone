/*
  Warnings:

  - You are about to drop the column `timbreFiscal` on the `bonlivraisonclient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `boncommandeclient` ADD COLUMN `bonLivraisonClientId` INTEGER NULL,
    ADD COLUMN `factureClientId` INTEGER NULL;

-- AlterTable
ALTER TABLE `bonlivraisonclient` DROP COLUMN `timbreFiscal`,
    ADD COLUMN `deliveryFee` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `deliveryTvaRate` DOUBLE NOT NULL DEFAULT 7,
    ADD COLUMN `factureClientId` INTEGER NULL;

-- AlterTable
ALTER TABLE `client` ADD COLUMN `matriculeFiscale` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'PARTICULIER',
    ALTER COLUMN `code` DROP DEFAULT;

-- AlterTable
ALTER TABLE `commandeclient` ADD COLUMN `bonCommandeClientId` INTEGER NULL,
    ADD COLUMN `bonLivraisonClientId` INTEGER NULL,
    ADD COLUMN `deliveryDate` DATETIME(3) NULL,
    ADD COLUMN `deliveryFee` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `deliveryNote` TEXT NULL,
    ADD COLUMN `deliveryStatus` ENUM('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'DEPOT_TRANSPORTEUR', 'RETOUR', 'PAS_DE_REPONSE_1', 'PAS_DE_REPONSE_2', 'INJOIGNABLE_1', 'INJOIGNABLE_2', 'ANNULE_1', 'ANNULE_2') NULL,
    ADD COLUMN `deliveryTvaRate` DOUBLE NOT NULL DEFAULT 7,
    ADD COLUMN `lastTrackingCheck` DATETIME(3) NULL,
    ADD COLUMN `remise` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `returnCreatedAvoirId` INTEGER NULL,
    ADD COLUMN `returnDate` DATETIME(3) NULL,
    ADD COLUMN `returnNote` TEXT NULL,
    ADD COLUMN `returnStatus` ENUM('PENDING', 'IN_TRANSIT', 'STOCKED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `returnTrackingNumber` VARCHAR(191) NULL,
    ADD COLUMN `trackingNumber` VARCHAR(191) NULL,
    ADD COLUMN `transporter` ENUM('ARAMEX', 'FIRST_DELIVERY', 'OUR_COMPANY') NULL,
    ADD COLUMN `transporterInvoiceId` INTEGER NULL,
    ADD COLUMN `transporterInvoiced` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `statut` ENUM('EN_ATTENTE_VALIDATION', 'ANNULE', 'EN_COURS_PREPARATION', 'EN_COURS_LIVRAISON', 'DEPOT_TRANSPORTEUR', 'PAS_DE_REPONSE_1', 'PAS_DE_REPONSE_2', 'INJOIGNABLE_1', 'INJOIGNABLE_2', 'ANNULE_1', 'ANNULE_2', 'RETOUR', 'LIVRE') NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION';

-- AlterTable
ALTER TABLE `CompanySetting` ADD COLUMN `deliveryFeeDefault` DOUBLE NOT NULL DEFAULT 8,
    ADD COLUMN `deliveryTvaRate` DOUBLE NOT NULL DEFAULT 7,
    ADD COLUMN `rib` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `factureclient` ADD COLUMN `deliveryFee` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `deliveryTvaRate` DOUBLE NOT NULL DEFAULT 7,
    ADD COLUMN `remise` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `lignecommandeclient` ADD COLUMN `serialNumberUsed` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `lignefactureclient` ADD COLUMN `reference` VARCHAR(191) NULL,
    ADD COLUMN `remise` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `lignefacturefournisseur` ADD COLUMN `quantiteRestante` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `promoPrice` DOUBLE NULL,
    MODIFY `serialNumber` TEXT NULL;

-- CreateTable
CREATE TABLE `DeliveryEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commandeId` INTEGER NOT NULL,
    `transporter` ENUM('ARAMEX', 'FIRST_DELIVERY', 'OUR_COMPANY') NULL,
    `oldStatus` ENUM('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'DEPOT_TRANSPORTEUR', 'RETOUR', 'PAS_DE_REPONSE_1', 'PAS_DE_REPONSE_2', 'INJOIGNABLE_1', 'INJOIGNABLE_2', 'ANNULE_1', 'ANNULE_2') NULL,
    `newStatus` ENUM('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'DEPOT_TRANSPORTEUR', 'RETOUR', 'PAS_DE_REPONSE_1', 'PAS_DE_REPONSE_2', 'INJOIGNABLE_1', 'INJOIGNABLE_2', 'ANNULE_1', 'ANNULE_2') NULL,
    `direction` ENUM('OUTBOUND', 'RETURN') NOT NULL DEFAULT 'OUTBOUND',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DeliveryEvent` ADD CONSTRAINT `DeliveryEvent_commandeId_fkey` FOREIGN KEY (`commandeId`) REFERENCES `CommandeClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommandeClient` ADD CONSTRAINT `CommandeClient_bonCommandeClientId_fkey` FOREIGN KEY (`bonCommandeClientId`) REFERENCES `BonCommandeClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommandeClient` ADD CONSTRAINT `CommandeClient_bonLivraisonClientId_fkey` FOREIGN KEY (`bonLivraisonClientId`) REFERENCES `BonLivraisonClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommandeClient` ADD CONSTRAINT `CommandeClient_returnCreatedAvoirId_fkey` FOREIGN KEY (`returnCreatedAvoirId`) REFERENCES `AvoirClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonCommandeClient` ADD CONSTRAINT `BonCommandeClient_bonLivraisonClientId_fkey` FOREIGN KEY (`bonLivraisonClientId`) REFERENCES `BonLivraisonClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonCommandeClient` ADD CONSTRAINT `BonCommandeClient_factureClientId_fkey` FOREIGN KEY (`factureClientId`) REFERENCES `FactureClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonLivraisonClient` ADD CONSTRAINT `BonLivraisonClient_factureClientId_fkey` FOREIGN KEY (`factureClientId`) REFERENCES `FactureClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
