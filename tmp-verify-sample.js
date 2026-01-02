import 'dotenv/config'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
const SAMPLE_SIZE = 10

async function fetchPsById(id, baseUrl, apiKey) {
  const url = `${baseUrl}/products/${id}?ws_key=${apiKey}`
  const res = await axios.get(url, {
    headers: { Accept: 'application/xml', 'Content-Type': 'application/xml' },
    timeout: 60000
  })
  const parsed = parser.parse(res.data)
  const p = parsed.prestashop?.product
  if (!p) return null
  const priceRaw = p.price?.[0] || p.price?._text || p.price?.['#text'] || p.price || 0
  const name = p.name?.language?._text || p.name?.language?.['#text'] || p.name?.language || p.name
  const reference = p.reference
  const price = Number(priceRaw) || 0
  return { price, name, reference }
}

async function main() {
  const baseUrl = process.env.PRESTASHOP_API_URL
  const apiKey = process.env.PRESTASHOP_API_KEY
  if (!baseUrl || !apiKey) throw new Error('Missing PRESTASHOP_API_URL or PRESTASHOP_API_KEY')

  const products = await prisma.product.findMany({
    where: { prestashopId: { not: null } },
    orderBy: { prestashopLastSynced: 'desc' },
    take: SAMPLE_SIZE,
    select: {
      id: true,
      name: true,
      price: true,
      prestashopId: true,
      reference: true,
      sku: true,
      prestashopLastSynced: true
    }
  })

  const report = []
  for (const p of products) {
    const ps = await fetchPsById(p.prestashopId, baseUrl, apiKey)
    if (!ps) {
      report.push({ id: p.id, name: p.name, psId: p.prestashopId, status: 'missing_in_ps' })
      continue
    }
    const diff = Number((p.price - ps.price).toFixed(3))
    report.push({
      id: p.id,
      name: p.name,
      reference: p.reference,
      sku: p.sku,
      psId: p.prestashopId,
      erpPrice: p.price,
      psPrice: ps.price,
      priceDiff: diff
    })
  }

  console.table(report)
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect()
  })
