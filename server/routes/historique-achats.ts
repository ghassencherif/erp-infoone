import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

// Get all product-supplier links (for enriching product search)
router.get('/all-links', authenticate, async (req, res) => {
  try {
    // Get unique product-supplier links from invoice lines
    const invoiceLinks = await prisma.ligneFactureFournisseur.findMany({
      where: { productId: { not: null } },
      select: {
        productId: true,
        facture: {
          select: {
            fournisseur: {
              select: { nom: true }
            }
          }
        }
      }
    })

    // Get unique product-supplier links from historique
    const histLinks = await prisma.historiqueAchatFournisseur.findMany({
      select: {
        productId: true,
        fournisseur: {
          select: { nom: true }
        }
      }
    })

    // Merge and deduplicate
    const linkMap = new Map<number, Set<string>>()
    
    invoiceLinks.forEach(link => {
      if (link.productId) {
        if (!linkMap.has(link.productId)) linkMap.set(link.productId, new Set())
        linkMap.get(link.productId)!.add(link.facture.fournisseur.nom)
      }
    })

    histLinks.forEach(link => {
      if (!linkMap.has(link.productId)) linkMap.set(link.productId, new Set())
      linkMap.get(link.productId)!.add(link.fournisseur.nom)
    })

    // Convert to array format
    const result: { productId: number, fournisseurNom: string }[] = []
    linkMap.forEach((fournisseurs, productId) => {
      fournisseurs.forEach(fournisseurNom => {
        result.push({ productId, fournisseurNom })
      })
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error fetching product-supplier links:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
