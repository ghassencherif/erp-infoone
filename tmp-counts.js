import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const productCount = await prisma.product.count();
    const stockCount = await prisma.stockAvailable.count();
    console.log(`Products: ${productCount}`);
    console.log(`StockAvailable: ${stockCount}`);
  } catch (err) {
    console.error('Count error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
