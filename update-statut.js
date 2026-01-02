import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Map old status to new status
    const statusMap = {
      'BROUILLON': 'EN_ATTENTE_VALIDATION',
      'ENVOYE': 'EN_ATTENTE_VALIDATION',
      'ACCEPTE': 'EN_COURS_PREPARATION',
      'LIVRE': 'LIVRE',
      'ANNULE': 'ANNULE'
    };
    
    console.log('Fetching all CommandeClient records...');
    const commandes = await prisma.$queryRawUnsafe(`SELECT id, statut FROM CommandeClient`);
    
    console.log(`Found ${commandes.length} commandes to update`);
    
    for (const commande of commandes) {
      const newStatus = statusMap[commande.statut] || 'EN_ATTENTE_VALIDATION';
      console.log(`Updating commande ${commande.id}: ${commande.statut} -> ${newStatus}`);
      
      await prisma.$executeRawUnsafe(`
        UPDATE CommandeClient 
        SET statut = '${newStatus}' 
        WHERE id = ${commande.id}
      `);
    }
    
    console.log('✓ All commandes updated successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
