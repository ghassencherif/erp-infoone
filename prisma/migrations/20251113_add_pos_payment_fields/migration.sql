-- AlterTable
ALTER TABLE `CommandeClient` ADD COLUMN `printTicket` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `montantDonne` DOUBLE NULL,
    ADD COLUMN `monnaieRendue` DOUBLE NULL;
