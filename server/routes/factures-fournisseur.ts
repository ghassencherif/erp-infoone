import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function calculerTotaux(lignes: any[]) {
  const montantHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0)
  const montantTVA = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire * l.tauxTVA / 100), 0)
  const timbreFiscal = 1.0
  const montantTTC = montantHT + montantTVA + timbreFiscal
  return { montantHT, montantTVA, timbreFiscal, montantTTC }
}

// Get all factures
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching factures fournisseur...')
    const factures = await prisma.factureFournisseur.findMany({
      include: {
        fournisseur: true,
        bonCommande: true,
        lignes: {
          include: {
            product: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })
    console.log('Factures found:', factures.length)
    res.json(factures)
  } catch (error: any) {
    console.error('Error fetching factures:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get facture by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const facture = await prisma.factureFournisseur.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        fournisseur: true,
        bonCommande: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })
    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvée' })
    }
    res.json(facture)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create facture
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('POST /api/factures-fournisseur - Request body:', JSON.stringify(req.body, null, 2))
    const { numero, fournisseurId, bonCommandeId, date, dateEcheance, statut, lignes } = req.body
    
    if (!numero) {
      return res.status(400).json({ error: 'Le numéro de facture est requis' })
    }

    console.log('Calculating totals for', lignes?.length, 'lines')
    const totaux = calculerTotaux(lignes)
    console.log('Totals calculated:', totaux)

    console.log('Creating facture with data:', {
      numero,
      fournisseurId,
      bonCommandeId: bonCommandeId || null,
      date: new Date(date),
      dateEcheance: new Date(dateEcheance),
      montantHT: totaux.montantHT,
      montantTVA: totaux.montantTVA,
      montantTTC: totaux.montantTTC,
      statut: statut || 'BROUILLON',
      lignesCount: lignes?.length
    })

    const facture = await prisma.factureFournisseur.create({
      data: {
        numero,
        fournisseurId,
        bonCommandeId: bonCommandeId || null,
        date: new Date(date),
        dateEcheance: new Date(dateEcheance),
        montantHT: totaux.montantHT,
        montantTVA: totaux.montantTVA,
        timbreFiscal: totaux.timbreFiscal,
        montantTTC: totaux.montantTTC,
        statut: statut || 'BROUILLON',
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId,
            designation: ligne.designation,
            fournisseurReference: ligne.fournisseurReference || null,
            quantite: ligne.quantite,
            quantiteRestante: ligne.quantite, // Initialize with full quantity for FIFO tracking
            prixUnitaire: ligne.prixUnitaire,
            tauxTVA: ligne.tauxTVA || 19,
            montantHT: ligne.quantite * ligne.prixUnitaire,
            montantTVA: ligne.quantite * ligne.prixUnitaire * (ligne.tauxTVA || 19) / 100
          }))
        }
      },
      include: {
        fournisseur: true,
        bonCommande: true,
        lignes: {
          include: {
            product: true
          }
        }
      }
    })

    // Note: Stock is NOT updated on creation. It will be added only when status changes to ACCEPTE or PAYE
    console.log('Facture created successfully:', facture.id)
    console.log('⚠️  Stock will be updated only when status changes to ACCEPTE or PAYE')
    res.status(201).json(facture)
  } catch (error: any) {
    console.error('Error creating facture:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: error.message })
  }
})

