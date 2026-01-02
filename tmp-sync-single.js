import 'dotenv/config';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ref = 'RIVA-5562-R';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const DEFAULT_TVA_RATE = 19;

async function fetchProduct() {
  const baseUrl = process.env.PRESTASHOP_API_URL;
  const apiKey = process.env.PRESTASHOP_API_KEY;
  const url = `${baseUrl}/products?filter[reference]=[${encodeURIComponent(ref)}]&display=full&ws_key=${apiKey}`;
  const res = await axios.get(url, { headers: { Accept: 'application/xml', 'Content-Type': 'application/xml' } });
  const parsed = parser.parse(res.data);
  let products = parsed.prestashop?.products?.product;
  if (!Array.isArray(products)) products = products ? [products] : [];
  return products[0];
}

async function run() {
  const p = await fetchProduct();
  if (!p) throw new Error('Product not found in PrestaShop');
  const prestashopId = String(p.id?.[0] ?? p.id ?? '').trim();
  const name = p.name?.language?._text || p.name?.language?.['#text'] || p.name?.language || p.name || 'Unnamed Product';
  const refPs = String(p.reference ?? '').trim();
  const priceRaw = p.price?.[0] || p.price?._text || p.price?.['#text'] || p.price || 0;
  const sellingPrice = Number(priceRaw) || 0;

  console.log({ prestashopId, name, refPs, priceRaw, sellingPrice });

  const existing = await prisma.product.findFirst({
    where: {
      OR: [
        prestashopId ? { prestashopId } : undefined,
        refPs ? { sku: refPs } : undefined,
        refPs ? { reference: refPs } : undefined,
      ].filter(Boolean),
    },
  });

  console.log('Existing match:', existing);

  if (existing) {
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        price: sellingPrice,
        prestashopId: existing.prestashopId || prestashopId || null,
        prestashopLastSynced: new Date(),
      },
    });
    console.log('Updated record:', updated);
  } else {
    const created = await prisma.product.create({
      data: {
        name: String(name).trim(),
        reference: refPs || null,
        sku: refPs || (prestashopId ? `PSHOP-${prestashopId}` : null),
        price: sellingPrice,
        cost: null,
        tvaRate: DEFAULT_TVA_RATE,
        isService: false,
        lowStockThreshold: 0,
        invoiceableQuantity: 0,
        isOnline: true,
        prestashopId: prestashopId || null,
        prestashopLastSynced: new Date(),
        stockAvailables: { create: { quantity: 0 } },
      },
    });
    console.log('Created record:', created);
  }
}

run()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
