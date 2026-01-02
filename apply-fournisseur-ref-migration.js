import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
  console.log('Applying migration: add fournisseurReference...');
  
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('Adding fournisseurReference column...');
    await connection.query(`ALTER TABLE HistoriqueAchatFournisseur ADD COLUMN IF NOT EXISTS fournisseurReference VARCHAR(191) NULL`);
    await connection.query(`ALTER TABLE LigneFactureFournisseur ADD COLUMN IF NOT EXISTS fournisseurReference VARCHAR(191) NULL`);
    
    await connection.end();
    
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
