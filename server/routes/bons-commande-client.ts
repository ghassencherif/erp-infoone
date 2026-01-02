import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

// Convert CommandeClient to BonCommandeClient
router.post('/from-commande/:id', authenticate, async (req, res) => {
  try {
    const commandeId = Number(req.params.id)
    const commande = await prisma.commandeClient.findUnique({
      where: { id: commandeId },
      include: { lignes: { include: { product: true } }, client: true }
    })
    if (!commande) return res.status(404).json({ error: 'Commande non trouvée' })
    if (commande.bonCommandeClientId) return res.status(400).json({ error: 'Commande déjà convertie en bon de commande' })

    // Get next numero
    const lastBonCommande = await prisma.bonCommandeClient.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    const lastNum = lastBonCommande ? parseInt(lastBonCommande.numero.split('-')[1]) : 0
    const numero = `BC-${String(lastNum + 1).padStart(6, '0')}`

    // Create bon commande with lines
    const bonCommande = await prisma.bonCommandeClient.create({
      data: {
        numero,
        clientId: commande.clientId,
        date: commande.date,
        dateEcheance: commande.dateEcheance,
        statut: 'BROUILLON',
        montantHT: commande.montantHT,
        montantTVA: commande.montantTVA,
        timbreFiscal: commande.timbreFiscal,
        montantTTC: commande.montantTTC,
        notes: commande.notes,
        lignes: {
          create: commande.lignes.map(l => ({
            productId: l.productId,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHT: l.prixUnitaireHT,
            tauxTVA: l.tauxTVA,
            montantHT: l.montantHT,
            montantTVA: l.montantTVA,
            montantTTC: l.montantTTC
          }))
        }
      },
      include: { client: true, lignes: true }
    })

    // Link back to commande
    await prisma.commandeClient.update({
      where: { id: commandeId },
      data: { bonCommandeClientId: bonCommande.id }
    })

    res.json(bonCommande)
  } catch (e) {
    console.error('Error converting commande to bon commande:', e)
    res.status(500).json({ error: 'Erreur conversion en bon de commande' })
  }
})

// Get all bons commande client
router.get('/', authenticate, async (req, res) => {
  try {
    const bons = await prisma.bonCommandeClient.findMany({
      include: { 
        client: true,
        bonLivraisonClient: true,
        factureClient: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    const bonsWithStatus = bons.map(bon => ({
      ...bon,
      hasBonLivraison: !!bon.bonLivraisonClient,
      bonLivraisonNumero: bon.bonLivraisonClient?.numero || null,
      hasFacture: !!bon.factureClient,
      factureNumero: bon.factureClient?.numero || null
    }))
    
    res.json(bonsWithStatus)
  } catch (e) {
    console.error('Error fetching bons commande client', e)
    res.status(500).json({ error: 'Erreur récupération bons commande' })
  }
})

// Get single bon commande client with lines
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bon = await prisma.bonCommandeClient.findUnique({
      where: { id: Number(req.params.id) },
      include: { client: true, lignes: { include: { product: true } } }
    })
    if (!bon) return res.status(404).json({ error: 'Bon commande non trouvé' })
    res.json(bon)
  } catch (e) {
    console.error('Error fetching bon commande client', e)
    res.status(500).json({ error: 'Erreur récupération bon commande' })
  }
})

// Create bon commande client
router.post('/', authenticate, async (req, res) => {
  try {
    const { clientId, date, dateEcheance, statut, notes, lignes } = req.body

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
    const count = await prisma.bonCommandeClient.count()
    const numero = `BC${String(count + 1).padStart(6, '0')}`

    const bon = await prisma.bonCommandeClient.create({
      data: {
        numero,
        clientId,
        date: new Date(date),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
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
    console.error('Error creating bon commande client', e)
    res.status(500).json({ error: 'Erreur création bon commande' })
  }
})

// Update bon commande client
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { clientId, date, dateEcheance, statut, notes, lignes } = req.body

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

    // Delete existing lines
    await prisma.ligneBonCommandeClient.deleteMany({ where: { bonCommandeClientId: Number(req.params.id) } })

    const bon = await prisma.bonCommandeClient.update({
      where: { id: Number(req.params.id) },
      data: {
        clientId,
        date: new Date(date),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
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
    console.error('Error updating bon commande client', e)
    res.status(500).json({ error: 'Erreur mise à jour bon commande' })
  }
})

// Delete bon commande client
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.bonCommandeClient.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Bon commande supprimé' })
  } catch (e) {
    console.error('Error deleting bon commande client', e)
    res.status(500).json({ error: 'Erreur suppression bon commande' })
  }
})

// Convert to Bon de Livraison
router.post('/:id/convert-to-livraison', authenticate, async (req, res) => {
  try {
    const bonId = Number(req.params.id)
    const bon = await prisma.bonCommandeClient.findUnique({
      where: { id: bonId },
      include: { lignes: true, client: true }
    })
    if (!bon) return res.status(404).json({ error: 'Bon commande non trouvé' })
    if (bon.bonLivraisonClientId) return res.status(400).json({ error: 'Bon commande déjà converti en bon de livraison' })

    const blCount = await prisma.bonLivraisonClient.count()
    const blNumero = `BL${String(blCount + 1).padStart(6, '0')}`

    const bonLivraison = await prisma.bonLivraisonClient.create({
      data: {
        numero: blNumero,
        clientId: bon.clientId,
        bonCommandeClientId: bon.id,
        date: new Date(),
        statut: 'BROUILLON',
        montantHT: bon.montantHT,
        montantTVA: bon.montantTVA,
        montantTTC: bon.montantTTC,
        notes: `Créé depuis Bon Commande ${bon.numero}`,
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
        }
      },
      include: { client: true, lignes: true }
    })

    // Link back to bon commande
    await prisma.bonCommandeClient.update({
      where: { id: bonId },
      data: { bonLivraisonClientId: bonLivraison.id }
    })

    res.json(bonLivraison)
  } catch (e) {
    console.error('Error converting to livraison', e)
    res.status(500).json({ error: 'Erreur conversion' })
  }
})

// Convert to Facture
router.post('/:id/convert-to-facture', authenticate, async (req, res) => {
  try {
    const bonId = Number(req.params.id)
    const bon = await prisma.bonCommandeClient.findUnique({
      where: { id: bonId },
      include: { lignes: { include: { product: true } }, client: true }
    })
    if (!bon) return res.status(404).json({ error: 'Bon commande non trouvé' })
    if (bon.factureClientId) return res.status(400).json({ error: 'Bon commande déjà converti en facture' })

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
      return res.status(400).json({ 
        error: 'Quantité facturable insuffisante',
        details: insufficientProducts 
      });
    }

    const fcCount = await prisma.factureClient.count()
    const fcNumero = `FC${String(fcCount + 1).padStart(6, '0')}`

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
        notes: `Créée depuis Bon Commande ${bon.numero}`,
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
        }
      },
      include: { client: true, lignes: true }
    })

    // Link back to bon commande
    await prisma.bonCommandeClient.update({
      where: { id: bonId },
      data: { factureClientId: facture.id }
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

    res.json(facture)
  } catch (e) {
    console.error('Error converting to facture', e)
    res.status(500).json({ error: 'Erreur conversion' })
  }
})

export default router
