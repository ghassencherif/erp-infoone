import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

function calculerTotaux(lignes: any[]) {
  const montantHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0)
  const montantTVA = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire * l.tauxTVA / 100), 0)
  const montantTTC = montantHT + montantTVA
  return { montantHT, montantTVA, montantTTC }
}

// Get all factures d'avoir
router.get('/', async (req, res) => {
  try {
    const factures = await prisma.factureAvoir.findMany({
      include: {
        fournisseur: true,
        factureOriginale: true,
        lignes: {
          include: {
            product: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })
    res.json(factures)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get facture avoir by ID
router.get('/:id', async (req, res) => {
  try {
    const facture = await prisma.factureAvoir.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        fournisseur: true,
        factureOriginale: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })
    if (!facture) {
      return res.status(404).json({ error: 'Facture d\'avoir non trouvée' })
    }
    res.json(facture)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create facture avoir
router.post('/', async (req, res) => {
  try {
    const { fournisseurId, factureOriginaleId, date, motif, lignes } = req.body
    const totaux = calculerTotaux(lignes)

    const facture = await prisma.factureAvoir.create({
      data: {
        numero: `AV${Date.now()}`,
        fournisseurId,
        factureOriginaleId: factureOriginaleId || null,
        date: new Date(date),
        motif,
        montantHT: totaux.montantHT,
        montantTVA: totaux.montantTVA,
        montantTTC: totaux.montantTTC,
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId,
            designation: ligne.designation,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            tauxTVA: ligne.tauxTVA || 19,
            montantHT: ligne.quantite * ligne.prixUnitaire,
            montantTVA: ligne.quantite * ligne.prixUnitaire * (ligne.tauxTVA || 19) / 100
          }))
        }
      },
      include: {
        fournisseur: true,
        factureOriginale: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })

    res.status(201).json(facture)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update facture avoir
router.put('/:id', async (req, res) => {
  try {
    const { fournisseurId, factureOriginaleId, date, motif, lignes } = req.body
    const id = parseInt(req.params.id)
    const totaux = calculerTotaux(lignes)

    await prisma.ligneFactureAvoir.deleteMany({
      where: { factureAvoirId: id }
    })

    const facture = await prisma.factureAvoir.update({
      where: { id },
      data: {
        fournisseurId,
        factureOriginaleId: factureOriginaleId || null,
        date: new Date(date),
        motif,
        montantHT: totaux.montantHT,
        montantTVA: totaux.montantTVA,
        montantTTC: totaux.montantTTC,
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId,
            designation: ligne.designation,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            tauxTVA: ligne.tauxTVA || 19,
            montantHT: ligne.quantite * ligne.prixUnitaire,
            montantTVA: ligne.quantite * ligne.prixUnitaire * (ligne.tauxTVA || 19) / 100
          }))
        }
      },
      include: {
        fournisseur: true,
        factureOriginale: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })

    res.json(facture)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Delete facture avoir
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    await prisma.ligneFactureAvoir.deleteMany({
      where: { factureAvoirId: id }
    })
    
    await prisma.factureAvoir.delete({
      where: { id }
    })
    
    res.json({ message: 'Facture d\'avoir supprimée' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
