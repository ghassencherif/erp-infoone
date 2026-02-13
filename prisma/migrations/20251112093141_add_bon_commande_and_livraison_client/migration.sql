-- AlterTable
ALTER TABLE `CompanySetting` ADD COLUMN `bonCommandePrefix` VARCHAR(191) NOT NULL DEFAULT 'BC',
    ADD COLUMN `bonCommandeStartNumber` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `bonLivraisonPrefix` VARCHAR(191) NOT NULL DEFAULT 'BL',
    ADD COLUMN `bonLivraisonStartNumber` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `BonCommandeClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateEcheance` DATETIME(3) NULL,
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `timbreFiscal` DOUBLE NOT NULL DEFAULT 1.0,
    `montantTTC` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BonCommandeClient_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneBonCommandeClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bonCommandeClientId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `designation` VARCHAR(191) NOT NULL,
    `quantite` INTEGER NOT NULL,
    `prixUnitaireHT` DOUBLE NOT NULL,
    `tauxTVA` DOUBLE NOT NULL DEFAULT 19,
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `montantTTC` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BonLivraisonClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `commandeClientId` INTEGER NULL,
    `bonCommandeClientId` INTEGER NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `timbreFiscal` DOUBLE NOT NULL DEFAULT 1.0,
    `montantTTC` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BonLivraisonClient_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneBonLivraisonClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bonLivraisonClientId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `designation` VARCHAR(191) NOT NULL,
    `quantite` INTEGER NOT NULL,
    `prixUnitaireHT` DOUBLE NOT NULL,
    `tauxTVA` DOUBLE NOT NULL DEFAULT 19,
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `montantTTC` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BonCommandeClient` ADD CONSTRAINT `BonCommandeClient_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonCommandeClient` ADD CONSTRAINT `LigneBonCommandeClient_bonCommandeClientId_fkey` FOREIGN KEY (`bonCommandeClientId`) REFERENCES `BonCommandeClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonCommandeClient` ADD CONSTRAINT `LigneBonCommandeClient_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonLivraisonClient` ADD CONSTRAINT `BonLivraisonClient_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonLivraisonClient` ADD CONSTRAINT `BonLivraisonClient_commandeClientId_fkey` FOREIGN KEY (`commandeClientId`) REFERENCES `CommandeClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonLivraisonClient` ADD CONSTRAINT `BonLivraisonClient_bonCommandeClientId_fkey` FOREIGN KEY (`bonCommandeClientId`) REFERENCES `BonCommandeClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonLivraisonClient` ADD CONSTRAINT `LigneBonLivraisonClient_bonLivraisonClientId_fkey` FOREIGN KEY (`bonLivraisonClientId`) REFERENCES `BonLivraisonClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonLivraisonClient` ADD CONSTRAINT `LigneBonLivraisonClient_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
