import 'dotenv/config'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

async function fetchPrestashopProducts() {
  const baseUrl = process.env.PRESTASHOP_API_URL
  const apiKey = process.env.PRESTASHOP_API_KEY
  if (!baseUrl || !apiKey) throw new Error('Missing PRESTASHOP_API_URL or PRESTASHOP_API_KEY')

  console.log(`Fetching PrestaShop products from ${baseUrl} ...`)
  const res = await axios.get(`${baseUrl}/products?display=full&ws_key=${apiKey}`, {
    headers: { Accept: 'application/xml', 'Content-Type': 'application/xml' },
    timeout: 180000
  })

  const parsed = parser.parse(res.data)
  let products = parsed.prestashop?.products?.product
  if (!Array.isArray(products)) products = products ? [products] : []

  const map = new Map()
  for (const p of products) {
    const id = String(p.id?.[0] ?? p.id ?? '').trim()
    const priceRaw = p.price?.[0] || p.price?._text || p.price?.['#text'] || p.price || 0
    const price = Number(priceRaw) || 0
    if (id) map.set(id, { price })
  }
  console.log(`✅ Loaded ${map.size} PrestaShop products`)
  return map
}

async function main() {
  const psMap = await fetchPrestashopProducts()

  const erpProducts = await prisma.product.findMany({
    where: { prestashopId: { not: null } },
    select: {
      id: true,
      name: true,
      price: true,
      prestashopId: true
    }
  })

  let fixCount = 0
  let skipCount = 0
  let processCount = 0

  console.log(`\nProcessing ${erpProducts.length} ERP products...`)

  for (const p of erpProducts) {
    const ps = psMap.get(String(p.prestashopId))
    if (!ps) {
      skipCount++
      continue
    }

    const diff = Number((p.price - ps.price).toFixed(3))
    if (diff !== 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: { price: ps.price, prestashopLastSynced: new Date() }
      })
      fixCount++
      if (processCount % 100 === 0) {
        console.log(`  Processing... ${processCount}/${erpProducts.length} (fixed: ${fixCount})`)
      }
    }
    processCount++
  }

  console.log('\n' + '='.repeat(60))
  console.log('Price Fix Summary')
  console.log(`Fixed: ${fixCount}`)
  console.log(`Skipped (not found in PS): ${skipCount}`)
  console.log(`Processed: ${processCount}`)
  console.log('='.repeat(60))
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect()
  })
