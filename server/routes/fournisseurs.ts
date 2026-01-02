import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

// Liste des fournisseurs
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      orderBy: { nom: 'asc' }
    })
    res.json(fournisseurs)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Créer un fournisseur
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const fournisseur = await prisma.fournisseur.create({
      data: req.body
    })
    res.json(fournisseur)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Modifier un fournisseur
router.put('/:id', authenticate, async (req: any, res: any) => {
  try {
    const fournisseur = await prisma.fournisseur.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    })
    res.json(fournisseur)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Supprimer un fournisseur
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    await prisma.fournisseur.delete({
      where: { id: parseInt(req.params.id) }
    })
    res.json({ message: 'Fournisseur supprimé' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Historique d'achats pour un produit (comparaison des prix par fournisseur)
router.get('/historique/:productId', authenticate, async (req: any, res: any) => {
  try {
    const productId = parseInt(req.params.productId)
    
    // Get purchase history from invoice lines
    const lignesFactures = await prisma.ligneFactureFournisseur.findMany({
      where: { productId },
      include: {
        facture: {
          include: {
            fournisseur: true
          }
        },
        product: true
      },
      orderBy: { facture: { date: 'desc' } }
    })
    
    // Get purchase history from HistoriqueAchatFournisseur (import records)
    const historiqueAchat = await prisma.historiqueAchatFournisseur.findMany({
      where: { productId },
      include: {
        fournisseur: true,
        product: true
      },
      orderBy: { date: 'desc' }
    })
    
    // Transform invoice lines to historique format
    const historiqueFromInvoices = lignesFactures.map(ligne => ({
      id: `invoice-${ligne.id}`,
      date: ligne.facture.date,
      quantite: ligne.quantite,
      fournisseurReference: ligne.fournisseurReference,
      prixUnitaire: ligne.prixUnitaire,
      montantTotal: ligne.montantHT + ligne.montantTVA,
      fournisseur: ligne.facture.fournisseur,
      product: ligne.product,
      documentType: 'FACTURE'
    }))
    
    // Transform HistoriqueAchatFournisseur records
    const historiqueFromPurchases = historiqueAchat.map(h => ({
      id: `history-${h.id}`,
      date: h.date,
      quantite: h.quantite,
      fournisseurReference: h.fournisseurReference,
      prixUnitaire: h.prixUnitaireHT,
      montantTotal: h.montantTotalHT,
      fournisseur: h.fournisseur,
      product: h.product,
      documentType: h.documentType
    }))
    
    // Combine and sort by date
    const historique = [...historiqueFromInvoices, ...historiqueFromPurchases]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    res.json(historique)
  } catch (error: any) {
    console.error('Error fetching historique:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
