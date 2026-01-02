import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Get all client quotes
router.get('/', authenticate, async (req, res) => {
  try {
    const devis = await prisma.devisClient.findMany({
      include: {
        client: true,
        lignes: {
          include: { product: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(devis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single quote
router.get('/:id', authenticate, async (req, res) => {
  try {
    const devis = await prisma.devisClient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        lignes: {
          include: { product: true }
        }
      }
    });
    res.json(devis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create quote
router.post('/', authenticate, async (req, res) => {
  try {
    const { clientId, date, dateValidite, statut, lignes, notes } = req.body;
    
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
    
    // Generate quote number
    const lastDevis = await prisma.devisClient.findFirst({
      orderBy: { numero: 'desc' }
    });
    const lastNum = lastDevis ? parseInt(lastDevis.numero.replace('DVC', '')) : 0;
    const numero = `DVC${String(lastNum + 1).padStart(6, '0')}`;
    
    const devis = await prisma.devisClient.create({
      data: {
        numero,
        clientId,
        date: new Date(date),
        dateValidite: dateValidite ? new Date(dateValidite) : null,
        statut,
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        notes,
        lignes: {
          create: lignesData
        }
      },
      include: {
        client: true,
        lignes: { include: { product: true } }
      }
    });
    
    res.status(201).json(devis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update quote
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, date, dateValidite, statut, lignes, notes } = req.body;
    
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
    
    await prisma.ligneDevisClient.deleteMany({
      where: { devisClientId: parseInt(id) }
    });
    
    const devis = await prisma.devisClient.update({
      where: { id: parseInt(id) },
      data: {
        clientId,
        date: new Date(date),
        dateValidite: dateValidite ? new Date(dateValidite) : null,
        statut,
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        notes,
        lignes: {
          create: lignesData
        }
      },
      include: {
        client: true,
        lignes: { include: { product: true } }
      }
    });
    
    res.json(devis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete quote
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.devisClient.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Devis supprimé' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Convert devis to commande client
router.post('/:id/convert-to-commande', authenticate, async (req, res) => {
  try {
    const devis = await prisma.devisClient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { lignes: true, client: true }
    });
    if (!devis) return res.status(404).json({ error: 'Devis non trouvé' });

    const ccCount = await prisma.commandeClient.count();
    const ccNumero = `CC${String(ccCount + 1).padStart(6, '0')}`;

    const commande = await prisma.commandeClient.create({
      data: {
        numero: ccNumero,
        clientId: devis.clientId,
        devisClientId: devis.id,
        date: new Date(),
        statut: 'BROUILLON',
        montantHT: devis.montantHT,
        montantTVA: devis.montantTVA,
        timbreFiscal: devis.timbreFiscal,
        montantTTC: devis.montantTTC,
        notes: `Créée depuis Devis ${devis.numero}`,
        lignes: {
          create: devis.lignes.map(l => ({
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
    });

    res.json(commande);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
