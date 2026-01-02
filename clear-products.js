import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearProducts() {
  try {
    console.log('⚠️  WARNING: This will delete ALL products from the database!');
    console.log('🔄 Starting deletion process...\n');

    // Use raw SQL to bypass foreign key constraints temporarily
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
    
    console.log('Deleting all products...');
    await prisma.$executeRaw`TRUNCATE TABLE Product`;
    console.log(`✅ Deleted all products`);

    console.log('Deleting all stock records...');
    await prisma.$executeRaw`TRUNCATE TABLE StockAvailable`;
    console.log(`✅ Deleted all stock records`);

    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

    console.log('\n✅ Product table cleared successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
  } finally {
    await prisma.$disconnect();
  }
}

clearProducts();
