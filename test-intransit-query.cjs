const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing in-transit query...');
    
    const commandes = await prisma.commandeClient.findMany({
      where: {
        statut: 'EN_COURS_LIVRAISON'
      },
      select: {
        id: true,
        numero: true,
        client: { select: { name: true } },
        date: true,
        montantTTC: true,
        transporter: true,
        trackingNumber: true,
        deliveryStatus: true,
        deliveryDate: true,
        deliveryNote: true,
        lastTrackingCheck: true
      },
      orderBy: { date: 'desc' }
    });

    console.log(`✅ Found ${commandes.length} in-transit orders`);
    console.log(JSON.stringify(commandes, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
