import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');
    
    const result = await prisma.$queryRawUnsafe(`
      SHOW COLUMNS FROM CommandeClient WHERE Field = 'source' OR Field = 'statut'
    `);
    
    console.log('Column details:', result);
    
    const commandes = await prisma.$queryRawUnsafe(`SELECT * FROM CommandeClient LIMIT 2`);
    console.log('Sample commandes:', commandes);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
