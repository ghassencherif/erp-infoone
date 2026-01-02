import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: 'TPS-90X40WM01' },
        { reference: 'TPS-90X40WM01' }
      ]
    },
    select: {
      id: true,
      name: true,
      sku: true,
      reference: true,
      price: true,
      tvaRate: true,
      prestashopId: true,
      prestashopLastSynced: true
    }
  });

  console.log('\n✅ Product in ERP:');
  console.log(JSON.stringify(product, null, 2));
  console.log(`\n📊 Summary:`);
  console.log(`  Name: ${product.name}`);
  console.log(`  Prix TTC: ${product.price} DT`);
  console.log(`  TVA: ${product.tvaRate}%`);
  console.log(`  PrestaShop ID: ${product.prestashopId}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
