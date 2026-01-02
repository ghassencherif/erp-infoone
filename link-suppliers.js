import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function linkProductsToSuppliers() {
  try {
    console.log('🔍 Reading products Excel file...');
    
    const filePath = path.join(__dirname, 'LISTE PRODUIT.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} products in Excel file\n`);

    let linkedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const reference = row['Réf.']?.toString().trim();
      const fournisseurName = row['Fournisseur']?.trim();
      const fournisseurReference = row['Réf. produit fournisseur']?.toString().trim();
      const prixAchat = parseFloat(row["Prix d'achat"] || 0) || 0;

      if (!reference || !fournisseurName) {
        console.log(`⚠️  Row ${i + 1}: Skipped (missing product reference or supplier name)`);
        skippedCount++;
        continue;
      }

      try {
        // Find product by reference
        const product = await prisma.product.findFirst({
          where: { reference }
        });

        if (!product) {
          console.log(`⏭️  Row ${i + 1}: Ref ${reference} - Product not found, skipped`);
          skippedCount++;
          continue;
        }

        // Find supplier by name
        const fournisseur = await prisma.fournisseur.findFirst({
          where: { nom: fournisseurName }
        });

        if (!fournisseur) {
          console.log(`⏭️  Row ${i + 1}: ${product.name} - Supplier "${fournisseurName}" not found, skipped`);
          skippedCount++;
          continue;
        }

        // Check if this product-supplier combination already exists
        const existing = await prisma.historiqueAchatFournisseur.findFirst({
          where: {
            productId: product.id,
            fournisseurId: fournisseur.id,
            documentType: 'IMPORT_DOLIBARR'
          }
        });

        if (existing) {
          console.log(`⏭️  Row ${i + 1}: ${product.name} - Already linked to ${fournisseurName}`);
          skippedCount++;
          continue;
        }

        // Create linkage record
        const historique = await prisma.historiqueAchatFournisseur.create({
          data: {
            productId: product.id,
            fournisseurId: fournisseur.id,
            fournisseurReference: fournisseurReference || null,
            quantite: 1,
            prixUnitaireHT: prixAchat,
            montantTotalHT: prixAchat,
            documentType: 'IMPORT_DOLIBARR',
            documentNumero: `${fournisseur.id}-${product.id}`,
            date: new Date()
          }
        });

        console.log(`✅ Row ${i + 1}: ${product.name} - Linked to ${fournisseurName} (Price: ${prixAchat}€)`);
        linkedCount++;
      } catch (error) {
        console.error(`❌ Row ${i + 1}: Ref ${reference} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Supplier Linkage Summary:');
    console.log(`   ✅ Successfully linked: ${linkedCount}`);
    console.log(`   ⏭️  Skipped (already linked or not found): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${linkedCount + skippedCount + errorCount}/${data.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

linkProductsToSuppliers();
