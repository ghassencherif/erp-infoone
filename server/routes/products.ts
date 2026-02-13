import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { XMLParser } from 'fast-xml-parser'
import axios from 'axios'
import XLSX from 'xlsx'
import multer from 'multer'

type CategoryInfo = { id: string, parentId: string | null, name: string }

function escapeXmlContent(text: string) {
  return text.replace(/[<>&'"']/g, (char: string) => {
    const map: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;'
    }
    return map[char] || char
  })
}

function cleanXmlCdata(xml: string) {
  if (typeof xml !== 'string') return xml
  // First handle well-formed CDATA blocks by escaping their contents
  let cleaned = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_match, content) => escapeXmlContent(content))
  // Then strip any leftover opening/closing CDATA markers in case of malformed blocks
  cleaned = cleaned.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
  return cleaned
}

function getLocalizedText(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = getLocalizedText(item)
      if (text) return text
    }
    return ''
  }
  const direct = value._text || value['#text'] || value['#cdata'] || value['#cdata-section'] || ''
  return typeof direct === 'string' ? direct : String(direct || '')
}

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const toNumber = (value: any) => {
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

const toInt = (value: any) => {
  const num = Math.round(toNumber(value))
  return Number.isNaN(num) ? 0 : num
}

const normalizeTvaRate = (value: any) => {
  const raw = toNumber(value)
  return raw <= 1 ? raw * 100 : raw
}

// Get all products
router.get('/', authenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockAvailables: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    res.json(products)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Import products from Excel (PRODUCT001 format)
router.post('/import-excel', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier manquant' })
    }

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    let created = 0
    let updated = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const reference = row['REF FAC'] ? String(row['REF FAC']).trim() : ''
      const sku = row['REF PRESTA'] ? String(row['REF PRESTA']).trim() : ''
      const name = row['Désignation'] ? String(row['Désignation']).trim() : (sku || reference || `Produit sans designation ${i + 1}`)

      const stockReal = toInt(row['QT REEL'])
      const invoiceable = toInt(row['QT FAC'])
      const priceTTC = toNumber(row['P.V TTC (+7%)'])
      const costTTC = toNumber(row['P.A TTC'])
      const tvaRate = normalizeTvaRate(row['TVA'])

      let existing: any = null
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
            description: name,
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

    res.json({ message: 'Import terminé', created, updated })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Lookup by barcode (for POS)
router.get('/barcode/:code', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findFirst({ where: { /* @ts-ignore */ barcode: req.params.code } as any, include: { stockAvailables: true } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Lookup by serial number (supports products storing multiple serials in one field)
router.get('/serial/:serial', authenticate, async (req, res) => {
  try {
    const serial = req.params.serial
    const product = await prisma.product.findFirst({
      where: {
        serialNumber: { contains: serial, mode: 'insensitive' } as any
      },
      include: { stockAvailables: true }
    })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get product by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        stockAvailables: true
      }
    })
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json(product)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create product (not synced to PrestaShop by default)
router.post('/', authenticate, async (req, res) => {
  try {
  const { name, reference, sku, barcode, serialNumber, description, price, promoPrice, cost, tvaRate, isService, lowStockThreshold, quantity, invoiceableQuantity, isOnline } = req.body;
    const product = await prisma.product.create({
      data: ({
        name,
        reference,
        sku,
        description,
        barcode: barcode || null,
        serialNumber: serialNumber || null,
        price: parseFloat(price),
        promoPrice: promoPrice ? parseFloat(promoPrice) : null,
        cost: cost ? parseFloat(cost) : null,
        tvaRate: tvaRate != null ? parseFloat(tvaRate) : 19,
        isService: !!isService,
        lowStockThreshold: lowStockThreshold != null ? parseInt(lowStockThreshold) : 0,
        invoiceableQuantity: invoiceableQuantity != null ? parseInt(invoiceableQuantity) : 0,
        isOnline: !!isOnline,
        stockAvailables: { create: { quantity: quantity != null ? parseInt(quantity) : 0 } }
      } as any),
      include: { stockAvailables: true }
    });

    if (product.isOnline) {
      try { await syncProductToPrestaShop(product); } catch (error) { console.error('Failed to sync product to PrestaShop:', error); }
    }
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
  const { name, reference, sku, barcode, serialNumber, description, price, promoPrice, cost, tvaRate, isService, lowStockThreshold, quantity, invoiceableQuantity, isOnline } = req.body;
    const id = parseInt(req.params.id);
    let product = await prisma.product.update({
      where: { id },
      data: ({
        name,
        reference,
        sku,
        description,
        barcode: barcode !== undefined ? (barcode || null) : undefined,
        serialNumber: serialNumber !== undefined ? (serialNumber || null) : undefined,
        price: parseFloat(price),
        promoPrice: promoPrice !== undefined ? (promoPrice ? parseFloat(promoPrice) : null) : undefined,
        cost: cost ? parseFloat(cost) : null,
        tvaRate: tvaRate !== undefined ? parseFloat(tvaRate) : undefined,
        isService: !!isService,
        lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : undefined,
        invoiceableQuantity: invoiceableQuantity !== undefined ? parseInt(invoiceableQuantity) : undefined,
        isOnline: !!isOnline
      } as any),
      include: { stockAvailables: true }
    });
    let finalQuantity: number | null = null
    if (quantity !== undefined) {
      const existingStock = await prisma.stockAvailable.findFirst({ where: { productId: id } });
      const q = parseInt(quantity);
      if (existingStock) {
        await prisma.stockAvailable.update({ where: { id: existingStock.id }, data: { quantity: q } });
      } else {
        await prisma.stockAvailable.create({ data: { productId: id, quantity: q } });
      }
      finalQuantity = q
    }
    
    if (product.isOnline && !product.prestashopId) {
      try { await syncProductToPrestaShop(product); } catch (error: any) { return res.status(500).json({ error: 'Failed to sync to PrestaShop: ' + error.message }); }
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    // Delete stock first
    await prisma.stockAvailable.deleteMany({
      where: { productId: id }
    })

    // Delete product
    await prisma.product.delete({
      where: { id }
    })

    res.json({ message: 'Product deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Toggle product online status (sync to/from PrestaShop)
router.patch('/:id/toggle-online', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const product = await prisma.product.findUnique({
      where: { id },
      include: { stockAvailables: true }
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const newOnlineStatus = !product.isOnline

    // If turning online and not yet synced to PrestaShop
    if (newOnlineStatus && !product.prestashopId) {
      try {
        await syncProductToPrestaShop(product)
      } catch (error: any) {
        return res.status(500).json({ error: 'Failed to sync to PrestaShop: ' + error.message })
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isOnline: newOnlineStatus },
      include: { stockAvailables: true }
    })

    res.json(updatedProduct)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Helper function to sync product to PrestaShop
async function syncProductToPrestaShop(product: any) {
  const baseUrl = process.env.PRESTASHOP_API_URL
  const apiKey = process.env.PRESTASHOP_API_KEY

  if (!baseUrl || !apiKey) {
    throw new Error('PrestaShop configuration missing')
  }

  // Create product XML for PrestaShop
  const productXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id_shop_default>1</id_shop_default>
    <id_category_default>2</id_category_default>
    <active>1</active>
    <available_for_order>1</available_for_order>
    <show_price>1</show_price>
    <state>1</state>
    <price>${product.price}</price>
    <reference><![CDATA[${product.sku || ''}]]></reference>
    <name>
      <language id="1"><![CDATA[${product.name}]]></language>
    </name>
    <description>
      <language id="1"><![CDATA[${product.description || product.name}]]></language>
    </description>
    <link_rewrite>
      <language id="1"><![CDATA[${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}]]></language>
    </link_rewrite>
  </product>
</prestashop>`;

  const response = await axios.post(`${baseUrl}/products?ws_key=${apiKey}`, productXml, { headers: { 'Content-Type': 'application/xml', 'Accept': 'application/xml' } });
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(response.data);
  const prestashopId = String(parsed.prestashop?.product?.id || '');
  await prisma.product.update({ where: { id: product.id }, data: { prestashopId, prestashopLastSynced: new Date() } });
  return prestashopId;
}

// Fetch all categories once to resolve top-level category names
async function fetchCategories(baseUrl: string, apiKey: string) {
  try {
    const response = await axios.get(`${baseUrl}/categories?display=full&ws_key=${apiKey}`, {
      headers: {
        'Accept': 'application/xml',
        'Content-Type': 'application/xml'
      }
    })

    // Clean up the XML before parsing
    let xmlData = cleanXmlCdata(response.data)

    const categoryParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: false,
      isArray: (name: string) => ['category', 'language'].includes(name)
    })

    let parsed
    try {
      parsed = categoryParser.parse(xmlData)
    } catch (parseError: any) {
      console.error('Category XML parse error, retrying with extra cleaning:', parseError.message)
      xmlData = cleanXmlCdata(xmlData)
      parsed = categoryParser.parse(xmlData)
    }
    let categories = parsed.prestashop?.categories?.category || []
    if (!Array.isArray(categories)) categories = [categories]

    const map = new Map<string, CategoryInfo>()
    for (const cat of categories) {
      const id = String(cat.id || cat.id?._text || '')
      const parentIdRaw = cat.id_parent || cat.id_parent?._text || '0'
      const parentId = parentIdRaw ? String(parentIdRaw) : '0'
      const name = getLocalizedText(cat.name?.language) || getLocalizedText(cat.name) || id
      if (id) {
        map.set(id, { id, parentId, name })
      }
    }
    return map
  } catch (error: any) {
    console.warn('Failed to fetch categories:', error.message)
    return new Map<string, CategoryInfo>()
  }
}

// Walk up the tree to get the first-level category (child of root/home)
function resolveTopCategoryName(categoryId: string, categoriesMap: Map<string, CategoryInfo>): string | null {
  if (!categoryId || categoriesMap.size === 0) return null
  let current = categoriesMap.get(categoryId)
  if (!current) return null

  // Stop at root (id_parent 0 or 1 usually Home)
  while (current.parentId && current.parentId !== '0' && current.parentId !== '1') {
    const parent = categoriesMap.get(current.parentId)
    if (!parent) break
    current = parent
  }
  return current.name || null
}

// Sync products from PrestaShop
router.post('/sync', authenticate, async (req: any, res: any) => {
  try {
    console.log('Sync request received from user:', req.user)
    const baseUrl = process.env.PRESTASHOP_API_URL
    const apiKey = process.env.PRESTASHOP_API_KEY

    console.log('PrestaShop config:', { baseUrl, hasApiKey: !!apiKey })

    if (!baseUrl || !apiKey) {
      console.log('Missing PrestaShop configuration')
      return res.status(500).json({ error: 'Missing PrestaShop configuration' })
    }

    console.log('Fetching products from PrestaShop...')
    // Fetch products from PrestaShop - PrestaShop expects XML format with API key in URL
    const response = await axios.get(`${baseUrl}/products?display=full&ws_key=${apiKey}`, {
      headers: {
        'Accept': 'application/xml',
        'Content-Type': 'application/xml'
      },
      timeout: 120000
    })

    console.log('PrestaShop response received, status:', response.status)

    // Clean up the XML before parsing - strip/escape problematic CDATA blocks
    let xmlData = cleanXmlCdata(response.data)

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: false,
      isArray: (name: string) => ['product', 'category', 'language', 'stock_available'].includes(name)
    })

    let parsed
    try {
      parsed = parser.parse(xmlData)
    } catch (parseError: any) {
      console.error('XML Parse error, attempting alternative parsing:', parseError.message)
      // Fallback: extra cleaning then lenient parsing
      xmlData = cleanXmlCdata(xmlData)
      const fallbackParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseTagValue: true,
        stopNodes: ['*.prestashop.products'],
        unpairedTags: ['br', 'hr', 'img', 'input', 'meta', 'link']
      })
      parsed = fallbackParser.parse(xmlData)
    }

    const categoriesMap = await fetchCategories(baseUrl, apiKey)
    let products = parsed.prestashop?.products?.product || []

    if (!Array.isArray(products)) {
      products = products ? [products] : []
    }

    console.log(`Found ${products.length} products to sync`)

    // Sync each product
    const results = []
    for (const product of products) {
      const prestashopId = String(product.id?.[0] || product.id)
      const name = getLocalizedText(product.name?.language) || getLocalizedText(product.name) || 'Unnamed Product'
      const reference = String(product.reference || '')
      const priceRaw = product.price?.[0] || product.price?._text || product.price?.['#text'] || product.price || 0
      let price = parseFloat(String(priceRaw)) || 0

      // Apply simple promotion if a specific_price exists (percentage or amount).
      const specificPrices = product.specific_prices?.specific_price
        ? Array.isArray(product.specific_prices.specific_price)
          ? product.specific_prices.specific_price
          : [product.specific_prices.specific_price]
        : []

      if (specificPrices.length > 0) {
        const sp = specificPrices[0]
        const reductionRaw = sp.reduction?._text || sp.reduction?.['#text'] || sp.reduction || 0
        const reduction = parseFloat(String(reductionRaw)) || 0
        const reductionType = sp.reduction_type?._text || sp.reduction_type?.['#text'] || sp.reduction_type || ''
        const fromDate = sp.from?._text || sp.from?.['#text'] || sp.from || null
        const toDate = sp.to?._text || sp.to?.['#text'] || sp.to || null

        const now = new Date()
        const fromOk = !fromDate || new Date(fromDate) <= now
        const toOk = !toDate || now <= new Date(toDate)

        if (fromOk && toOk && reduction > 0) {
          if (reductionType === 'amount') {
            price = Math.max(0, price - reduction)
          } else if (reductionType === 'percentage') {
            price = price * (1 - reduction)
          }
        }
      }

      const defaultCategoryId = product.id_category_default || product?.associations?.categories?.category?.id || product?.associations?.categories?.category?.[0]?.id
      const categoryName = defaultCategoryId ? resolveTopCategoryName(String(defaultCategoryId), categoriesMap) : null

      // Get stock_available ID from product associations
      const stockAvailableId = product.associations?.stock_availables?.stock_available?.id ||
                               product.associations?.stock_availables?.stock_available?.[0]?.id

      let quantity = 0
      
      // If we have stock_available ID, fetch the actual stock quantity
      if (stockAvailableId) {
        try {
          const stockResponse = await axios.get(`${baseUrl}/stock_availables/${stockAvailableId}?ws_key=${apiKey}`, {
            headers: {
              'Accept': 'application/xml',
              'Content-Type': 'application/xml'
            }
          })
          
          const stockParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseTagValue: true
          })
          const stockParsed = stockParser.parse(stockResponse.data)
          const stockData = stockParsed.prestashop?.stock_available
          const rawQty = stockData?.quantity?.[0] || stockData?.quantity?._text || stockData?.quantity?.['#text'] || stockData?.quantity || 0
          quantity = parseInt(String(rawQty), 10) || 0
        } catch (stockError: any) {
          console.log(`Failed to fetch stock for product ${prestashopId}:`, stockError.message)
        }
      }

      const upsertedProduct = await prisma.product.upsert({
        where: { prestashopId },
        create: {
          name,
          sku: reference || `PSHOP-${prestashopId}`,
          category: categoryName,
          price,
          prestashopId,
          prestashopLastSynced: new Date()
        },
        update: {
          name,
          sku: reference || undefined,
          category: categoryName,
          price,
          prestashopLastSynced: new Date()
        }
      })

      // Update or create stock record
      const existingStock = await prisma.stockAvailable.findFirst({
        where: { productId: upsertedProduct.id }
      })

      if (existingStock) {
        await prisma.stockAvailable.update({
          where: { id: existingStock.id },
          data: { quantity }
        })
      } else {
        await prisma.stockAvailable.create({
          data: {
            productId: upsertedProduct.id,
            quantity
          }
        })
      }

      results.push(upsertedProduct)
    }

    console.log(`Successfully synced ${results.length} products`)
    res.json({ message: `Synced ${results.length} products`, products: results })
  } catch (error: any) {
    console.error('Sync error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    res.status(500).json({ error: error.message })
  }
})

// Get related commandes client for a product
router.get('/:id/commandes-client', authenticate, async (req, res) => {
  try {
    const productId = parseInt(req.params.id)
    const lignes = await prisma.ligneCommandeClient.findMany({
      where: { productId },
      include: {
        commandeClient: {
          include: {
            client: true
          }
        }
      },
      orderBy: {
        commandeClient: { date: 'desc' }
      }
    })
    
    const result = lignes.map(l => ({
      id: l.commandeClient.id,
      numero: l.commandeClient.numero,
      date: l.commandeClient.date,
      statut: l.commandeClient.statut,
      client: l.commandeClient.client,
      quantite: l.quantite,
      montantHT: l.montantHT
    }))
    
    res.json(result)
  } catch (error: any) {
    console.error('Error fetching commandes client:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get related bons commande fournisseur for a product
router.get('/:id/commandes-fournisseur', authenticate, async (req, res) => {
  try {
    const productId = parseInt(req.params.id)
    const lignes = await prisma.ligneBonDeCommande.findMany({
      where: { productId },
      include: {
        bonDeCommande: {
          include: {
            fournisseur: true
          }
        }
      },
      orderBy: {
        bonDeCommande: { date: 'desc' }
      }
    })
    
    const result = lignes.map(l => ({
      id: l.bonDeCommande.id,
      numero: l.bonDeCommande.numero,
      date: l.bonDeCommande.date,
      statut: l.bonDeCommande.statut,
      fournisseur: l.bonDeCommande.fournisseur,
      quantite: l.quantite,
      montantHT: l.montantHT
    }))
    
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get related factures client for a product
router.get('/:id/factures-client', authenticate, async (req, res) => {
  try {
    const productId = parseInt(req.params.id)
    const lignes = await prisma.ligneFactureClient.findMany({
      where: { productId },
      include: {
        factureClient: {
          include: {
            client: true
          }
        }
      },
      orderBy: {
        factureClient: { date: 'desc' }
      }
    })
    
    const result = lignes.map(l => ({
      id: l.factureClient.id,
      numero: l.factureClient.numero,
      date: l.factureClient.date,
      statut: l.factureClient.statut,
      client: l.factureClient.client,
      quantite: l.quantite,
      montantHT: l.montantHT
    }))
    
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get related factures fournisseur for a product
router.get('/:id/factures-fournisseur', authenticate, async (req, res) => {
  try {
    const productId = parseInt(req.params.id)
    const lignes = await prisma.ligneFactureFournisseur.findMany({
      where: { productId },
      include: {
        facture: {
          include: {
            fournisseur: true
          }
        }
      },
      orderBy: {
        facture: { date: 'desc' }
      }
    })
    
    const result = lignes.map(l => ({
      id: l.facture.id,
      numero: l.facture.numero,
      date: l.facture.date,
      statut: l.facture.statut,
      fournisseur: l.facture.fournisseur,
      quantite: l.quantite,
      montantHT: l.montantHT
    }))
    
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
