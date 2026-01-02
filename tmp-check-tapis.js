import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku: 'TPS-90X40WM01' },
        { reference: 'TPS-90X40WM01' },
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

  console.log('ERP Product:', JSON.stringify(products, null, 2));
};

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
