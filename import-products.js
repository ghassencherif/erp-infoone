import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function importProducts() {
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
      const name = row['Libellé']?.trim();

      if (!reference || !name) {
        console.log(`⚠️  Row ${i + 1}: Skipped (missing reference or name)`);
        skippedCount++;
        continue;
      }

      try {
        // Check if product already exists
        const existing = await prisma.product.findFirst({
          where: { reference }
        });

        if (existing) {
          console.log(`⏭️  Row ${i + 1}: ${name} - Already exists (ID: ${existing.id})`);
          skippedCount++;
          continue;
        }

        // Create new product
        const product = await prisma.product.create({
          data: {
            reference,
            name,
            description: row['Libellé'] ? row['Libellé'].trim() : null,
            price: parseFloat(row['Prix unitaire HT'] || 0) || 0,
            cost: parseFloat(row["Prix d'achat"] || 0) || 0,
            tvaRate: 19,
            invoiceableQuantity: 0,
            // Stock will be added later via stock sync script
            stockAvailables: {
              create: {
                quantity: 0
              }
            }
          },
          include: {
            stockAvailables: true
          }
        });

        console.log(`✅ Row ${i + 1}: ${name} - Imported (ID: ${product.id}, Ref: ${reference})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Row ${i + 1}: ${name} - Error: ${error.message}`);
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

importProducts();
