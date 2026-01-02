import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

// Get all bons livraison client
router.get('/', authenticate, async (req, res) => {
  try {
    const bons = await prisma.bonLivraisonClient.findMany({
      include: { 
        client: true,
        commandeClient: true,
        bonCommandeClient: true,
        factureClient: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    const bonsWithStatus = bons.map(bon => ({
      ...bon,
      hasCommandeClient: !!bon.commandeClient,
      commandeClientNumero: bon.commandeClient?.numero || null,
      hasBonCommande: !!bon.bonCommandeClient,
      bonCommandeNumero: bon.bonCommandeClient?.numero || null,
      hasFacture: !!bon.factureClient,
      factureNumero: bon.factureClient?.numero || null
    }))
    
    res.json(bonsWithStatus)
  } catch (e) {
    console.error('Error fetching bons livraison client', e)
    res.status(500).json({ error: 'Erreur récupération bons livraison' })
  }
})

// Get single bon livraison client with lines
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bon = await prisma.bonLivraisonClient.findUnique({
      where: { id: Number(req.params.id) },
      include: { 
        client: true, 
        lignes: { include: { product: true } },
        commandeClient: { select: { trackingNumber: true, transporter: true } }
      }
    })
    if (!bon) return res.status(404).json({ error: 'Bon livraison non trouvé' })
    res.json({
      ...bon,
      trackingNumber: bon.commandeClient?.trackingNumber || null,
      transporter: bon.commandeClient?.transporter || null
    })
  } catch (e) {
    console.error('Error fetching bon livraison client', e)
    res.status(500).json({ error: 'Erreur récupération bon livraison' })
  }
})

// Create bon livraison client
router.post('/', authenticate, async (req, res) => {
  try {
    const { clientId, date, statut, notes, lignes } = req.body

    // Calculate totals
    let montantHT = 0, montantTVA = 0
    const lignesWithTotals = lignes.map((l: any) => {
      const lHT = l.quantite * l.prixUnitaireHT
      const lTVA = lHT * l.tauxTVA / 100
      const lTTC = lHT + lTVA
      montantHT += lHT
      montantTVA += lTVA
      return { ...l, montantHT: lHT, montantTVA: lTVA, montantTTC: lTTC }
    })
    const timbreFiscal = 1.0
    const montantTTC = montantHT + montantTVA + timbreFiscal

    // Generate numero
    const count = await prisma.bonLivraisonClient.count()
    const numero = `BL${String(count + 1).padStart(6, '0')}`

    const bon = await prisma.bonLivraisonClient.create({
      data: {
        numero,
        clientId,
        date: new Date(date),
        statut,
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        notes,
        lignes: { create: lignesWithTotals }
      },
      include: { client: true, lignes: true }
    })
    res.json(bon)
  } catch (e) {
    console.error('Error creating bon livraison client', e)
    res.status(500).json({ error: 'Erreur création bon livraison' })
  }
})

// Update bon livraison client
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { clientId, date, statut, notes, lignes } = req.body

    // Calculate totals
    let montantHT = 0, montantTVA = 0
    const lignesWithTotals = lignes.map((l: any) => {
      const lHT = l.quantite * l.prixUnitaireHT
      const lTVA = lHT * l.tauxTVA / 100
      const lTTC = lHT + lTVA
      montantHT += lHT
      montantTVA += lTVA
      return { ...l, montantHT: lHT, montantTVA: lTVA, montantTTC: lTTC }
    })
    const montantTTC = montantHT + montantTVA

    // Delete existing lines
    await prisma.ligneBonLivraisonClient.deleteMany({ where: { bonLivraisonClientId: Number(req.params.id) } })

    const bon = await prisma.bonLivraisonClient.update({
      where: { id: Number(req.params.id) },
      data: {
        clientId,
        date: new Date(date),
        statut,
        montantHT,
        montantTVA,
        montantTTC,
        notes,
        lignes: { create: lignesWithTotals }
      },
      include: { client: true, lignes: true }
    })
    res.json(bon)
  } catch (e) {
    console.error('Error updating bon livraison client', e)
    res.status(500).json({ error: 'Erreur mise à jour bon livraison' })
  }
})

// Delete bon livraison client
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.bonLivraisonClient.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Bon livraison supprimé' })
  } catch (e) {
    console.error('Error deleting bon livraison client', e)
    res.status(500).json({ error: 'Erreur suppression bon livraison' })
  }
})

