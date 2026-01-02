import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function updateTvaRates() {
  try {
    console.log('🔍 Reading products Excel file...');
    
    const filePath = path.join(__dirname, 'LISTE PRODUIT.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} products in Excel file\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const reference = row['Réf.']?.toString().trim();
      const tvaValue = row['TVA'];

      if (!reference) {
        skippedCount++;
        continue;
      }

      try {
        // Find existing product by reference
        const existing = await prisma.product.findFirst({
          where: { reference }
        });

        if (!existing) {
          console.log(`⚠️  Row ${i + 1}: Ref ${reference} - Not found in database`);
          skippedCount++;
          continue;
        }

        // Determine TVA rate
        let tvaRate = 19; // Default
        if (tvaValue !== undefined && tvaValue !== null) {
          const tvaStr = tvaValue.toString().trim().toLowerCase();
          if (tvaStr === '0' || tvaStr === '0%' || tvaStr === 'exonéré') {
            tvaRate = 0;
          } else if (tvaStr.includes('19') || tvaStr === '19%') {
            tvaRate = 19;
          } else if (tvaStr.includes('7') || tvaStr === '7%') {
            tvaRate = 7;
          } else if (tvaStr.includes('13') || tvaStr === '13%') {
            tvaRate = 13;
          } else {
            const parsed = parseFloat(tvaStr.replace('%', '').trim());
            if (!isNaN(parsed)) {
              tvaRate = parsed;
            }
          }
        }

        // Update TVA rate
        await prisma.product.update({
          where: { id: existing.id },
          data: { tvaRate }
        });

        if (successCount % 100 === 0) {
          console.log(`✅ Updated ${existing.name} (${reference}) - TVA: ${tvaRate}%`);
        }
        successCount++;
      } catch (error) {
        console.error(`❌ Row ${i + 1}: Ref ${reference} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 TVA Update Summary:');
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTvaRates();
