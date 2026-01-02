import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function syncStockFromExcel() {
  try {
    console.log('🔍 Reading stock Excel file...');
    
    const filePath = path.join(__dirname, 'LISTE PRODUIT EN STOCK.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} stock records in Excel file\n`);

    let updatedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const reference = row['Réf.']?.toString().trim();
      const stockQty = parseInt(row['TPS/TVH']) || 0;

      if (!reference) {
        console.log(`⚠️  Row ${i + 1}: Skipped (missing reference)`);
        skippedCount++;
        continue;
      }

      try {
        // Find product by reference
        const product = await prisma.product.findFirst({
          where: { reference },
          include: { stockAvailables: true }
        });

        if (!product) {
          console.log(`⏭️  Row ${i + 1}: Ref ${reference} - Product not found, skipped`);
          skippedCount++;
          continue;
        }

        // Check if stock record exists
        if (product.stockAvailables && product.stockAvailables.length > 0) {
          // Update existing stock
          const stockRecord = product.stockAvailables[0];
          const updatedStock = await prisma.stockAvailable.update({
            where: { id: stockRecord.id },
            data: { quantity: stockQty }
          });
          console.log(`✏️  Row ${i + 1}: ${product.name} - Stock updated to ${stockQty} (Ref: ${reference})`);
          updatedCount++;
        } else {
          // Insert new stock record
          const newStock = await prisma.stockAvailable.create({
            data: {
              productId: product.id,
              quantity: stockQty
            }
          });
          console.log(`➕ Row ${i + 1}: ${product.name} - Stock inserted: ${stockQty} (Ref: ${reference})`);
          insertedCount++;
        }
      } catch (error) {
        console.error(`❌ Row ${i + 1}: Ref ${reference} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Stock Sync Summary:');
    console.log(`   ✏️  Updated: ${updatedCount}`);
    console.log(`   ➕ Inserted: ${insertedCount}`);
    console.log(`   ⏭️  Skipped (product not found): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${updatedCount + insertedCount + skippedCount + errorCount}/${data.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncStockFromExcel();
