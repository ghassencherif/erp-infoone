import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHistorique() {
  try {
    console.log('\n=== HISTORIQUE ACHAT VERIFICATION ===\n');
    
    // Total count
    const totalCount = await prisma.historiqueAchatFournisseur.count();
    console.log(`📊 Total HistoriqueAchatFournisseur records: ${totalCount}`);
    
    // Import count
    const importCount = await prisma.historiqueAchatFournisseur.count({
      where: { documentType: 'IMPORT_DOLIBARR' }
    });
    console.log(`📊 IMPORT_DOLIBARR records: ${importCount}`);
    
    // Get first 3 records
    console.log('\n📋 Sample Records:');
    const samples = await prisma.historiqueAchatFournisseur.findMany({
      where: { documentType: 'IMPORT_DOLIBARR' },
      include: {
        product: { select: { id: true, reference: true, name: true } },
        fournisseur: { select: { id: true, nom: true } }
      },
      take: 3
    });
    
    samples.forEach((s, idx) => {
      console.log(`\n${idx + 1}. ID: ${s.id}`);
      console.log(`   Product: ${s.product.reference} - ${s.product.name}`);
      console.log(`   Supplier: ${s.fournisseur.nom}`);
      console.log(`   Price: ${s.prixUnitaireHT}€`);
    });

    // Count products with suppliers
    const productsWithSuppliers = await prisma.product.count({
      where: {
        historiqueAchats: {
          some: { documentType: 'IMPORT_DOLIBARR' }
        }
      }
    });
    console.log(`\n📊 Products with linked suppliers: ${productsWithSuppliers}`);

    // Get one product with its suppliers
    const product = await prisma.product.findFirst({
      where: {
        historiqueAchats: {
          some: { documentType: 'IMPORT_DOLIBARR' }
        }
      },
      include: {
        historiqueAchats: {
          where: { documentType: 'IMPORT_DOLIBARR' },
          include: { fournisseur: { select: { nom: true } } }
        }
      }
    });

    if (product) {
      console.log(`\n✅ Example Product: ${product.name} (ID: ${product.id})`);
      console.log(`   Linked Suppliers: ${product.historiqueAchats.length}`);
      product.historiqueAchats.forEach((h) => {
        console.log(`     - ${h.fournisseur.nom} (${h.prixUnitaireHT}€)`);
      });
    }

    console.log('\n✅ Verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistorique();
