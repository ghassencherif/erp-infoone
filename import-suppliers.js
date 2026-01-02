import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function importSuppliers() {
  try {
    console.log('🔍 Reading Excel file...');
    
    const filePath = path.join(__dirname, 'LISTE FOURNISSEUR.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} suppliers in Excel file\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nomFournisseur = row['Nom']?.trim();

      if (!nomFournisseur) {
        console.log(`⚠️  Row ${i + 1}: Skipped (empty supplier name)`);
        skippedCount++;
        continue;
      }

      try {
        // Check if supplier already exists
        const existing = await prisma.fournisseur.findFirst({
          where: { nom: nomFournisseur }
        });

        if (existing) {
          console.log(`⏭️  Row ${i + 1}: ${nomFournisseur} - Already exists (ID: ${existing.id})`);
          skippedCount++;
          continue;
        }

        // Create new supplier
        const supplier = await prisma.fournisseur.create({
          data: {
            nom: nomFournisseur,
            email: row['Email'] ? row['Email'].trim() : null,
            telephone: row['Téléphone'] ? row['Téléphone'].toString().trim() : null,
            ville: row['Ville'] ? row['Ville'].trim() : null,
            codePostal: row['Code postal'] ? row['Code postal'].toString().trim() : null,
            matriculeFiscale: row['Numéro TVA'] ? row['Numéro TVA'].toString().trim() : null,
            adresse: row['Adresse'] ? row['Adresse'].trim() : null,
            pays: 'Tunisie',
            actif: row['État'] === 1 || row['État'] === '1' ? true : false
          }
        });

        console.log(`✅ Row ${i + 1}: ${nomFournisseur} - Imported (ID: ${supplier.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Row ${i + 1}: ${nomFournisseur} - Error: ${error.message}`);
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

importSuppliers();
