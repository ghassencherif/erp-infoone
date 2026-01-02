-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'CASHIER', 'ACCOUNTANT', 'WAREHOUSE') NOT NULL DEFAULT 'CASHIER',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Client_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fournisseur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `adresse` TEXT NULL,
    `ville` VARCHAR(191) NULL,
    `codePostal` VARCHAR(191) NULL,
    `pays` VARCHAR(191) NULL DEFAULT 'Tunisie',
    `matriculeFiscale` VARCHAR(191) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BonDeCommande` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateEcheance` DATETIME(3) NULL,
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `montantTTC` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BonDeCommande_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneBonDeCommande` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bonDeCommandeId` INTEGER NOT NULL,
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
CREATE TABLE `BonDeReception` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `bonDeCommandeNumero` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BonDeReception_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneBonDeReception` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bonDeReceptionId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `designation` VARCHAR(191) NOT NULL,
    `quantiteRecue` INTEGER NOT NULL,
    `quantiteCommandee` INTEGER NULL,
    `prixUnitaireHT` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FactureFournisseur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `bonCommandeId` INTEGER NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateEcheance` DATETIME(3) NULL,
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `montantTTC` DOUBLE NOT NULL,
    `montantPaye` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FactureFournisseur_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneFactureFournisseur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factureId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `designation` VARCHAR(191) NOT NULL,
    `quantite` INTEGER NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `tauxTVA` DOUBLE NOT NULL DEFAULT 19,
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FactureAvoir` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `factureFournisseurNumero` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `montantTTC` DOUBLE NOT NULL,
    `motif` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FactureAvoir_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneFactureAvoir` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factureAvoirId` INTEGER NOT NULL,
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
CREATE TABLE `Devis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `fournisseurId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateValidite` DATETIME(3) NULL,
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `montantTTC` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Devis_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneDevis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `devisId` INTEGER NOT NULL,
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
CREATE TABLE `HistoriqueAchatFournisseur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fournisseurId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantite` INTEGER NOT NULL,
    `prixUnitaireHT` DOUBLE NOT NULL,
    `montantTotalHT` DOUBLE NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `documentNumero` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `price` DOUBLE NOT NULL,
    `cost` DOUBLE NULL,
    `isService` BOOLEAN NOT NULL DEFAULT false,
    `lowStockThreshold` INTEGER NULL DEFAULT 0,
    `prestashopId` VARCHAR(191) NULL,
    `prestashopLastSynced` DATETIME(3) NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Product_prestashopId_key`(`prestashopId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockAvailable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrestashopSyncLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resource` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `prestashopId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BonDeCommande` ADD CONSTRAINT `BonDeCommande_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonDeCommande` ADD CONSTRAINT `LigneBonDeCommande_bonDeCommandeId_fkey` FOREIGN KEY (`bonDeCommandeId`) REFERENCES `BonDeCommande`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonDeCommande` ADD CONSTRAINT `LigneBonDeCommande_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonDeReception` ADD CONSTRAINT `BonDeReception_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonDeReception` ADD CONSTRAINT `LigneBonDeReception_bonDeReceptionId_fkey` FOREIGN KEY (`bonDeReceptionId`) REFERENCES `BonDeReception`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneBonDeReception` ADD CONSTRAINT `LigneBonDeReception_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactureFournisseur` ADD CONSTRAINT `FactureFournisseur_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactureFournisseur` ADD CONSTRAINT `FactureFournisseur_bonCommandeId_fkey` FOREIGN KEY (`bonCommandeId`) REFERENCES `BonDeCommande`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneFactureFournisseur` ADD CONSTRAINT `LigneFactureFournisseur_factureId_fkey` FOREIGN KEY (`factureId`) REFERENCES `FactureFournisseur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneFactureFournisseur` ADD CONSTRAINT `LigneFactureFournisseur_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactureAvoir` ADD CONSTRAINT `FactureAvoir_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneFactureAvoir` ADD CONSTRAINT `LigneFactureAvoir_factureAvoirId_fkey` FOREIGN KEY (`factureAvoirId`) REFERENCES `FactureAvoir`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneFactureAvoir` ADD CONSTRAINT `LigneFactureAvoir_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Devis` ADD CONSTRAINT `Devis_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneDevis` ADD CONSTRAINT `LigneDevis_devisId_fkey` FOREIGN KEY (`devisId`) REFERENCES `Devis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneDevis` ADD CONSTRAINT `LigneDevis_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoriqueAchatFournisseur` ADD CONSTRAINT `HistoriqueAchatFournisseur_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoriqueAchatFournisseur` ADD CONSTRAINT `HistoriqueAchatFournisseur_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAvailable` ADD CONSTRAINT `StockAvailable_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
