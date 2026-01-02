import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCostUpdate() {
  try {
    const ref = 'CH-TRT-42V';
    
    // Try to find by reference
    let product = await prisma.product.findFirst({
      where: { reference: ref }
    });

    // If not found, try by SKU
    if (!product) {
      product = await prisma.product.findFirst({
        where: { sku: ref }
      });
    }

    if (!product) {
      console.log(`❌ Product ${ref} not found in database`);
    } else {
      const tvaRate = product.tvaRate || 19;
      const costHT = product.cost || 0;
      const costTTC = costHT * (1 + tvaRate / 100);
      
      console.log('✅ Product found:');
      console.log(`   ID: ${product.id}`);
      console.log(`   Name: ${product.name}`);
      console.log(`   Reference: ${product.reference || 'N/A'}`);
      console.log(`   SKU: ${product.sku || 'N/A'}`);
      console.log(`   TVA Rate: ${tvaRate}%`);
      console.log(`   Cost HT (DB): ${costHT.toFixed(3)} TND`);
      console.log(`   Cost TTC (Calculated): ${costTTC.toFixed(3)} TND`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCostUpdate();
