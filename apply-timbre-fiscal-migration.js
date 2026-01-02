import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
  console.log('Applying migration: add timbreFiscal to FactureFournisseur...');
  
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('Adding timbreFiscal column...');
    await connection.query(`ALTER TABLE FactureFournisseur ADD COLUMN IF NOT EXISTS timbreFiscal DOUBLE NOT NULL DEFAULT 1.0`);
    
    await connection.end();
    
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
