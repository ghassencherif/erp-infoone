-- Add remise (discount) percentage to invoice and order lines
-- Note: Columns may already exist from previous partial migration attempt
-- These statements are commented out since columns already exist in production
-- ALTER TABLE `LigneFactureClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;
-- ALTER TABLE `LigneCommandeClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;
-- ALTER TABLE `FactureClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;
-- ALTER TABLE `CommandeClient` ADD COLUMN `remise` FLOAT NOT NULL DEFAULT 0;

-- Migration is a no-op since columns were added in previous attempt
<<<<<<< Updated upstream
SELECT 1;
=======
SELECT 1;
>>>>>>> Stashed changes
