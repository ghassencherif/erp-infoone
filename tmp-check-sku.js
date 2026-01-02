import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sku = 'SJ606-1-BK';
const prestashopId = '356';

const main = async () => {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku },
        { reference: sku },
        { name: { contains: sku } },
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      reference: true,
      price: true,
        tvaRate: true,
      prestashopId: true,
      prestashopLastSynced: true,
    },
  });

  console.log('By SKU/reference/name:', products);

  const psMatches = await prisma.product.findMany({
    where: { prestashopId },
    select: {
      id: true,
      name: true,
      sku: true,
      reference: true,
      price: true,
      tvaRate: true,
      prestashopId: true,
      prestashopLastSynced: true,
    },
  });

  console.log('By PrestaShop ID:', psMatches);
};

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
