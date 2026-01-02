import 'dotenv/config'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    return 0
  }
}

async function sync() {
  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  let processed = 0

  try {
    const { products, parser, baseUrl, apiKey } = await fetchPrestashopProducts()
    console.log(`✅ Retrieved ${products.length} products from PrestaShop\n`)

    for (const p of products) {
      try {
        const prestashopId = String(p.id?.[0] ?? p.id ?? '').trim()
        const name = p.name?.language?._text || p.name?.language?.['#text'] || p.name?.language || p.name || 'Unnamed Product'
        const ref = String(p.reference ?? '').trim()
        const priceTTC = Number(p.price?.[0] || p.price?._text || p.price?.['#text'] || p.price || 0) || 0

        const stockId = p.associations?.stock_availables?.stock_available?.id ||
                        p.associations?.stock_availables?.stock_available?.[0]?.id
        const quantity = await fetchStockQuantity(stockId, { baseUrl, apiKey, parser })

        // Check if product already exists by prestashopId, sku, or reference
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
          // Update only price, keep existing TVA
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              price: priceTTC,
              prestashopId: existing.prestashopId || prestashopId || null,
              prestashopLastSynced: new Date()
            }
          })
          updated++
          if (processed % 200 === 0) {
            console.log(`✅ Updated ${existing.name} - Price TTC: ${priceTTC}`)
          }
        } else {
          // Create new product with TVA default 19%
          const createdProduct = await prisma.product.create({
            data: {
              name: String(name).trim(),
              reference: ref || null,
              sku: ref || (prestashopId ? `PSHOP-${prestashopId}` : null),
              price: priceTTC,
              cost: null,
              tvaRate: 19, // Default TVA
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
            console.log(`🆕 Created ${createdProduct.name} - Price TTC: ${priceTTC}`)
          }
        }
      } catch (err) {
        errors++
        console.error('❌ Product sync error:', err.message)
      }
      processed++
    }

    console.log('\n' + '='.repeat(60))
    console.log('PrestaShop Sync Summary')
    console.log(`Updated: ${updated}`)
    console.log(`Created: ${created}`)
    console.log(`Skipped: ${skipped}`)
    console.log(`Errors: ${errors}`)
    console.log(`Total Processed: ${processed}`)
    console.log('='.repeat(60) + '\n')
  } catch (err) {
    console.error('❌ Fatal sync error:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

sync()
