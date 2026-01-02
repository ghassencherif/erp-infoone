-- Add remise (discount) percentage to invoice and order lines
ALTER TABLE `LigneFactureClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;
ALTER TABLE `LigneCommandeClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;

-- Add remise to FactureClient and CommandeClient
ALTER TABLE `FactureClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;
ALTER TABLE `CommandeClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;
