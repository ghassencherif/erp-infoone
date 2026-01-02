import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Get all client credit notes
router.get('/', authenticate, async (req, res) => {
  try {
    const avoirs = await prisma.avoirClient.findMany({
      include: {
        client: true,
        factureClient: true,
        lignes: {
          include: { product: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(avoirs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single credit note
router.get('/:id', authenticate, async (req, res) => {
  try {
    const avoir = await prisma.avoirClient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        factureClient: true,
        lignes: {
          include: { product: true }
        }
      }
    });
    res.json(avoir);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create credit note
router.post('/', authenticate, async (req, res) => {
  try {
    const { clientId, factureClientId, date, statut, lignes, motif, notes } = req.body;
    
    // Calculate totals
    let montantHT = 0;
    let montantTVA = 0;
    const timbreFiscal = 1.0;
    
    const lignesData = lignes.map((ligne: any) => {
      const mHT = ligne.quantite * ligne.prixUnitaireHT;
      const mTVA = mHT * (ligne.tauxTVA / 100);
      const mTTC = mHT + mTVA;
      montantHT += mHT;
      montantTVA += mTVA;
      
      return {
        productId: ligne.productId,
        designation: ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        montantHT: mHT,
        montantTVA: mTVA,
        montantTTC: mTTC
      };
    });
    
    const montantTTC = montantHT + montantTVA + timbreFiscal;
    
    // Generate credit note number
    const lastAvoir = await prisma.avoirClient.findFirst({
      orderBy: { numero: 'desc' }
    });
    const lastNum = lastAvoir ? parseInt(lastAvoir.numero.replace('AC', '')) : 0;
    const numero = `AC${String(lastNum + 1).padStart(6, '0')}`;
    
    const avoir = await prisma.avoirClient.create({
      data: {
        numero,
        clientId,
        factureClientId: factureClientId || null,
        date: new Date(date),
        statut,
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        motif,
        notes,
        lignes: {
          create: lignesData
        }
      },
      include: {
        client: true,
        factureClient: true,
        lignes: { include: { product: true } }
      }
    });
    
    res.status(201).json(avoir);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update credit note
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, factureClientId, date, statut, lignes, motif, notes } = req.body;
    
    let montantHT = 0;
    let montantTVA = 0;
    const timbreFiscal = 1.0;
    
    const lignesData = lignes.map((ligne: any) => {
      const mHT = ligne.quantite * ligne.prixUnitaireHT;
      const mTVA = mHT * (ligne.tauxTVA / 100);
      const mTTC = mHT + mTVA;
      montantHT += mHT;
      montantTVA += mTVA;
      
      return {
        productId: ligne.productId,
        designation: ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        montantHT: mHT,
        montantTVA: mTVA,
        montantTTC: mTTC
      };
    });
    
    const montantTTC = montantHT + montantTVA + timbreFiscal;
    
    await prisma.ligneAvoirClient.deleteMany({
      where: { avoirClientId: parseInt(id) }
    });
    
    const avoir = await prisma.avoirClient.update({
      where: { id: parseInt(id) },
      data: {
        clientId,
        factureClientId: factureClientId || null,
        date: new Date(date),
        statut,
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        motif,
        notes,
        lignes: {
          create: lignesData
        }
      },
      include: {
        client: true,
        factureClient: true,
        lignes: { include: { product: true } }
      }
    });
    
    res.json(avoir);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete credit note
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.avoirClient.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Avoir supprimé' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
