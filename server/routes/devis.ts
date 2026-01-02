import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

function calculerTotaux(lignes: any[]) {
  const montantHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0)
  const montantTVA = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire * l.tauxTVA / 100), 0)
  const montantTTC = montantHT + montantTVA
  return { montantHT, montantTVA, montantTTC }
}

// Get all devis
router.get('/', async (req, res) => {
  try {
    const devis = await prisma.devis.findMany({
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })
    res.json(devis)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get devis by ID
router.get('/:id', async (req, res) => {
  try {
    const devisItem = await prisma.devis.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })
    if (!devisItem) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }
    res.json(devisItem)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create devis
router.post('/', async (req, res) => {
  try {
    const { fournisseurId, date, dateValidite, statut, lignes } = req.body
    const totaux = calculerTotaux(lignes)

    const devisItem = await prisma.devis.create({
      data: {
        numero: `DEV${Date.now()}`,
        fournisseurId,
        date: new Date(date),
        dateValidite: new Date(dateValidite),
        montantHT: totaux.montantHT,
        montantTVA: totaux.montantTVA,
        montantTTC: totaux.montantTTC,
        statut: statut || 'EN_ATTENTE',
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
        lignes: {
          include: {
            product: true
          }
        }
      }
    })

    res.status(201).json(devisItem)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update devis
router.put('/:id', async (req, res) => {
  try {
    const { fournisseurId, date, dateValidite, statut, lignes } = req.body
    const id = parseInt(req.params.id)
    const totaux = calculerTotaux(lignes)

    await prisma.ligneDevis.deleteMany({
      where: { devisId: id }
    })

    const devisItem = await prisma.devis.update({
      where: { id },
      data: {
        fournisseurId,
        date: new Date(date),
        dateValidite: new Date(dateValidite),
        montantHT: totaux.montantHT,
        montantTVA: totaux.montantTVA,
        montantTTC: totaux.montantTTC,
        statut,
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
        lignes: {
          include: {
            product: true
          }
        }
      }
    })

    res.json(devisItem)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update devis status
router.patch('/:id/statut', async (req, res) => {
  try {
    const { statut } = req.body
    const devisItem = await prisma.devis.update({
      where: { id: parseInt(req.params.id) },
      data: { statut },
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })
    res.json(devisItem)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Delete devis
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    await prisma.ligneDevis.deleteMany({
      where: { devisId: id }
    })
    
    await prisma.devis.delete({
      where: { id }
    })
    
    res.json({ message: 'Devis supprimé' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