// Update facture
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { fournisseurId, bonCommandeId, date, dateEcheance, statut, lignes } = req.body
    const id = parseInt(req.params.id)
    const totaux = calculerTotaux(lignes)

    await prisma.ligneFactureFournisseur.deleteMany({
      where: { factureId: id }
    })

    const facture = await prisma.factureFournisseur.update({
      where: { id },
      data: {
        fournisseurId,
        bonCommandeId: bonCommandeId || null,
        date: new Date(date),
        dateEcheance: new Date(dateEcheance),
        montantHT: totaux.montantHT,
        montantTVA: totaux.montantTVA,
        timbreFiscal: totaux.timbreFiscal,
        montantTTC: totaux.montantTTC,
        statut,
        lignes: {
          create: lignes.map((ligne: any) => ({
            productId: ligne.productId,
            designation: ligne.designation,
            quantite: ligne.quantite,
            quantiteRestante: ligne.quantite, // Initialize with full quantity for FIFO tracking
            prixUnitaire: ligne.prixUnitaire,
            tauxTVA: ligne.tauxTVA || 19,
            montantHT: ligne.quantite * ligne.prixUnitaire,
            montantTVA: ligne.quantite * ligne.prixUnitaire * (ligne.tauxTVA || 19) / 100
          }))
        }
      },
      include: {
        fournisseur: true,
        bonCommande: true,
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

// Update facture status
router.patch('/:id/statut', authenticate, async (req, res) => {
  try {
    const { statut } = req.body
    const id = parseInt(req.params.id)
    
    // Get current facture to check previous status
    const currentFacture = await prisma.factureFournisseur.findUnique({
      where: { id },
      include: {
        lignes: {
          include: {
            product: true
          }
        }
      }
    })
    
    if (!currentFacture) {
      return res.status(404).json({ error: 'Facture non trouvée' })
    }
    
    // Update status
    const facture = await prisma.factureFournisseur.update({
      where: { id },
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
    
    // Add to stock only when status changes to ACCEPTE or PAYE (and was not previously in these statuses)
    const previousStatus = currentFacture.statut
    if ((statut === 'ACCEPTE' || statut === 'PAYE') && 
        !['ACCEPTE', 'PAYE'].includes(previousStatus)) {
      
      console.log(`📦 Adding stock for invoice ${id} (status: ${previousStatus} → ${statut})`)
      
      // Add stock for each ligne
      for (const ligne of facture.lignes) {
        if (ligne.productId) {
          // Get current product for weighted average cost calculation
          const product = await prisma.product.findUnique({
            where: { id: ligne.productId },
            include: { stockAvailables: true }
          })

          if (product) {
            const currentStock = product.stockAvailables.reduce((sum, s) => sum + s.quantity, 0)
            const currentCost = product.cost || 0
            const newQuantity = ligne.quantite
            const newCost = ligne.prixUnitaire

            // Calculate weighted average cost (Coût Moyen Pondéré - CMP)
            // Formula: New Average Cost = (Old Stock × Old Cost + New Stock × New Cost) / (Old Stock + New Stock)
            const newAverageCost = currentStock > 0
              ? ((currentStock * currentCost) + (newQuantity * newCost)) / (currentStock + newQuantity)
              : newCost

            console.log(`  Product ${ligne.productId}: currentStock=${currentStock}, cost ${currentCost.toFixed(3)} → ${newAverageCost.toFixed(3)}`)

            // Update product cost
            await prisma.product.update({
              where: { id: ligne.productId },
              data: { 
                cost: newAverageCost,
                invoiceableQuantity: product.invoiceableQuantity + newQuantity
              }
            })

            // Find or create stock record
            let stock = await prisma.stockAvailable.findFirst({
              where: { productId: ligne.productId }
            })
            
            if (stock) {
              // Update existing stock
              await prisma.stockAvailable.update({
                where: { id: stock.id },
                data: {
                  quantity: stock.quantity + newQuantity
                }
              })
            } else {
              // Create new stock record
              await prisma.stockAvailable.create({
                data: {
                  productId: ligne.productId,
                  quantity: newQuantity
                }
              })
            }
          }
        }
      }
      console.log(`✅ Stock updated successfully for invoice ${id}`)
    }
    
    // Reduce stock when status changes to ANNULE (only if previously ACCEPTE or PAYE)
    if (statut === 'ANNULE' && ['ACCEPTE', 'PAYE'].includes(previousStatus)) {
      console.log(`🔴 Reducing stock for cancelled invoice ${id} (was ${previousStatus})`)
      
      // Reduce stock for each ligne
      for (const ligne of facture.lignes) {
        if (ligne.productId) {
          const product = await prisma.product.findUnique({
            where: { id: ligne.productId },
            include: { stockAvailables: true }
          })

          if (product) {
            console.log(`  Reducing stock for product ${ligne.productId} by ${ligne.quantite}`)
            
            // Find stock record
            let stock = await prisma.stockAvailable.findFirst({
              where: { productId: ligne.productId }
            })
            
            if (stock && stock.quantity >= ligne.quantite) {
              // Update existing stock (reduce it)
              await prisma.stockAvailable.update({
                where: { id: stock.id },
                data: {
                  quantity: stock.quantity - ligne.quantite
                }
              })
            } else {
              console.warn(`⚠️  Not enough stock to reduce for product ${ligne.productId}. Available: ${stock?.quantity || 0}, Requested: ${ligne.quantite}`)
            }
            
            // Also reduce invoiceableQuantity
            await prisma.product.update({
              where: { id: ligne.productId },
              data: {
                invoiceableQuantity: Math.max(0, product.invoiceableQuantity - ligne.quantite)
              }
            })
          }
        }
      }
      console.log(`✅ Stock reduced successfully for cancelled invoice ${id}`)
    }

    
    res.json(facture)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Delete facture
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    await prisma.ligneFactureFournisseur.deleteMany({
      where: { factureId: id }
    })
    
    await prisma.factureFournisseur.delete({
      where: { id }
    })
    
    res.json({ message: 'Facture supprimée' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
