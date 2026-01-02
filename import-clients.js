import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function importClients() {
  try {
    console.log('🔍 Reading Excel file...');
    
    const filePath = path.join(__dirname, 'LISTE CLIENT.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} clients in Excel file\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const codeClient = row['Code client']?.toString().trim();
      const nomClient = row['Nom']?.trim();

      if (!codeClient || !nomClient) {
        console.log(`⚠️  Row ${i + 1}: Skipped (missing code or name)`);
        skippedCount++;
        continue;
      }

      try {
        // Check if client already exists
        const existing = await prisma.client.findFirst({
          where: { code: codeClient }
        });

        if (existing) {
          console.log(`⏭️  Row ${i + 1}: ${nomClient} - Already exists (Code: ${codeClient})`);
          skippedCount++;
          continue;
        }

        // Create new client
        const client = await prisma.client.create({
          data: {
            code: codeClient,
            name: nomClient,
            email: row['Email'] ? row['Email'].toString().trim() : null,
            phone: row['Téléphone'] ? row['Téléphone'].toString().trim() : null,
            address: row['Adresse'] ? row['Adresse'].trim() : null
          }
        });

        console.log(`✅ Row ${i + 1}: ${nomClient} - Imported (Code: ${codeClient})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Row ${i + 1}: ${nomClient} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Successfully imported: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exist): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${successCount + skippedCount + errorCount}/${data.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importClients();
