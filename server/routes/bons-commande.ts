import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

// Liste des bons de commande
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const bonsCommande = await prisma.bonDeCommande.findMany({
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
    res.json(bonsCommande)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get single bon de commande
router.get('/:id', authenticate, async (req: any, res: any) => {
  try {
    const bonCommande = await prisma.bonDeCommande.findUnique({
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
    res.json(bonCommande)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Créer un bon de commande
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const { fournisseurId, date, dateEcheance, notes, lignes } = req.body
    
    const bonCommande = await prisma.bonDeCommande.create({
      data: {
        fournisseurId: parseInt(fournisseurId),
        numero: `BC${Date.now()}`,
        date: date ? new Date(date) : new Date(),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
        statut: 'BROUILLON',
        notes,
        montantHT: 0,
        montantTVA: 0,
        montantTTC: 0,
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId ? parseInt(ligne.productId) : null,
            designation: ligne.designation,
            quantite: parseInt(ligne.quantite),
            prixUnitaireHT: parseFloat(ligne.prixUnitaireHT),
            tauxTVA: parseFloat(ligne.tauxTVA || 19),
            montantHT: parseFloat(ligne.montantHT),
            montantTVA: parseFloat(ligne.montantTVA),
            montantTTC: parseFloat(ligne.montantTTC)
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

    // Calculer les totaux
    const totaux = await calculerTotaux(bonCommande.id)
    
    // Mettre à jour le bon de commande avec les totaux
    const bonCommandeUpdated = await prisma.bonDeCommande.update({
      where: { id: bonCommande.id },
      data: totaux,
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })

    res.json(bonCommandeUpdated)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Modifier un bon de commande
router.put('/:id', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { fournisseurId, date, dateEcheance, statut, notes, lignes } = req.body

    // Supprimer les anciennes lignes
    await prisma.ligneBonDeCommande.deleteMany({
      where: { bonDeCommandeId: parseInt(id) }
    })

    // Mettre à jour le bon de commande
    const bonCommande = await prisma.bonDeCommande.update({
      where: { id: parseInt(id) },
      data: {
        fournisseurId: parseInt(fournisseurId),
        date: new Date(date),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
        statut,
        notes,
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId ? parseInt(ligne.productId) : null,
            designation: ligne.designation,
            quantite: parseInt(ligne.quantite),
            prixUnitaireHT: parseFloat(ligne.prixUnitaireHT),
            tauxTVA: parseFloat(ligne.tauxTVA || 19),
            montantHT: parseFloat(ligne.montantHT),
            montantTVA: parseFloat(ligne.montantTVA),
            montantTTC: parseFloat(ligne.montantTTC)
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

    // Calculer les totaux
    const totaux = await calculerTotaux(parseInt(id))
    
    // Mettre à jour avec les totaux
    const bonCommandeUpdated = await prisma.bonDeCommande.update({
      where: { id: parseInt(id) },
      data: totaux,
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })

    res.json(bonCommandeUpdated)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Supprimer un bon de commande
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    await prisma.ligneBonDeCommande.deleteMany({
      where: { bonDeCommandeId: parseInt(req.params.id) }
    })
    
    await prisma.bonDeCommande.delete({
      where: { id: parseInt(req.params.id) }
    })
    
    res.json({ message: 'Bon de commande supprimé' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Changer le statut
router.patch('/:id/statut', authenticate, async (req: any, res: any) => {
  try {
    const { statut } = req.body
    const bonCommande = await prisma.bonDeCommande.update({
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
    res.json(bonCommande)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Fonction pour calculer les totaux
async function calculerTotaux(bonDeCommandeId: number) {
  const lignes = await prisma.ligneBonDeCommande.findMany({
    where: { bonDeCommandeId }
  })

  const montantHT = lignes.reduce((sum: number, l: any) => sum + l.montantHT, 0)
  const montantTVA = lignes.reduce((sum: number, l: any) => sum + l.montantTVA, 0)
  const montantTTC = lignes.reduce((sum: number, l: any) => sum + l.montantTTC, 0)

  return {
    montantHT,
    montantTVA,
    montantTTC
  }
}

export default router
