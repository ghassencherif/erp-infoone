-- CreateTable
CREATE TABLE `FactureClient` (
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

    UNIQUE INDEX `FactureClient_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneFactureClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factureClientId` INTEGER NOT NULL,
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
CREATE TABLE `DevisClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateValidite` DATETIME(3) NULL,
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `timbreFiscal` DOUBLE NOT NULL DEFAULT 1.0,
    `montantTTC` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DevisClient_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneDevisClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `devisClientId` INTEGER NOT NULL,
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
CREATE TABLE `CommandeClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `devisClientId` INTEGER NULL,
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

    UNIQUE INDEX `CommandeClient_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneCommandeClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commandeClientId` INTEGER NOT NULL,
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
CREATE TABLE `AvoirClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `factureClientId` INTEGER NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` ENUM('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'ANNULE', 'LIVRE', 'PAYE') NOT NULL DEFAULT 'BROUILLON',
    `montantHT` DOUBLE NOT NULL,
    `montantTVA` DOUBLE NOT NULL,
    `timbreFiscal` DOUBLE NOT NULL DEFAULT 1.0,
    `montantTTC` DOUBLE NOT NULL,
    `motif` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AvoirClient_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneAvoirClient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `avoirClientId` INTEGER NOT NULL,
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
ALTER TABLE `FactureClient` ADD CONSTRAINT `FactureClient_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneFactureClient` ADD CONSTRAINT `LigneFactureClient_factureClientId_fkey` FOREIGN KEY (`factureClientId`) REFERENCES `FactureClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneFactureClient` ADD CONSTRAINT `LigneFactureClient_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DevisClient` ADD CONSTRAINT `DevisClient_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneDevisClient` ADD CONSTRAINT `LigneDevisClient_devisClientId_fkey` FOREIGN KEY (`devisClientId`) REFERENCES `DevisClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneDevisClient` ADD CONSTRAINT `LigneDevisClient_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommandeClient` ADD CONSTRAINT `CommandeClient_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommandeClient` ADD CONSTRAINT `CommandeClient_devisClientId_fkey` FOREIGN KEY (`devisClientId`) REFERENCES `DevisClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneCommandeClient` ADD CONSTRAINT `LigneCommandeClient_commandeClientId_fkey` FOREIGN KEY (`commandeClientId`) REFERENCES `CommandeClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneCommandeClient` ADD CONSTRAINT `LigneCommandeClient_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvoirClient` ADD CONSTRAINT `AvoirClient_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvoirClient` ADD CONSTRAINT `AvoirClient_factureClientId_fkey` FOREIGN KEY (`factureClientId`) REFERENCES `FactureClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneAvoirClient` ADD CONSTRAINT `LigneAvoirClient_avoirClientId_fkey` FOREIGN KEY (`avoirClientId`) REFERENCES `AvoirClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneAvoirClient` ADD CONSTRAINT `LigneAvoirClient_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
