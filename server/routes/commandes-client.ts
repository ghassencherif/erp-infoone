import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Get all client orders
router.get('/', authenticate, async (req, res) => {
  try {
    const commandes = await prisma.commandeClient.findMany({
      include: {
        client: true,
        devisClient: true,
        factureClient: true,
        bonCommandeClient: true,
        bonLivraisonClient: true,
        bonsLivraison: {
          include: {
            factureClient: true
          }
        },
        lignes: {
          include: { product: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    // Add hasFacture, hasBonCommande, hasBonLivraison and related numbers to response
    const commandesWithStatus = commandes.map((commande) => {
      // Check if facture exists directly or through a BL
      const hasDirectFacture = !!commande.factureClient;
      const hasBLWithFacture = commande.bonsLivraison && commande.bonsLivraison.some((bl: any) => bl.factureClientId);
      const hasFactureViaAnyRoute = hasDirectFacture || hasBLWithFacture;
      
      // Get facture numero from direct facture or from BL's linked facture
      const factureNumero = commande.factureClient?.numero || 
                           (commande.bonsLivraison && commande.bonsLivraison.length > 0 
                            ? commande.bonsLivraison.find((bl: any) => bl.factureClientId)?.factureClient?.numero 
                            : null) || 
                           null;
      
      return {
        ...commande,
        hasFacture: hasFactureViaAnyRoute,
        factureNumero: factureNumero,
        hasBonCommande: !!commande.bonCommandeClient,
        bonCommandeNumero: commande.bonCommandeClient?.numero || null,
        hasBonLivraison: !!commande.bonLivraisonClient || (commande.bonsLivraison && commande.bonsLivraison.length > 0),
        bonLivraisonNumero: commande.bonLivraisonClient?.numero || commande.bonsLivraison?.[0]?.numero || null
      }
    });
    
    res.json(commandesWithStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const commande = await prisma.commandeClient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        devisClient: true,
        lignes: {
          include: { product: true }
        }
      }
    });
    
    if (!commande) {
      return res.status(404).json({ error: `Commande client ${req.params.id} introuvable` });
    }
    
    res.json(commande);
  } catch (error: any) {
    console.error('Error fetching commande client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', authenticate, async (req, res) => {
  try {
    const { clientId, devisClientId, date, dateEcheance, statut, lignes, notes, deliveryFree } = req.body;

    const settings = await prisma.companySetting.findUnique({ where: { id: 1 } });
    const deliveryFeeDefaultTTC = settings?.deliveryFeeDefault ?? 8;
    const deliveryTvaRate = settings?.deliveryTvaRate ?? 7;
    
    // Calculate totals
    let montantHT = 0;
    let montantTVA = 0;
    const timbreFiscal = 0;
    const deliveryFee = deliveryFree ? 0 : deliveryFeeDefaultTTC / (1 + deliveryTvaRate / 100); // HT portion
    const deliveryTVA = deliveryFree ? 0 : deliveryFeeDefaultTTC - deliveryFee; // TVA portion
    
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
        montantTTC: mTTC,
        serialNumberUsed: ligne.serialNumberUsed || null
      };
    });
    
    montantHT += deliveryFee;
    montantTVA += deliveryTVA;
    const montantTTC = montantHT + montantTVA + timbreFiscal;
    
    // Generate order number
    const lastCommande = await prisma.commandeClient.findFirst({
      orderBy: { numero: 'desc' }
    });
    const lastNum = lastCommande ? parseInt(lastCommande.numero.replace('CC', '')) : 0;
    const numero = `CC${String(lastNum + 1).padStart(6, '0')}`;
    
    // Validate stock availability before creating commande
    const stockErrors: string[] = [];
    for (const ligne of lignesData) {
      if (ligne.productId) {
        const stock = await prisma.stockAvailable.findFirst({
          where: { productId: ligne.productId },
          include: { product: true }
        });
        
        if (!stock) {
          stockErrors.push(`Produit "${ligne.designation}" n'a pas de stock configuré`);
        } else if (stock.quantity < ligne.quantite) {
          stockErrors.push(`Stock insuffisant pour "${ligne.designation}": disponible ${stock.quantity}, demandé ${ligne.quantite}`);
        }
      }
    }
    
    if (stockErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Stock insuffisant', 
        details: stockErrors 
      });
    }
    
    const commande = await prisma.commandeClient.create({
      data: {
        numero,
        clientId,
        devisClientId: devisClientId || null,
        date: new Date(date),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
        statut,
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        deliveryFee,
        deliveryTvaRate,
        notes,
        lignes: {
          create: lignesData
        }
      },
      include: {
        client: true,
        devisClient: true,
        lignes: { include: { product: true } }
      }
    });
    
    // Decrease stock for products
    for (const ligne of lignesData) {
      if (ligne.productId) {
        const stock = await prisma.stockAvailable.findFirst({
          where: { productId: ligne.productId }
        });
        if (stock) {
          await prisma.stockAvailable.update({
            where: { id: stock.id },
            data: { quantity: { decrement: ligne.quantite } }
          });
        }
      }
    }
    
    res.status(201).json(commande);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, devisClientId, date, dateEcheance, statut, lignes, notes, deliveryFree } = req.body;

    const settings = await prisma.companySetting.findUnique({ where: { id: 1 } });
    const deliveryFeeDefaultTTC = settings?.deliveryFeeDefault ?? 8;
    const deliveryTvaRate = settings?.deliveryTvaRate ?? 7;
    
    // Get old commande to check status change
    const oldCommande = await prisma.commandeClient.findUnique({
      where: { id: parseInt(id) },
      include: { lignes: true }
    });
    
    let montantHT = 0;
    let montantTVA = 0;
    const timbreFiscal = 0;
    const deliveryFee = deliveryFree ? 0 : deliveryFeeDefaultTTC / (1 + deliveryTvaRate / 100); // HT portion
    const deliveryTVA = deliveryFree ? 0 : deliveryFeeDefaultTTC - deliveryFee; // TVA portion
    
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
        montantTTC: mTTC,
        serialNumberUsed: ligne.serialNumberUsed || null
      };
    });
    
    montantHT += deliveryFee;
    montantTVA += deliveryTVA;
    const montantTTC = montantHT + montantTVA + timbreFiscal;
    
    // If status changed to ANNULE, restore stock
    if (oldCommande && oldCommande.statut !== 'ANNULE' && statut === 'ANNULE') {
      for (const ligne of oldCommande.lignes) {
        if (ligne.productId) {
          const stock = await prisma.stockAvailable.findFirst({
            where: { productId: ligne.productId }
          });
          if (stock) {
            await prisma.stockAvailable.update({
              where: { id: stock.id },
              data: { quantity: { increment: ligne.quantite } }
            });
          }
        }
      }
    }
    
    // If status changed from ANNULE to something else, decrease stock again
    if (oldCommande && oldCommande.statut === 'ANNULE' && statut !== 'ANNULE') {
      for (const ligneData of lignesData) {
        if (ligneData.productId) {
          const stock = await prisma.stockAvailable.findFirst({
            where: { productId: ligneData.productId }
          });
          if (stock) {
            await prisma.stockAvailable.update({
              where: { id: stock.id },
              data: { quantity: { decrement: ligneData.quantite } }
            });
          }
        }
      }
    }
    
    await prisma.ligneCommandeClient.deleteMany({
      where: { commandeClientId: parseInt(id) }
    });
    
    const commande = await prisma.commandeClient.update({
      where: { id: parseInt(id) },
      data: {
        clientId,
        devisClientId: devisClientId || null,
        date: new Date(date),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
        statut,
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        deliveryFee,
        deliveryTvaRate,
        notes,
        lignes: {
          create: lignesData
        }
      },
      include: {
        client: true,
        devisClient: true,
        lignes: { include: { product: true } }
      }
    });
    
    res.json(commande);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Quick status update
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { statut } = req.body;
    const commandeId = parseInt(req.params.id);
    
    // Get old commande to check status change for stock management
    const oldCommande = await prisma.commandeClient.findUnique({
      where: { id: commandeId },
      include: { lignes: true }
    });
    
    if (!oldCommande) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }
    
    // If status changed to ANNULE, restore stock
    if (oldCommande.statut !== 'ANNULE' && statut === 'ANNULE') {
      for (const ligne of oldCommande.lignes) {
        if (ligne.productId) {
          const stock = await prisma.stockAvailable.findFirst({
            where: { productId: ligne.productId }
          });
          if (stock) {
            await prisma.stockAvailable.update({
              where: { id: stock.id },
              data: { quantity: { increment: ligne.quantite } }
            });
          }
        }
      }
    }
    
    // If status changed from ANNULE to something else, decrease stock again
    if (oldCommande.statut === 'ANNULE' && statut !== 'ANNULE') {
      for (const ligne of oldCommande.lignes) {
        if (ligne.productId) {
          const stock = await prisma.stockAvailable.findFirst({
            where: { productId: ligne.productId }
          });
          if (stock) {
            await prisma.stockAvailable.update({
              where: { id: stock.id },
              data: { quantity: { decrement: ligne.quantite } }
            });
          }
        }
      }
    }
    
    const deliveryStatus = mapCommandeStatutToDeliveryStatus(statut);

    const commande = await prisma.commandeClient.update({
      where: { id: commandeId },
      data: { statut, deliveryStatus },
      include: { client: true, lignes: { include: { product: true } } }
    });
    
    res.json(commande);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function mapCommandeStatutToDeliveryStatus(statut: string) {
  switch (statut) {
    case 'LIVRE':
      return 'DELIVERED' as any;
    case 'EN_COURS_LIVRAISON':
      return 'OUT_FOR_DELIVERY' as any;
    case 'DEPOT_TRANSPORTEUR':
      return 'DEPOT_TRANSPORTEUR' as any;
    case 'RETOUR':
      return 'RETOUR' as any;
    case 'PAS_DE_REPONSE_1':
      return 'PAS_DE_REPONSE_1' as any;
    case 'PAS_DE_REPONSE_2':
      return 'PAS_DE_REPONSE_2' as any;
    case 'INJOIGNABLE_1':
      return 'INJOIGNABLE_1' as any;
    case 'INJOIGNABLE_2':
      return 'INJOIGNABLE_2' as any;
    case 'ANNULE_1':
    case 'ANNULE_2':
    case 'ANNULE':
      return 'CANCELLED' as any;
    default:
      return null;
  }
}

