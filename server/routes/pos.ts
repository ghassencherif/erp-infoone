import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

// POS sale: creates a CommandeClient for DIVERS (no FactureClient yet)
router.post('/sale', authenticate, async (req, res) => {
  try {
    const { items, clientId, notes, includeTimbreFiscal, printTicket, montantDonne, monnaieRendue, remise } = req.body as {
      items: Array<{ productId?: number; barcode?: string; serialNumber?: string; designation?: string; quantity: number; prixUnitaireHT?: number; tauxTVA?: number }>
      clientId?: number
      notes?: string
      includeTimbreFiscal?: boolean
      printTicket?: boolean
      montantDonne?: number | null
      monnaieRendue?: number | null
      remise?: number
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Aucun article' })
    }

    // Resolve products by id or barcode
    const resolvedItems: any[] = []
    for (const it of items) {
      let product = null as any
      if (it.productId) {
        product = await prisma.product.findUnique({ 
          where: { id: it.productId },
          include: { stockAvailables: true }
        })
      } else if (it.barcode || it.serialNumber) {
        // Prefer matching serial+barcode; fallback to serial; fallback to barcode only
        const query: any = {}
        if (it.barcode) query.barcode = it.barcode as any
        if (it.serialNumber) query.serialNumber = it.serialNumber as any
        product = await prisma.product.findFirst({ 
          where: query,
          include: { stockAvailables: true }
        })
        if (!product && it.serialNumber) {
          product = await prisma.product.findFirst({ 
            where: { serialNumber: it.serialNumber as any },
            include: { stockAvailables: true }
          })
        }
        if (!product && it.barcode) {
          product = await prisma.product.findFirst({ 
            where: { barcode: it.barcode as any },
            include: { stockAvailables: true }
          })
        }
      }

      const serialLabel = it.serialNumber || (product as any)?.serialNumber || ''
      const designation = it.designation || `${product?.name || 'Article'}${serialLabel ? `\nSN: ${serialLabel}` : ''}`
      const tauxTVA = (it.tauxTVA ?? (product as any)?.tvaRate ?? 19)
      const unit = it.prixUnitaireHT ?? (product ? product.price : 0)
      const qty = Math.max(1, parseInt(String(it.quantity)))

      // Validate stock
      if (product?.id) {
        const availableStock = product.stockAvailables[0]?.quantity ?? 0
        if (qty > availableStock) {
          return res.status(400).json({ error: `Stock insuffisant pour ${product.name}. Disponible: ${availableStock}, demandé: ${qty}` })
        }
      }

      const mHT = parseFloat((unit * qty).toFixed(3))
      const mTVA = parseFloat((mHT * (tauxTVA / 100)).toFixed(3))
      const mTTC = parseFloat((mHT + mTVA).toFixed(3))

      resolvedItems.push({
        productId: product?.id ?? null,
        designation,
        quantite: qty,
        prixUnitaireHT: unit,
        tauxTVA,
        montantHT: mHT,
        montantTVA: mTVA,
        montantTTC: mTTC
      })
    }

    // Totals before discount
    let subtotalHT = 0
    let subtotalTVA = 0
    for (const l of resolvedItems) { subtotalHT += l.montantHT; subtotalTVA += l.montantTVA }
    subtotalHT = parseFloat(subtotalHT.toFixed(3))
    subtotalTVA = parseFloat(subtotalTVA.toFixed(3))
    
    // Apply global discount if provided
    const discountRate = remise || 0;
    let montantHT = subtotalHT;
    let montantTVA = subtotalTVA;
    
    if (discountRate > 0) {
      const montantRemise = parseFloat((subtotalHT * (discountRate / 100)).toFixed(3));
      montantHT = parseFloat((subtotalHT - montantRemise).toFixed(3));
      // Recalculate TVA on discounted HT amount (assuming 19% TVA)
      montantTVA = parseFloat((montantHT * 0.19).toFixed(3));
    }
    
    const timbreFiscal = includeTimbreFiscal ? 1.0 : 0.0
    const montantTTC = parseFloat((montantHT + montantTVA + timbreFiscal).toFixed(3))

    // Find client (default DIVERS). Auto-create DIVERS if missing.
    let targetClientId: number
    if (clientId) {
      targetClientId = clientId
    } else {
      let divers = await prisma.client.findFirst({ where: { name: 'DIVERS' } })
      if (!divers) {
        // generate next client code like C00001
        const last = await prisma.client.findFirst({ orderBy: { id: 'desc' }, select: { code: true } })
        let nextNumber = 1
        if (last?.code && /^C\d{5}$/.test(last.code)) {
          nextNumber = parseInt(last.code.substring(1)) + 1
        }
        const code = `C${String(nextNumber).padStart(5, '0')}`
        divers = await prisma.client.create({ data: { code, name: 'DIVERS', email: null, phone: null, address: null } as any })
      }
      targetClientId = divers.id
    }

    // Generate commande numero (using last numero to avoid race conditions)
    const lastCommande = await prisma.commandeClient.findFirst({
      where: { numero: { startsWith: 'CC' } },
      orderBy: { numero: 'desc' }
    })
    let nextCCNumber = 1
    if (lastCommande && lastCommande.numero) {
      const match = lastCommande.numero.match(/CC(\d+)/)
      if (match) {
        nextCCNumber = parseInt(match[1]) + 1
      }
    }
    const ccNumero = `CC${String(nextCCNumber).padStart(6, '0')}`

    // Create CommandeClient (no facture yet)
    const commande = await prisma.commandeClient.create({
      data: {
        numero: ccNumero,
        clientId: targetClientId,
        date: new Date(),
        statut: 'LIVRE',
        source: 'OTHER',
        montantHT, montantTVA, timbreFiscal, montantTTC,
        remise: discountRate,
        notes: notes || null,
        printTicket: printTicket ?? false,
        montantDonne: montantDonne ?? null,
        monnaieRendue: monnaieRendue ?? null,
        lignes: { create: resolvedItems }
      } as any,
      include: { client: true, lignes: { include: { product: true } } }
    })

    // Decrement stock only (invoiceableQuantity is decremented when creating invoice)
    for (const l of resolvedItems) {
      if (l.productId) {
        const product = await prisma.product.findUnique({ 
          where: { id: l.productId },
          include: { stockAvailables: true }
        })
        if (product) {
          // Update stock quantity
          if (product.stockAvailables.length > 0) {
            const stock = product.stockAvailables[0]
            await prisma.stockAvailable.update({
              where: { id: stock.id },
              data: { quantity: Math.max(0, stock.quantity - l.quantite) }
            })
          }
        }
      }
    }

    res.status(201).json(commande)
  } catch (error: any) {
    console.error('POS sale error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
