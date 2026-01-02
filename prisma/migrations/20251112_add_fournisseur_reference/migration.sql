-- AlterTable
ALTER TABLE `HistoriqueAchatFournisseur` ADD COLUMN `fournisseurReference` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `LigneFactureFournisseur` ADD COLUMN `fournisseurReference` VARCHAR(191) NULL;
