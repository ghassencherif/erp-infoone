import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function verifyClientCodes() {
  try {
    const sampleClients = await prisma.client.findMany({
      take: 5,
      orderBy: { id: 'asc' },
      select: { id: true, code: true, name: true }
    });
    
    console.log('Sample clients with codes:');
    console.table(sampleClients);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyClientCodes();