// Delete order
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.commandeClient.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Commande supprimée' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Convert to Bon de Livraison
router.post('/:id/convert-to-livraison', authenticate, async (req, res) => {
  try {
    const commande = await prisma.commandeClient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { lignes: true, client: true }
    });
    if (!commande) return res.status(404).json({ error: 'Commande non trouvée' });
    
    // Check if already converted to BL
    if (commande.bonLivraisonClientId) {
      return res.status(400).json({ error: 'Commande déjà convertie en bon de livraison' });
    }

    const blCount = await prisma.bonLivraisonClient.count();
    const blNumero = `BL${String(blCount + 1).padStart(6, '0')}`;

    const bonLivraison = await prisma.bonLivraisonClient.create({
      data: {
        numero: blNumero,
        clientId: commande.clientId,
        commandeClientId: commande.id,
        date: new Date(),
        statut: 'BROUILLON',
        montantHT: commande.montantHT,
        montantTVA: commande.montantTVA,
        montantTTC: commande.montantHT + commande.montantTVA,
        deliveryFee: commande.deliveryFee,
        deliveryTvaRate: commande.deliveryTvaRate,
        notes: `Créé depuis Commande ${commande.numero}`,
        lignes: {
          create: commande.lignes.map(l => ({
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

    // Link back to commande
    await prisma.commandeClient.update({
      where: { id: commande.id },
      data: { bonLivraisonClientId: bonLivraison.id }
    });

    res.json(bonLivraison);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Convert to Facture
router.post('/:id/convert-to-facture', authenticate, async (req, res) => {
  try {
    const { invoiceSubstitutions } = req.body;
    console.log('Convert to facture - ID:', req.params.id);
    console.log('Convert to facture - invoiceSubstitutions:', JSON.stringify(invoiceSubstitutions, null, 2));
    
    const commande = await prisma.commandeClient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { lignes: { include: { product: true } }, client: true }
    });
    if (!commande) return res.status(404).json({ error: 'Commande non trouvée' });
    
    // Check if already converted to Facture
    if (commande.factureClientId) {
      return res.status(400).json({ error: 'Commande déjà convertie en facture' });
    }

    // Check for products that need invoice substitution (only if substitutions not already provided)
    if (!invoiceSubstitutions || invoiceSubstitutions.length === 0) {
      const productsNeedingSubstitution: any[] = [];
      const insufficientProducts: any[] = [];
      
      for (const ligne of commande.lignes) {
        if (ligne.product) {
          if (ligne.product.invoiceableQuantity === 0) {
            productsNeedingSubstitution.push({
              id: ligne.product.id,
              name: ligne.product.name,
              reference: ligne.product.reference,
              quantity: ligne.quantite
            });
          } else if (ligne.product.invoiceableQuantity < ligne.quantite) {
            insufficientProducts.push({
              name: ligne.product.name,
              reference: ligne.product.reference,
              requested: ligne.quantite,
              available: ligne.product.invoiceableQuantity
            });
          }
        }
      }
      
      // If products have insufficient quantity, return error
      if (insufficientProducts.length > 0) {
        return res.status(400).json({ 
          error: 'Quantité facturable insuffisante',
          details: insufficientProducts
        });
      }
      
      // If products need substitution, return error with details
      if (productsNeedingSubstitution.length > 0) {
        console.log('Products needing substitution:', productsNeedingSubstitution);
        return res.status(400).json({ 
          error: 'SUBSTITUTION_REQUIRED',
          message: 'Certains produits nécessitent une substitution de facturation',
          productsNeedingSubstitution
        });
      }
    }
    
    // Validate invoiceable quantities if substitutions provided
    if (invoiceSubstitutions && invoiceSubstitutions.length > 0) {
      for (const sub of invoiceSubstitutions) {
        const product = await prisma.product.findUnique({
          where: { id: sub.invoicedProductId }
        });
        
        if (!product) {
          return res.status(400).json({ error: `Product ${sub.invoicedProductId} not found` });
        }
        
        // Calculate available quantity
        const usedQty = await prisma.invoiceSubstitution.aggregate({
          where: { invoicedProductId: sub.invoicedProductId },
          _sum: { quantity: true }
        });
        
        const totalUsed = usedQty._sum.quantity || 0;
        const available = product.invoiceableQuantity - totalUsed;
        
        if (sub.quantity > available) {
          return res.status(400).json({ 
            error: `Insufficient invoiceable quantity for ${product.name}. Available: ${available}, Requested: ${sub.quantity}` 
          });
        }
      }
    }

    // Generate unique facture numero
    const lastFacture = await prisma.factureClient.findFirst({
      orderBy: { id: 'desc' }
    });
    const fcCount = lastFacture ? parseInt(lastFacture.numero.replace('FC', '')) : 0;
    const fcNumero = `FC${String(fcCount + 1).padStart(6, '0')}`;

    // Always include timbre fiscal in factures (1.0 TND)
    const timbreFiscal = 1.0;
    const montantTTC = commande.montantHT + commande.montantTVA + timbreFiscal;

    // Build a map of substitutions for easy lookup
    const substitutionMap = new Map();
    if (invoiceSubstitutions && invoiceSubstitutions.length > 0) {
      for (const sub of invoiceSubstitutions) {
        const invoicedProduct = await prisma.product.findUnique({
          where: { id: sub.invoicedProductId }
        });
        if (invoicedProduct) {
          substitutionMap.set(sub.realProductId, invoicedProduct);
        }
      }
    }

    const facture = await prisma.factureClient.create({
      data: {
        numero: fcNumero,
        clientId: commande.clientId,
        date: new Date(),
        statut: 'BROUILLON',
        montantHT: commande.montantHT,
        montantTVA: commande.montantTVA,
        timbreFiscal: timbreFiscal,
        montantTTC: montantTTC,
        deliveryFee: commande.deliveryFee,
        deliveryTvaRate: commande.deliveryTvaRate,
        notes: `Créée depuis Commande ${commande.numero}`,
        lignes: {
          create: commande.lignes.map(l => {
            // Use invoiced product name if substitution exists
            const invoicedProduct = l.productId ? substitutionMap.get(l.productId) : null;
            return {
              productId: invoicedProduct ? invoicedProduct.id : l.productId,
              designation: invoicedProduct ? invoicedProduct.name : l.designation,
              quantite: l.quantite,
              prixUnitaireHT: l.prixUnitaireHT,
              tauxTVA: l.tauxTVA,
              montantHT: l.montantHT,
              montantTVA: l.montantTVA,
              montantTTC: l.montantTTC
            };
          })
        },
        invoiceSubstitutions: invoiceSubstitutions && invoiceSubstitutions.length > 0 ? {
          create: invoiceSubstitutions.map((sub: any) => ({
            realProductId: sub.realProductId,
            invoicedProductId: sub.invoicedProductId,
            quantity: sub.quantity
          }))
        } : undefined
      },
      include: { client: true, lignes: true }
    });
    
    // Decrement invoiceableQuantity
    if (invoiceSubstitutions && invoiceSubstitutions.length > 0) {
      // For substituted products, decrement the invoiced product
      for (const sub of invoiceSubstitutions) {
        await prisma.product.update({
          where: { id: sub.invoicedProductId },
          data: {
            invoiceableQuantity: {
              decrement: sub.quantity
            }
          }
        });
      }
    } else {
      // For non-substituted products, decrement each product
      for (const ligne of commande.lignes) {
        if (ligne.productId) {
          await prisma.product.update({
            where: { id: ligne.productId },
            data: {
              invoiceableQuantity: {
                decrement: ligne.quantite
              }
            }
          });
        }
      }
    }

    // Link back to commande
    await prisma.commandeClient.update({
      where: { id: commande.id },
      data: { factureClientId: facture.id }
    });

    res.json(facture);
  } catch (error: any) {
    console.error('Error converting commande to facture:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
