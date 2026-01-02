import 'dotenv/config'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_TVA_RATE = 19

async function fetchPrestashopProducts() {
  const baseUrl = process.env.PRESTASHOP_API_URL
  const apiKey = process.env.PRESTASHOP_API_KEY
  if (!baseUrl || !apiKey) throw new Error('Missing PRESTASHOP_API_URL or PRESTASHOP_API_KEY')

  console.log(`➡️  Fetching PrestaShop products from ${baseUrl}`)
  const res = await axios.get(`${baseUrl}/products?display=full&ws_key=${apiKey}`, {
    headers: { Accept: 'application/xml', 'Content-Type': 'application/xml' },
    timeout: 120000
  })

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(res.data)
  let products = parsed.prestashop?.products?.product
  if (!Array.isArray(products)) products = products ? [products] : []
  return { products, parser, baseUrl, apiKey }
}

async function fetchStockQuantity(stockId, { baseUrl, apiKey, parser }) {
  if (!stockId) return 0
  try {
    const res = await axios.get(`${baseUrl}/stock_availables/${stockId}?ws_key=${apiKey}`, {
      headers: { Accept: 'application/xml', 'Content-Type': 'application/xml' }
    })
    const parsed = parser.parse(res.data)
    const qtyRaw = parsed.prestashop?.stock_available?.quantity
    const qty = Array.isArray(qtyRaw) ? qtyRaw[0] : qtyRaw
    return parseInt(String(qty ?? 0), 10) || 0
  } catch (err) {
    console.log(`⚠️  Failed to fetch stock ${stockId}:`, err.message)
    return 0
  }
}

async function sync() {
  let updated = 0
  let created = 0
  let notChanged = 0
  let errors = 0
  let processed = 0

  try {
    const { products, parser, baseUrl, apiKey } = await fetchPrestashopProducts()
    console.log(`✅ Retrieved ${products.length} products from PrestaShop`)

    for (const p of products) {
      try {
        const prestashopId = String(p.id?.[0] ?? p.id ?? '').trim()
        const name = p.name?.language?._text || p.name?.language?.['#text'] || p.name?.language || p.name || 'Unnamed Product'
        const ref = String(p.reference ?? '').trim()
        const priceRaw = p.price?.[0] || p.price?._text || p.price?.['#text'] || p.price || 0

        // PrestaShop price is TTC (customer-facing price on website)
        const priceTTC = Number(priceRaw) || 0

        const stockId = p.associations?.stock_availables?.stock_available?.id ||
                        p.associations?.stock_availables?.stock_available?.[0]?.id
        const quantity = await fetchStockQuantity(stockId, { baseUrl, apiKey, parser })

        // Find existing product by prestashopId, sku (ref), or reference (ERP ref)
        const existing = await prisma.product.findFirst({
          where: {
            OR: [
              prestashopId ? { prestashopId } : undefined,
              ref ? { sku: ref } : undefined,
              ref ? { reference: ref } : undefined
            ].filter(Boolean)
          }
        })

        if (existing) {
          // Update only price (TTC from website), keep existing TVA rate from Excel
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              price: priceTTC,
              prestashopId: existing.prestashopId || prestashopId || null,
              prestashopLastSynced: new Date()
            }
          })
          notChanged++ // price updated only
          updated++
          if (processed % 200 === 0) {
            console.log(`✅ Updated ${existing.name || name} (PS#${prestashopId}) TTC=${priceTTC}`)
          }
          continue
        }

        // Create new product (use default TVA for new products not in Excel)
        const createdProduct = await prisma.product.create({
          data: {
            name: String(name).trim(),
            reference: ref || null,
            sku: ref || (prestashopId ? `PSHOP-${prestashopId}` : null),
            price: priceTTC,
            cost: null,
            tvaRate: DEFAULT_TVA_RATE, // Default TVA for new products
            isService: false,
            lowStockThreshold: 0,
            invoiceableQuantity: 0,
            isOnline: true,
            prestashopId: prestashopId || null,
            prestashopLastSynced: new Date(),
            stockAvailables: { create: { quantity } }
          }
        })
        created++
        if (processed % 200 === 0) {
          console.log(`🆕 Created ${createdProduct.name} (SKU: ${createdProduct.sku || 'n/a'}) qty=${quantity} TTC=${priceTTC}`)
        }
      } catch (err) {
        errors++
        console.error('❌ Product sync error:', err.message)
      }
      processed++
    }
  } catch (err) {
    console.error('❌ Fatal sync error:', err.message)
    errors++
  } finally {
    console.log('\n' + '='.repeat(50))
    console.log('PrestaShop Sync Summary')
    console.log(`Updated (price only): ${updated}`)
    console.log(`Created: ${created}`)
    console.log(`Errors: ${errors}`)
    console.log(`Processed: ${processed}`)
    console.log('='.repeat(50) + '\n')
    await prisma.$disconnect()
  }
}

sync()
