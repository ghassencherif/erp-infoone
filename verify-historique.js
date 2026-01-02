const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHistorique() {
  try {
    // Get total count of import records
    const totalCount = await prisma.historiqueAchatFournisseur.count({
      where: { documentType: 'IMPORT_DOLIBARR' }
    });
    console.log('\n📊 Total IMPORT_DOLIBARR records:', totalCount);

    // Get sample records with relationships
    const samples = await prisma.historiqueAchatFournisseur.findMany({
      where: { documentType: 'IMPORT_DOLIBARR' },
      include: {
        product: { select: { id: true, reference: true, name: true } },
        fournisseur: { select: { id: true, nom: true } }
      },
      take: 5
    });

    console.log('\n📋 Sample Records:');
    samples.forEach((record, i) => {
      console.log(`
${i + 1}. Product ID: ${record.product.id}
   Reference: ${record.product.reference}
   Name: ${record.product.name}
   Supplier: ${record.fournisseur.nom}
   Supplier Ref: ${record.fournisseurReference}
   Price: ${record.prixUnitaireHT}€
   Date: ${record.date}`);
    });

    // Get a specific product and show its suppliers
    console.log('\n\n🔍 Testing: Finding a product with suppliers...');
    const productWithSuppliers = await prisma.product.findFirst({
      where: {
        historiqueAchat: {
          some: { documentType: 'IMPORT_DOLIBARR' }
        }
      },
      include: {
        historiqueAchat: {
          where: { documentType: 'IMPORT_DOLIBARR' },
          include: { fournisseur: { select: { nom: true } } }
        }
      }
    });

    if (productWithSuppliers) {
      console.log(`\n✅ Product: "${productWithSuppliers.name}" (ID: ${productWithSuppliers.id})`);
      console.log(`   Reference: ${productWithSuppliers.reference}`);
      console.log(`   Has ${productWithSuppliers.historiqueAchat.length} supplier(s):`);
      productWithSuppliers.historiqueAchat.forEach((h, idx) => {
        console.log(`     ${idx + 1}. ${h.fournisseur.nom} (Price: ${h.prixUnitaireHT}€)`);
      });
    } else {
      console.log('\n⚠️  No products with linked suppliers found');
    }

    // Show distribution by supplier
    console.log('\n\n📈 Supplier Distribution:');
    const supplierStats = await prisma.historiqueAchatFournisseur.groupBy({
      by: ['fournisseurId'],
      where: { documentType: 'IMPORT_DOLIBARR' },
      _count: true
    });

    for (const stat of supplierStats) {
      const supplier = await prisma.fournisseur.findUnique({
        where: { id: stat.fournisseurId },
        select: { nom: true }
      });
      console.log(`   ${supplier.nom}: ${stat._count} products`);
    }

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistorique();
