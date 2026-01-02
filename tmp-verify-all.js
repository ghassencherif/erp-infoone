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
    const reference = String(p.reference ?? '').trim()
    const name = p.name?.language?._text || p.name?.language?.['#text'] || p.name?.language || p.name
    if (id) map.set(id, { price, reference, name })
  }
  console.log(`Loaded ${map.size} PrestaShop products`)
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
      prestashopId: true,
      reference: true,
      sku: true
    }
  })

  let mismatches = []
  for (const p of erpProducts) {
    const ps = psMap.get(String(p.prestashopId))
    if (!ps) {
      mismatches.push({ ...p, psPrice: null, priceDiff: null, status: 'missing_in_ps' })
      continue
    }
    const diff = Number((p.price - ps.price).toFixed(3))
    if (diff !== 0) {
      mismatches.push({
        ...p,
        psPrice: ps.price,
        psReference: ps.reference,
        psName: ps.name,
        priceDiff: diff,
        status: 'price_mismatch'
      })
    }
  }

  mismatches = mismatches.sort((a, b) => Math.abs(b.priceDiff ?? 0) - Math.abs(a.priceDiff ?? 0))
  console.log(`Total ERP products with prestashopId: ${erpProducts.length}`)
  console.log(`Mismatches found: ${mismatches.length}`)
  console.log('Top 30 mismatches:')
  console.table(mismatches.slice(0, 30))
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect()
  })
