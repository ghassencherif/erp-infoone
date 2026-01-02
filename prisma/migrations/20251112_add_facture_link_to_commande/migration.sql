-- Add factureClientId to CommandeClient
ALTER TABLE `CommandeClient` ADD COLUMN `factureClientId` INTEGER NULL;

-- Add foreign key
ALTER TABLE `CommandeClient` ADD CONSTRAINT `CommandeClient_factureClientId_fkey` 
FOREIGN KEY (`factureClientId`) REFERENCES `FactureClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
CREATE INDEX `CommandeClient_factureClientId_idx` ON `CommandeClient`(`factureClientId`);
