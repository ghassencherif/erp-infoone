import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// Get all bons de réception
router.get('/', async (req, res) => {
  try {
    const bonsReception = await prisma.bonDeReception.findMany({
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
    res.json(bonsReception)
  } catch (error: any) {
    console.error('Error fetching bons de reception:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get bon de réception by ID
router.get('/:id', async (req, res) => {
  try {
    const bon = await prisma.bonDeReception.findUnique({
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
    if (!bon) {
      return res.status(404).json({ error: 'Bon de réception non trouvé' })
    }
    res.json(bon)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create bon de réception
router.post('/', async (req, res) => {
  try {
    const { fournisseurId, bonCommandeId, date, observations, lignes } = req.body

    const bon = await prisma.bonDeReception.create({
      data: {
        numero: `BR${Date.now()}`,
        fournisseurId,
        bonDeCommandeNumero: bonCommandeId || null,
        date: new Date(date),
        observations,
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId,
            designation: ligne.designation,
            quantiteCommandee: ligne.quantiteCommandee,
            quantiteRecue: ligne.quantiteRecue,
            prixUnitaire: ligne.prixUnitaire
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

    res.status(201).json(bon)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update bon de réception
router.put('/:id', async (req, res) => {
  try {
    const { fournisseurId, bonCommandeId, date, observations, lignes } = req.body
    const id = parseInt(req.params.id)

    // Delete existing lignes
    await prisma.ligneBonDeReception.deleteMany({
      where: { bonDeReceptionId: id }
    })

    // Update bon with new lignes
    const bon = await prisma.bonDeReception.update({
      where: { id },
      data: {
        fournisseurId,
        bonDeCommandeNumero: bonCommandeId || null,
        date: new Date(date),
        observations,
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId,
            designation: ligne.designation,
            quantiteCommandee: ligne.quantiteCommandee,
            quantiteRecue: ligne.quantiteRecue,
            prixUnitaire: ligne.prixUnitaire
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

    res.json(bon)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Delete bon de réception
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    await prisma.ligneBonDeReception.deleteMany({
      where: { bonDeReceptionId: id }
    })
    
    await prisma.bonDeReception.delete({
      where: { id }
    })
    
    res.json({ message: 'Bon de réception supprimé' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
