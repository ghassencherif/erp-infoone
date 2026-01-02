import XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeKey(k) {
  return String(k || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function getValue(row, keys) {
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

async function main() {
  const filePath = 'REF FAC + REF SITE.xlsx'
  console.log(`Reading mapping from: ${filePath}`)
  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1 })
  if (!matrix.length) {
    console.log('No rows found in the Excel file.')
    return
  }

  // Determine header row: look for any cell that matches known header names
  const refSiteNames = ['ref site', 'sku prestashop', 'sku', 'ref_site']
  const refFacNames = ['ref fac', 'reference erp', 'ref_fac']

  let headerRowIndex = 0
  let refSiteCol = 1 // default: second column
  let refFacCol = 0  // default: first column

  for (let i = 0; i < Math.min(5, matrix.length); i++) {
    const row = matrix[i].map(v => normalizeKey(v))
    const siteIdx = row.findIndex(v => refSiteNames.includes(v))
    const facIdx = row.findIndex(v => refFacNames.includes(v))
    if (siteIdx !== -1 || facIdx !== -1) {
      headerRowIndex = i
      if (siteIdx !== -1) refSiteCol = siteIdx
      if (facIdx !== -1) refFacCol = facIdx
      break
    }
  }

  const dataRows = matrix.slice(headerRowIndex + 1)

  let updated = 0, notFound = 0, skipped = 0, syncedInvoiceable = 0

  for (const row of dataRows) {
    const siteRef = String(row[refSiteCol] ?? '').trim()
    const facRef = String(row[refFacCol] ?? '').trim()
    if (!siteRef) { skipped++; continue }
    if (!facRef) { skipped++; continue }

    try {
      const product = await prisma.product.findFirst({ where: { sku: siteRef }, include: { stockAvailables: true } })
      if (!product) { notFound++; continue }

      const quantity = product.stockAvailables[0]?.quantity ?? 0

      await prisma.product.update({
        where: { id: product.id },
        data: {
          reference: facRef,
          invoiceableQuantity: quantity
        }
      })

      updated++
      if (product.invoiceableQuantity !== quantity) syncedInvoiceable++
    } catch (e) {
      console.error('Error updating for SKU', siteRef, e.message)
    }
  }

  console.log('Mapping applied summary:')
  console.log({ updated, notFound, skipped, syncedInvoiceable })
}

main().catch((e) => {
  console.error(e)
}).finally(async () => {
  await prisma.$disconnect()
})
