import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function updateProductSKU() {
  try {
    console.log('🔍 Reading REF FAC + REF SITE Excel file...');
    
    const filePath = path.join(__dirname, 'REF FAC + REF SITE.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip first row (headers) and process data
    const data = rawData.slice(1).filter(row => row[0] || row[1]); // Filter out empty rows
    
    console.log(`✅ Found ${data.length} rows in Excel file\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const refFac = row[0]?.toString().trim(); // REF FAC (ERP Reference)
      const refSite = row[1]?.toString().trim(); // REF SITE (Prestashop SKU)

      // Skip if no REF FAC or no REF SITE
      if (!refFac && !refSite) {
        console.log(`⏭️  Row ${i + 2}: Empty row, skipped`);
        skippedCount++;
        continue;
      }

      if (!refFac) {
        console.log(`⏭️  Row ${i + 2}: Missing REF FAC, has REF SITE: ${refSite}, skipped`);
        skippedCount++;
        continue;
      }

      if (!refSite) {
        console.log(`⏭️  Row ${i + 2}: REF FAC: ${refFac} - Missing REF SITE, skipped`);
        skippedCount++;
        continue;
      }

      try {
        // Find product by reference (REF FAC)
        const product = await prisma.product.findFirst({
          where: { reference: refFac }
        });

        if (!product) {
          console.log(`❌ Row ${i + 2}: REF FAC "${refFac}" - Product not found in ERP`);
          notFoundCount++;
          continue;
        }

        // Update SKU with REF SITE
        await prisma.product.update({
          where: { id: product.id },
          data: { sku: refSite }
        });

        console.log(`✅ Row ${i + 2}: ${product.name} (${refFac}) - Updated SKU to "${refSite}"`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Row ${i + 2}: REF FAC "${refFac}" - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SKU Update Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount}`);
    console.log(`   ❌ Not found in ERP: ${notFoundCount}`);
    console.log(`   ⏭️  Skipped (empty/invalid): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${updatedCount + notFoundCount + skippedCount + errorCount}/${data.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateProductSKU();
