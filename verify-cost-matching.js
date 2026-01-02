import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMatching() {
  try {
    console.log('📊 Reading Excel file...\n');
    
    const workbook = XLSX.readFile('LISTE PRODUIT.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📈 Total rows in Excel: ${data.length}\n`);

    const results = {
      matched: [],
      notMatched: [],
      matchedButNotUpdated: [],
      excelProducts: []
    };

    // Get all products from database
    const dbProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        reference: true,
        sku: true,
        cost: true,
        tvaRate: true
      }
    });

    console.log(`🗄️  Total products in database: ${dbProducts.length}\n`);

    // Process each Excel row
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const row = data[i];
      const ref = row['Réf.']?.toString().trim();
      const costTTC = parseFloat(row['Prix d\'achat']);

      if (!ref || isNaN(costTTC)) {
        continue;
      }

      results.excelProducts.push({
        ref,
        costTTC,
        rowIndex: i + 2
      });

      // Try to find in database by reference
      let product = dbProducts.find(p => p.reference?.toLowerCase() === ref.toLowerCase());

      // If not found by reference, try by SKU
      if (!product) {
        product = dbProducts.find(p => p.sku?.toLowerCase() === ref.toLowerCase());
      }

      if (!product) {
        results.notMatched.push({
          ref,
          costTTC,
          rowIndex: i + 2
        });
      } else {
        const tvaRate = product.tvaRate || 19;
        const expectedCostHT = costTTC / (1 + tvaRate / 100);

        results.matched.push({
          ref,
          productName: product.name,
          dbReference: product.reference,
          dbSku: product.sku,
          costTTC,
          expectedCostHT: expectedCostHT.toFixed(3),
          currentCostHT: product.cost?.toFixed(3) || 'null',
          matches: Math.abs((product.cost || 0) - expectedCostHT) < 0.01
        });

        if (Math.abs((product.cost || 0) - expectedCostHT) >= 0.01) {
          results.matchedButNotUpdated.push({
            ref,
            productName: product.name,
            expectedCostHT: expectedCostHT.toFixed(3),
            currentCostHT: product.cost?.toFixed(3) || 'null',
            difference: (expectedCostHT - (product.cost || 0)).toFixed(3)
          });
        }
      }
    }

    console.log(`\n✅ MATCHED PRODUCTS (first 100 rows checked):`);
    console.log(`   Found in DB: ${results.matched.length}`);
    if (results.matched.length > 0) {
      console.log(`   Already updated: ${results.matched.filter(m => m.matches).length}`);
      console.log(`   Need update: ${results.matched.filter(m => !m.matches).length}`);
    }

    console.log(`\n❌ NOT MATCHED (no match in DB):`);
    console.log(`   Count: ${results.notMatched.length}`);
    if (results.notMatched.length > 0 && results.notMatched.length <= 10) {
      results.notMatched.forEach(item => {
        console.log(`   - Row ${item.rowIndex}: Ref="${item.ref}", Cost=${item.costTTC}`);
      });
    }

    console.log(`\n⚠️  MATCHED BUT NOT UPDATED (cost mismatch):`);
    console.log(`   Count: ${results.matchedButNotUpdated.length}`);
    if (results.matchedButNotUpdated.length > 0) {
      results.matchedButNotUpdated.slice(0, 10).forEach(item => {
        console.log(`   - ${item.ref} (${item.productName})`);
        console.log(`     Expected HT: ${item.expectedCostHT}, Current HT: ${item.currentCostHT}, Diff: ${item.difference}`);
      });
      if (results.matchedButNotUpdated.length > 10) {
        console.log(`   ... and ${results.matchedButNotUpdated.length - 10} more`);
      }
    }

    // Check if products exist in DB but not in Excel
    const excelRefs = new Set(results.excelProducts.map(p => p.ref.toLowerCase()));
    const dbNotInExcel = dbProducts.filter(p => 
      !excelRefs.has((p.reference || '').toLowerCase()) && 
      !excelRefs.has((p.sku || '').toLowerCase())
    );

    console.log(`\n📦 PRODUCTS IN DB BUT NOT IN EXCEL:`);
    console.log(`   Count: ${dbNotInExcel.length}`);
    if (dbNotInExcel.length > 0) {
      console.log(`   Sample (first 5):`);
      dbNotInExcel.slice(0, 5).forEach(p => {
        console.log(`   - ${p.reference || p.sku || 'N/A'} (${p.name})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMatching();
