import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function updateCostPrices() {
  try {
    console.log('🔍 Reading products Excel file...');
    
    const filePath = path.join(__dirname, 'LISTE PRODUIT.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} rows in Excel file\n`);

    let successCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const ref = row['Réf.']?.toString().trim();
      const prixAchat = row["Prix d'achat"];

      if (!ref) {
        console.log(`⚠️  Row ${i + 1}: Skipped (no reference)`);
        skippedCount++;
        continue;
      }

      if (!prixAchat || prixAchat === '' || parseFloat(prixAchat) === 0) {
        console.log(`⏭️  Row ${i + 1}: ${ref} - No purchase price`);
        skippedCount++;
        continue;
      }

      try {
        // Find ALL products by reference (ERP) first
        let products = await prisma.product.findMany({
          where: { reference: ref }
        });

        // If not found by reference, try by SKU (PrestaShop)
        if (products.length === 0) {
          products = await prisma.product.findMany({
            where: { sku: ref }
          });
        }

        if (products.length === 0) {
          console.log(`❌ Row ${i + 1}: ${ref} - Product not found (neither reference nor SKU match)`);
          notFoundCount++;
          continue;
        }

        // Update ALL products with this reference
        const costTTC = parseFloat(prixAchat);
        
        for (const product of products) {
          const tvaRate = product.tvaRate || 19;
          const costHT = costTTC / (1 + tvaRate / 100);

          await prisma.product.update({
            where: { id: product.id },
            data: { cost: costHT }
          });

          console.log(`✅ Row ${i + 1}: ${ref} (ID: ${product.id}) - Updated cost: ${costTTC.toFixed(3)} TTC → ${costHT.toFixed(3)} HT (${product.name})`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Row ${i + 1}: ${ref} - Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY:');
    console.log(`   ✅ Updated: ${successCount}`);
    console.log(`   ⏭️  Skipped (no price): ${skippedCount}`);
    console.log(`   ❌ Not found: ${notFoundCount}`);
    console.log(`   📝 Total rows: ${data.length}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCostPrices();