// Convert to Facture
router.post('/:id/convert-to-facture', authenticate, async (req, res) => {
  try {
    const bonId = Number(req.params.id);
    console.log(`🔄 Converting Bon Livraison ${bonId} to Facture...`);
    
    const bon = await prisma.bonLivraisonClient.findUnique({
      where: { id: bonId },
      include: { lignes: { include: { product: true } }, client: true, factureClient: true }
    })
    
    if (!bon) {
      console.error(`❌ Bon Livraison ${bonId} not found`);
      return res.status(404).json({ error: 'Bon livraison non trouvé' });
    }

    if (bon.factureClientId || bon.factureClient) {
      return res.status(400).json({ error: 'Bon livraison déjà converti en facture' });
    }

    console.log(`✅ Found Bon Livraison ${bon.numero} with ${bon.lignes.length} lines`);

    // Check invoiceable quantities
    const insufficientProducts: any[] = [];
    for (const ligne of bon.lignes) {
      if (ligne.productId && ligne.product) {
        if (ligne.product.invoiceableQuantity < ligne.quantite) {
          insufficientProducts.push({
            name: ligne.product.name,
            reference: ligne.product.reference,
            requested: ligne.quantite,
            available: ligne.product.invoiceableQuantity
          });
        }
      }
    }

    if (insufficientProducts.length > 0) {
      console.error('❌ Insufficient invoiceable quantity:', insufficientProducts);
      return res.status(400).json({ 
        error: 'Quantité facturable insuffisante',
        details: insufficientProducts 
      });
    }

    // Generate unique facture numero by finding the last one and incrementing
    const lastFacture = await prisma.factureClient.findFirst({
      orderBy: { id: 'desc' },
      select: { numero: true }
    });
    
    let nextNumber = 1;
    if (lastFacture?.numero) {
      // Extract number from format like "FC000123"
      const match = lastFacture.numero.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }
    
    const fcNumero = `FC${String(nextNumber).padStart(6, '0')}`;
    console.log(`📝 Creating Facture ${fcNumero}...`);

    // Always include timbre fiscal in factures (1.0 TND)
    const timbreFiscal = 1.0
    const montantTTC = bon.montantHT + bon.montantTVA + timbreFiscal

    const facture = await prisma.factureClient.create({
      data: {
        numero: fcNumero,
        clientId: bon.clientId,
        date: new Date(),
        statut: 'BROUILLON',
        montantHT: bon.montantHT,
        montantTVA: bon.montantTVA,
        timbreFiscal: timbreFiscal,
        montantTTC: montantTTC,
        deliveryFee: bon.deliveryFee,
        deliveryTvaRate: bon.deliveryTvaRate,
        notes: `Créée depuis Bon Livraison ${bon.numero}`,
        lignes: {
          create: bon.lignes.map(l => ({
            productId: l.productId,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHT: l.prixUnitaireHT,
            tauxTVA: l.tauxTVA,
            montantHT: l.montantHT,
            montantTVA: l.montantTVA,
            montantTTC: l.montantTTC
          }))
        },
        bonLivraisonClient: {
          connect: { id: bonId }
        }
      },
      include: { client: true, lignes: true }
    })

    // Reduce invoiceable quantities
    for (const ligne of bon.lignes) {
      if (ligne.productId) {
        await prisma.product.update({
          where: { id: ligne.productId },
          data: {
            invoiceableQuantity: {
              decrement: ligne.quantite
            }
          }
        });
      }
    }

    console.log(`✅ Facture ${facture.numero} created successfully`);
    res.json(facture)
  } catch (e: any) {
    console.error('❌ Error converting to facture:', e);
    console.error('Error details:', e.message);
    if (e.code) console.error('Error code:', e.code);
    res.status(500).json({ error: `Erreur conversion: ${e.message}` })
  }
})

// Create Bon Livraison from CommandeClient
router.post('/from-commande/:id', authenticate, async (req, res) => {
  try {
    const commandeId = Number(req.params.id)
    const commande = await prisma.commandeClient.findUnique({
      where: { id: commandeId },
      include: { lignes: true, client: true }
    })
    if (!commande) return res.status(404).json({ error: 'Commande introuvable' })
    if (commande.bonLivraisonClientId) return res.status(400).json({ error: 'Commande déjà convertie en bon de livraison' })

    // Totals
    const montantHT = commande.montantHT
    const montantTVA = commande.montantTVA
    const montantTTC = commande.montantHT + commande.montantTVA

    // Generate numero (simple)
    const count = await prisma.bonLivraisonClient.count()
    const numero = `BL${String(count + 1).padStart(6, '0')}`

    const bon = await prisma.bonLivraisonClient.create({
      data: {
        numero,
        clientId: commande.clientId,
        date: new Date(),
        statut: 'BROUILLON',
        montantHT, montantTVA, montantTTC,
        deliveryFee: commande.deliveryFee,
        deliveryTvaRate: commande.deliveryTvaRate,
        notes: `Créé depuis Commande ${commande.numero} (POS)`,
        lignes: { create: commande.lignes.map(l => ({
          productId: l.productId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          tauxTVA: l.tauxTVA,
          montantHT: l.montantHT,
          montantTVA: l.montantTVA,
          montantTTC: l.montantTTC,
        })) }
      },
      include: { client: true, lignes: true }
    })

    // Link back to commande
    await prisma.commandeClient.update({
      where: { id: commandeId },
      data: { bonLivraisonClientId: bon.id }
    })

    res.json(bon)
  } catch (e) {
    console.error('Error creating BL from commande', e)
    res.status(500).json({ error: 'Erreur création BL' })
  }
})

export default router
