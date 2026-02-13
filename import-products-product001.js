import XLSX from 'xlsx'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const num = Number(normalized)
    return Number.isNaN(num) ? 0 : num
  }
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

const toInt = (value) => {
  const num = Math.round(toNumber(value))
  return Number.isNaN(num) ? 0 : num
}

async function main() {
  try {
    const filePath = path.resolve('PRODUCT001.xlsx')
    console.log(`📄 Reading Excel file: ${filePath}`)

    const wb = XLSX.readFile(filePath)
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    console.log(`✅ Found ${rows.length} rows in sheet: ${sheetName}`)

    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const referenceRaw = row['REF FAC']
      const nameRaw = row['Désignation']

      const reference = referenceRaw ? String(referenceRaw).trim() : ''
      const sku = row['REF PRESTA'] ? String(row['REF PRESTA']).trim() : ''
      const name = nameRaw ? String(nameRaw).trim() : (sku || reference || `Produit sans designation ${i + 1}`)
      const stockReal = toInt(row['QT REEL'])
      const invoiceable = toInt(row['QT FAC'])
      const priceTTC = toNumber(row['P.V TTC (+7%)'])
      const costTTC = toNumber(row['P.A TTC'])

      const tvaRaw = toNumber(row['TVA'])
      const tvaRate = tvaRaw <= 1 ? tvaRaw * 100 : tvaRaw

      let existing = null
      if (reference) {
        existing = await prisma.product.findFirst({ where: { reference } })
      } else if (sku) {
        existing = await prisma.product.findFirst({ where: { sku } })
      } else if (name) {
        existing = await prisma.product.findFirst({ where: { name } })
      }

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            reference: reference || existing.reference || null,
            sku: sku || existing.sku || null,
            name,
            price: priceTTC,
            cost: costTTC,
            tvaRate,
            invoiceableQuantity: invoiceable
          }
        })

        const existingStock = await prisma.stockAvailable.findFirst({ where: { productId: existing.id } })
        if (existingStock) {
          await prisma.stockAvailable.update({
            where: { id: existingStock.id },
            data: { quantity: stockReal }
          })
        } else {
          await prisma.stockAvailable.create({
            data: { productId: existing.id, quantity: stockReal }
          })
        }

        updated++
        continue
      }

      await prisma.product.create({
        data: {
          reference: reference || null,
          sku: sku || null,
          name,
          description: name,
          price: priceTTC,
          cost: costTTC,
          tvaRate,
          invoiceableQuantity: invoiceable,
          stockAvailables: {
            create: { quantity: stockReal }
          }
        }
      })

      created++
    }

    console.log('\n✅ Import finished')
    console.log(`   Created: ${created}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
  } catch (err) {
    console.error('❌ Import error:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
