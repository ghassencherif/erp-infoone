import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function updateClientCodes() {
  console.log('Starting client code generation...');
  
  try {
    // First apply the migration to add the column
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('Adding code column...');
    await connection.query(`ALTER TABLE Client ADD COLUMN IF NOT EXISTS code VARCHAR(191) NOT NULL DEFAULT ''`);
    
    // Get all clients
    const clients = await prisma.client.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log(`Found ${clients.length} clients to update`);
    
    // Update each client with a unique code
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const code = `C${String(i + 1).padStart(5, '0')}`;
      
      await prisma.client.update({
        where: { id: client.id },
        data: { code }
      });
      
      console.log(`Updated client ${client.id} with code ${code}`);
    }
    
    // Now add the unique constraint
    console.log('Adding unique constraint...');
    await connection.query(`ALTER TABLE Client ADD UNIQUE INDEX IF NOT EXISTS Client_code_key (code)`);
    
    await connection.end();
    
    console.log('✅ Client codes updated successfully!');
  } catch (error) {
    console.error('Error updating client codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateClientCodes();
