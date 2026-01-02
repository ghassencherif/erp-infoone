import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

// Get company settings (ensure singleton)
router.get('/company', authenticate, async (req, res) => {
  try {
    let settings = await prisma.companySetting.findUnique({ where: { id: 1 } })
    if (!settings) {
      settings = await prisma.companySetting.create({ data: { id: 1, name: 'Ma Société' } })
    }
    res.json(settings)
  } catch (e) {
    console.error('Error fetching company settings', e)
    res.status(500).json({ error: 'Erreur récupération paramètres société' })
  }
})

// Update company settings (admin)
router.put('/company', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
        const { name, logoUrl, address, matricule, phone, email, website, rib, footerNote, 
          invoicePrefix, invoiceStartNumber, devisPrefix, devisStartNumber,
          commandePrefix, commandeStartNumber, avoirPrefix, avoirStartNumber,
          deliveryFeeDefault, deliveryTvaRate } = req.body
    const settings = await prisma.companySetting.upsert({
      where: { id: 1 },
      update: { name, logoUrl, address, matricule, phone, email, website, rib, footerNote,
        invoicePrefix, invoiceStartNumber, devisPrefix, devisStartNumber,
        commandePrefix, commandeStartNumber, avoirPrefix, avoirStartNumber,
        deliveryFeeDefault, deliveryTvaRate },
      create: { id: 1, name: name || 'Ma Société', logoUrl, address, matricule, phone, email, website, rib, footerNote,
        invoicePrefix, invoiceStartNumber, devisPrefix, devisStartNumber,
        commandePrefix, commandeStartNumber, avoirPrefix, avoirStartNumber,
        deliveryFeeDefault, deliveryTvaRate },
    })
    res.json(settings)
  } catch (e) {
    console.error('Error updating company settings', e)
    res.status(500).json({ error: 'Erreur mise à jour paramètres société' })
  }
})

export default router
