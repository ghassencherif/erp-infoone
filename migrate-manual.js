import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Add source column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE CommandeClient 
      ADD COLUMN source ENUM('WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'PHONE', 'OTHER') NOT NULL DEFAULT 'OTHER'
    `);
    console.log('✓ Added source column');
    
    // Modify statut column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE CommandeClient 
      MODIFY statut ENUM('EN_ATTENTE_VALIDATION', 'ANNULE', 'EN_COURS_PREPARATION', 'EN_COURS_LIVRAISON', 'LIVRE') NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION'
    `);
    console.log('✓ Modified statut column');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
