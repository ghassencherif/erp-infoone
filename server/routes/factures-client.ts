import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Get all client invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const factures = await prisma.factureClient.findMany({
      include: {
        client: true,
        lignes: {
          include: { product: true }
        },
        invoiceSubstitutions: {
          include: {
            realProduct: true,
            invoicedProduct: true
          }
        },
        commandesClient: true,
        bonsCommandeClient: true,
        bonsLivraisonClient: true
      },
      orderBy: { date: 'desc' }
    });
    
    const facturesWithStatus = factures.map(facture => {
      // Determine the source document
      let sourceType = null;
      let sourceNumero = null;
      
      if (facture.commandesClient.length > 0) {
        sourceType = 'COMMANDE';
        sourceNumero = facture.commandesClient[0].numero;
      } else if (facture.bonsCommandeClient.length > 0) {
        sourceType = 'BC';
        sourceNumero = facture.bonsCommandeClient[0].numero;
      } else if (facture.bonsLivraisonClient.length > 0) {
        sourceType = 'BL';
        sourceNumero = facture.bonsLivraisonClient[0].numero;
      }
      
      return {
        ...facture,
        sourceType,
        sourceNumero
      };
    });
    
    res.json(facturesWithStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single invoice
router.get('/:id', authenticate, async (req, res) => {
  try {
    const facture = await prisma.factureClient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        lignes: {
          include: { product: true }
        },
        invoiceSubstitutions: {
          include: {
            realProduct: true,
            invoicedProduct: true
          }
        }
      }
    });
    res.json(facture);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post('/', authenticate, async (req, res) => {
  try {
    const { clientId, date, dateEcheance, statut, lignes, notes, invoiceSubstitutions, skipStockReduction, deliveryFee = 0, deliveryTvaRate = 7 } = req.body;
    
    // Only validate and reduce stock if this is a manual invoice creation (not a conversion)
    const shouldReduceStock = !skipStockReduction;
    
    // Validate stock availability for all products (only for manual creation)
    if (shouldReduceStock) {
      for (const ligne of lignes) {
        if (ligne.productId) {
          const product = await prisma.product.findUnique({
            where: { id: ligne.productId },
            include: { stockAvailables: true }
          });
          
          if (!product) {
            return res.status(400).json({ error: `Produit ${ligne.productId} introuvable` });
          }
          
          // Skip stock validation for services
          if (product.isService) {
            continue;
          }
          
          const currentStock = product.stockAvailables.reduce((sum, s) => sum + s.quantity, 0);
          
          // Check invoiceable quantity first (prioritize invoiceable over regular stock)
          if (product.invoiceableQuantity >= ligne.quantite) {
            // Can invoice from invoiceableQuantity
            continue;
          }
          
          // If invoiceable is insufficient, check if regular stock can cover the rest
          if (currentStock < ligne.quantite) {
            return res.status(400).json({ 
              error: `Stock insuffisant pour ${product.name}. Disponible: ${currentStock}, Facturable: ${product.invoiceableQuantity}, Demandé: ${ligne.quantite}` 
            });
          }
        }
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
        
        // Calculate how many have been used
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
    
    // Calculate totals
    let montantHT = 0;
    let montantTVA = 0;
    const timbreFiscal = 1.0;
    
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
    
    const lignesData = lignes.map((ligne: any) => {
      const mHT = ligne.quantite * ligne.prixUnitaireHT;
      const mTVA = mHT * (ligne.tauxTVA / 100);
      const mTTC = mHT + mTVA;
      montantHT += mHT;
      montantTVA += mTVA;
      
      // Use invoiced product name and ID if substitution exists
      const invoicedProduct = ligne.productId ? substitutionMap.get(ligne.productId) : null;
      
      return {
        productId: invoicedProduct ? invoicedProduct.id : ligne.productId,
        designation: invoicedProduct ? invoicedProduct.name : ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        montantHT: mHT,
        montantTVA: mTVA,
        montantTTC: mTTC
      };
    });
    
    // Add delivery as HT+TVA if provided (deliveryFee is HT here)
    const deliveryTVA = deliveryFee * (deliveryTvaRate / 100);
    montantHT += deliveryFee;
    montantTVA += deliveryTVA;

    const montantTTC = montantHT + montantTVA + timbreFiscal;
    
    // Get settings for prefix
    const settings = await prisma.companySetting.findUnique({ where: { id: 1 } });
    const prefix = settings?.invoicePrefix || 'FA26';
    const startNumber = settings?.invoiceStartNumber || 1;
    
    // Generate unique invoice number
    const pad = (n: number) => String(n).padStart(7, '0');
    const getNextNumber = async () => {
      const last = await prisma.factureClient.findFirst({
        where: { numero: { startsWith: prefix } },
        orderBy: { numero: 'desc' }
      });
      if (!last || !last.numero) return startNumber;
      const match = last.numero.match(new RegExp(`${prefix}(\\d+)`));
      return match ? parseInt(match[1]) + 1 : startNumber;
    };

    let facture = null as any;
    {
      let attempt = 0;
      let nextNumber = await getNextNumber();
      const maxAttempts = 5;
      while (attempt < maxAttempts) {
        const numero = `${prefix}${pad(nextNumber)}`;
        try {
          facture = await prisma.factureClient.create({
            data: {
              numero,
              clientId,
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
              },
              invoiceSubstitutions: invoiceSubstitutions && invoiceSubstitutions.length > 0 ? {
                create: invoiceSubstitutions.map((sub: any) => ({
                  realProductId: sub.realProductId,
                  invoicedProductId: sub.invoicedProductId,
                  quantity: sub.quantity
                }))
              } : undefined
            },
            include: {
              client: true,
              lignes: { include: { product: true } },
              invoiceSubstitutions: {
                include: {
                  realProduct: true,
                  invoicedProduct: true
                }
              }
            }
          });
          break; // success
        } catch (e: any) {
          const message = e?.message || '';
          const isUnique = message.includes('Unique constraint failed') || e?.code === 'P2002';
          if (!isUnique) throw e;
          attempt += 1;
          nextNumber += 1;
          if (attempt >= maxAttempts) throw e;
        }
      }
    }
    
    if (!facture) {
      throw new Error('Echec de création de la facture (FC) après plusieurs tentatives');
    }

    // Post-create adjustments
    
    
    // Decrement invoiceableQuantity for substituted products
    if (invoiceSubstitutions && invoiceSubstitutions.length > 0) {
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
    }
    
    // Reduce stock for all products in the invoice (only for manual creation, not conversions)
    if (shouldReduceStock) {
      for (const ligne of lignes) {
        if (ligne.productId) {
          const product = await prisma.product.findUnique({
            where: { id: ligne.productId },
            include: { stockAvailables: true }
          });
          
          if (product) {
            // Prioritize invoiceableQuantity: reduce it first, then reduce regular stock if needed
            const invoiceableAvailable = product.invoiceableQuantity;
            const invoiceableToReduce = Math.min(ligne.quantite, invoiceableAvailable);
            const stockToReduce = ligne.quantite - invoiceableToReduce;
            
            // Reduce invoiceableQuantity
            if (invoiceableToReduce > 0) {
              await prisma.product.update({
                where: { id: ligne.productId },
                data: {
                  invoiceableQuantity: {
                    decrement: invoiceableToReduce
                  }
                }
              });
            }
            
            // Reduce regular stock if invoiceable wasn't enough
            if (stockToReduce > 0 && product.stockAvailables.length > 0) {
              const stock = product.stockAvailables[0];
              await prisma.stockAvailable.update({
                where: { id: stock.id },
                data: {
                  quantity: {
                    decrement: stockToReduce
                  }
                }
              });
            }
          }
        }
      }
    }
    
    res.status(201).json(facture);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, date, dateEcheance, statut, lignes, notes } = req.body;
    
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
    
    // Delete existing lines and create new ones
    await prisma.ligneFactureClient.deleteMany({
      where: { factureClientId: parseInt(id) }
    });
    
    const facture = await prisma.factureClient.update({
      where: { id: parseInt(id) },
      data: {
        clientId,
        date: new Date(date),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
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
    
    res.json(facture);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const factureId = parseInt(req.params.id);
    
    // Get invoice substitutions before deleting
    const substitutions = await prisma.invoiceSubstitution.findMany({
      where: { factureClientId: factureId }
    });
    
    // Restore invoiceableQuantity for substituted products
    if (substitutions.length > 0) {
      for (const sub of substitutions) {
        await prisma.product.update({
          where: { id: sub.invoicedProductId },
          data: {
            invoiceableQuantity: {
              increment: sub.quantity
            }
          }
        });
      }
    }
    
    // Delete invoice (cascades to lignes and substitutions)
    await prisma.factureClient.delete({
      where: { id: factureId }
    });
    
    res.json({ message: 'Facture supprimée' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk invoice creation from multiple orders
router.post('/bulk-invoice', authenticate, async (req, res) => {
  try {
    const { commandeIds } = req.body;
    
    if (!commandeIds || !Array.isArray(commandeIds) || commandeIds.length === 0) {
      return res.status(400).json({ error: 'Aucune commande sélectionnée' });
    }
    
    // Get DIVERS client
    const diversClient = await prisma.client.findFirst({
      where: { name: 'DIVERS' }
    });
    
    if (!diversClient) {
      return res.status(404).json({ error: 'Client DIVERS introuvable. Veuillez contacter l\'administrateur.' });
    }
    
    // Get all selected orders with their lines
    const commandes = await prisma.commandeClient.findMany({
      where: {
        id: { in: commandeIds },
        factureClientId: null // Only orders without invoice
      },
      include: {
        lignes: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (commandes.length === 0) {
      return res.status(400).json({ error: 'Aucune commande facturable trouvée' });
    }
    
    // Calculate totals from all orders with cost price + 7% margin
    let montantHT = 0;
    let montantTVA = 0;
    const allLignes: any[] = [];
    
    // Get products to calculate cost-based pricing
    const productIds = [...new Set(commandes.flatMap(c => c.lignes.map(l => l.productId)).filter(Boolean))];
    const productsMap = new Map();
    
    if (productIds.length > 0) {
      const productsData = await prisma.product.findMany({
        where: { id: { in: productIds as number[] } }
      });
      productsData.forEach(p => productsMap.set(p.id, p));
    }
    
    commandes.forEach(commande => {
      commande.lignes.forEach(ligne => {
        // Keep original price from the order (no cost override)
        // This allows manual pricing and preserves the negotiated price
        const prixUnitaireHT = ligne.prixUnitaireHT;

        // Line amounts (rounded to 3 decimals to keep consistency)
        const ligneHTRaw = ligne.quantite * prixUnitaireHT;
        const ligneHT = parseFloat(ligneHTRaw.toFixed(3));
        const ligneTVARaw = ligneHT * (ligne.tauxTVA / 100);
        const ligneTVA = parseFloat(ligneTVARaw.toFixed(3));
        const ligneTTC = parseFloat((ligneHT + ligneTVA).toFixed(3));

        allLignes.push({
          productId: ligne.productId,
          designation: ligne.designation,
          quantite: ligne.quantite,
          prixUnitaireHT,
          tauxTVA: ligne.tauxTVA,
          montantHT: ligneHT,
          montantTVA: ligneTVA,
          montantTTC: ligneTTC
        });

        montantHT += ligneHT;
        montantTVA += ligneTVA;
      });
    });
    
  const timbreFiscal = 1.0;
  // Round global totals after accumulation
  montantHT = parseFloat(montantHT.toFixed(3));
  montantTVA = parseFloat(montantTVA.toFixed(3));
  const montantTTC = parseFloat((montantHT + montantTVA + timbreFiscal).toFixed(3));
    
    // Generate unique invoice number with FACL prefix and retry on collision
    const pad = (n: number) => String(n).padStart(6, '0');
    const getNextFaclNumber = async () => {
      const lastFacl = await prisma.factureClient.findFirst({
        where: { numero: { startsWith: 'FACL' } },
        orderBy: { numero: 'desc' }
      });
      if (!lastFacl || !lastFacl.numero) return 1;
      const match = lastFacl.numero.match(/FACL(\d+)/);
      return match ? parseInt(match[1]) + 1 : 1;
    };

    let facture;
    {
      let attempt = 0;
      let nextNumber = await getNextFaclNumber();
      const maxAttempts = 5;
      while (attempt < maxAttempts) {
        const numero = `FACL${pad(nextNumber)}`;
        try {
          // Try create with current numero
          facture = await prisma.factureClient.create({
            data: {
              numero,
              clientId: diversClient.id,
              date: new Date(),
              montantHT,
              montantTVA,
              timbreFiscal,
              montantTTC,
              statut: 'ENVOYE',
              notes: null,
              lignes: {
                create: allLignes
              }
            },
            include: {
              client: true,
              lignes: {
                include: {
                  product: true
                }
              }
            }
          });
          break; // success
        } catch (e: any) {
          // Handle unique constraint on numero (P2002)
          const message = e?.message || '';
          const isUnique = message.includes('Unique constraint failed') || e?.code === 'P2002';
          if (!isUnique) throw e;
          attempt += 1;
          nextNumber += 1; // bump and retry
          if (attempt >= maxAttempts) throw e;
        }
      }
    }
    
    if (!facture) {
      throw new Error('Echec de création de la facture après plusieurs tentatives de numéro unique');
    }

    // Link orders to this invoice
    await prisma.commandeClient.updateMany({
      where: {
        id: { in: commandeIds }
      },
      data: {
        factureClientId: facture.id
      }
    });
    
    // Update invoiceable quantity for each product
    for (const ligne of allLignes) {
      if (ligne.productId) {
        const product = await prisma.product.findUnique({
          where: { id: ligne.productId }
        });
        
        if (product) {
          await prisma.product.update({
            where: { id: ligne.productId },
            data: {
              invoiceableQuantity: Math.max(0, product.invoiceableQuantity - ligne.quantite)
            }
          });
        }
      }
    }
    
    res.status(201).json(facture);
  } catch (error: any) {
    console.error('Error creating bulk invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simulate bulk invoice (no DB writes) - returns computed lines and totals
router.post('/bulk-invoice/simulate', authenticate, async (req, res) => {
  try {
    const { commandeIds } = req.body;
    if (!commandeIds || !Array.isArray(commandeIds) || commandeIds.length === 0) {
      return res.status(400).json({ error: 'Aucune commande sélectionnée' });
    }

    // Fetch orders with lines
    const commandes = await prisma.commandeClient.findMany({
      where: { id: { in: commandeIds } },
      include: {
        lignes: true
      }
    });

    if (commandes.length === 0) {
      return res.status(400).json({ error: 'Aucune commande trouvée' });
    }

    // Build product map for cost lookup
    const productIds = [...new Set(commandes.flatMap(c => c.lignes.map(l => l.productId)).filter(Boolean))] as number[];
    const productsMap = new Map<number, any>();
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      products.forEach(p => productsMap.set(p.id, p));
    }

    // Simulate bulk invoice from multiple commandesClient
    const allLignes: any[] = [];
    let montantHT = 0;
    let montantTVA = 0;

    for (const cmd of commandes) {
      for (const ligne of cmd.lignes) {
        // FIFO logic for simulation: find oldest supplier invoice lines
        let quantityToInvoice = ligne.quantite
        let totalCost = 0
        
        const supplierLines = await prisma.ligneFactureFournisseur.findMany({
          where: {
            productId: ligne.productId,
            quantiteRestante: { gt: 0 }
          },
          include: {
            facture: true
          },
          orderBy: {
            facture: { date: 'asc' }
          }
        })
        
        // Calculate average purchase price from FIFO
        for (const supplierLine of supplierLines) {
          if (quantityToInvoice <= 0) break
          const quantityToConsume = Math.min(quantityToInvoice, supplierLine.quantiteRestante)
          totalCost += supplierLine.prixUnitaire * quantityToConsume
          quantityToInvoice -= quantityToConsume
        }
        
        // Calculate price with 7% margin (same as bulk-invoice-pos)
        let prixUnitaireHT: number
        if (totalCost > 0) {
          const averagePurchasePrice = totalCost / ligne.quantite
          prixUnitaireHT = parseFloat((averagePurchasePrice * 1.07).toFixed(3))
        } else {
          // Fallback: use original price + 7%
          prixUnitaireHT = parseFloat((ligne.prixUnitaireHT * 1.07).toFixed(3))
        }
        
        const lHT = parseFloat((ligne.quantite * prixUnitaireHT).toFixed(3))
        const lTVA = parseFloat((lHT * (ligne.tauxTVA / 100)).toFixed(3))
        const lTTC = parseFloat((lHT + lTVA).toFixed(3))
        
        allLignes.push({
          productId: ligne.productId,
          designation: ligne.designation,
          quantite: ligne.quantite,
          prixUnitaireHT,
          tauxTVA: ligne.tauxTVA,
          montantHT: lHT,
          montantTVA: lTVA,
          montantTTC: lTTC
        })
        
        montantHT += lHT
        montantTVA += lTVA
      }
    }

    montantHT = parseFloat(montantHT.toFixed(3));
    montantTVA = parseFloat(montantTVA.toFixed(3));
    const timbreFiscal = 1.0;
    const montantTTC = parseFloat((montantHT + montantTVA + timbreFiscal).toFixed(3));

    res.json({
      lignes: allLignes,
      totaux: { montantHT, montantTVA, timbreFiscal, montantTTC }
    });
  } catch (error: any) {
    console.error('Error simulating bulk invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Convert single CommandeClient to FactureClient
router.post('/from-commande/:id', authenticate, async (req, res) => {
  try {
    const commande = await prisma.commandeClient.findUnique({
      where: { id: Number(req.params.id) },
      include: { lignes: true, client: true }
    })
    if (!commande) return res.status(404).json({ error: 'Commande introuvable' })
    if (commande.factureClientId) return res.status(400).json({ error: 'Commande déjà facturée' })

    // Generate numero with retry
    const pad = (n: number) => String(n).padStart(6, '0')
    const getNextFcNumber = async () => {
      const lastFc = await prisma.factureClient.findFirst({ where: { numero: { startsWith: 'FC' } }, orderBy: { numero: 'desc' } })
      if (!lastFc || !lastFc.numero) return 1
      const match = lastFc.numero.match(/FC(\d+)/)
      return match ? parseInt(match[1]) + 1 : 1
    }

    let facture: any = null
    let attempt = 0
    let nextNumber = await getNextFcNumber()
    const maxAttempts = 5
    
    // Always include timbre fiscal in factures (1.0 TND)
    const timbreFiscal = 1.0
    const remise = commande.remise || 0
    const montantTTC = commande.montantHT + commande.montantTVA + timbreFiscal
    
    // Set status: ANNULE if commande is RETOUR, otherwise PAYE
    const statutFacture = commande.statut === 'RETOUR' ? 'ANNULE' : 'PAYE';
    
    while (attempt < maxAttempts) {
      const numero = `FC${pad(nextNumber)}`
      try {
        facture = await prisma.factureClient.create({
          data: {
            numero,
            clientId: commande.clientId,
            date: new Date(),
            statut: statutFacture,
            montantHT: commande.montantHT,
            montantTVA: commande.montantTVA,
            timbreFiscal: timbreFiscal,
            montantTTC: montantTTC,
            remise: remise,
            notes: `Créée depuis Commande ${commande.numero} (POS)`,
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
        })
        break
      } catch (e: any) {
        const msg = e?.message || ''
        if (e?.code === 'P2002' || msg.includes('Unique constraint failed')) {
          attempt += 1
          nextNumber += 1
          if (attempt >= maxAttempts) throw e
        } else {
          throw e
        }
      }
    }

    if (!facture) throw new Error('Echec création facture')

    // Link commande to facture
    await prisma.commandeClient.update({ where: { id: commande.id }, data: { factureClientId: facture.id } })

    res.json(facture)
  } catch (e: any) {
    console.error('Error creating facture from commande', e)
    res.status(500).json({ error: e.message || 'Erreur création facture' })
  }
})

// Bulk invoice all uninvoiced POS commandes for DIVERS
router.post('/bulk-invoice-pos', authenticate, async (req, res) => {
  try {
    const divers = await prisma.client.findFirst({ where: { name: 'DIVERS' } })
    if (!divers) return res.status(404).json({ error: 'Client DIVERS introuvable' })

    const commandes = await prisma.commandeClient.findMany({
      where: { 
        clientId: divers.id, 
        factureClientId: null
      },
      include: { lignes: { include: { product: true } } }
    })

    if (commandes.length === 0) {
      return res.status(400).json({ error: 'Aucune commande POS non-facturée pour DIVERS' })
    }

    // Aggregate all lines with FIFO pricing (using oldest supplier invoice lines)
    const allLines: any[] = []
    let montantHT = 0, montantTVA = 0
    
    for (const cmd of commandes) {
      for (const l of cmd.lignes) {
        // FIFO logic: consume from oldest supplier invoice lines first
        let quantityToInvoice = l.quantite
        let totalCost = 0
        const consumedLines: { ligneId: number, quantityUsed: number }[] = []
        
        // Find oldest supplier invoice lines with remaining quantity for this product
        const supplierLines = await prisma.ligneFactureFournisseur.findMany({
          where: {
            productId: l.productId,
            quantiteRestante: { gt: 0 }
          },
          include: {
            facture: true
          },
          orderBy: {
            facture: { date: 'asc' } // Oldest first (FIFO)
          }
        })
        
        // Consume quantities from oldest lines first
        for (const supplierLine of supplierLines) {
          if (quantityToInvoice <= 0) break
          
          const quantityToConsume = Math.min(quantityToInvoice, supplierLine.quantiteRestante)
          totalCost += supplierLine.prixUnitaire * quantityToConsume
          
          consumedLines.push({
            ligneId: supplierLine.id,
            quantityUsed: quantityToConsume
          })
          
          quantityToInvoice -= quantityToConsume
        }
        
        // Calculate price with 7% margin
        let newPrixUnitaireHT: number
        if (consumedLines.length > 0) {
          // Average cost from FIFO consumption + 7% margin
          const averagePurchasePrice = totalCost / l.quantite
          newPrixUnitaireHT = parseFloat((averagePurchasePrice * 1.07).toFixed(3))
        } else {
          // Fallback: no supplier invoices available, use original POS price + 7%
          newPrixUnitaireHT = parseFloat((l.prixUnitaireHT * 1.07).toFixed(3))
        }
        
        // Recalculate amounts with new price
        const newMontantHT = parseFloat((newPrixUnitaireHT * l.quantite).toFixed(3))
        const newMontantTVA = parseFloat((newMontantHT * (l.tauxTVA / 100)).toFixed(3))
        const newMontantTTC = parseFloat((newMontantHT + newMontantTVA).toFixed(3))
        
        montantHT += newMontantHT
        montantTVA += newMontantTVA
        
        allLines.push({
          productId: l.productId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaireHT: newPrixUnitaireHT,
          tauxTVA: l.tauxTVA,
          montantHT: newMontantHT,
          montantTVA: newMontantTVA,
          montantTTC: newMontantTTC,
          _fifoConsumed: consumedLines // Temporary field to track consumption (not saved to DB)
        })
      }
    }

    montantHT = parseFloat(montantHT.toFixed(3))
    montantTVA = parseFloat(montantTVA.toFixed(3))
    
    // Always include timbre fiscal in factures (1.0 TND)
    const timbreFiscal = 1.0
    const montantTTC = parseFloat((montantHT + montantTVA + timbreFiscal).toFixed(3))

    // Generate numero (FC - same as regular invoices)
    const pad = (n: number) => String(n).padStart(6, '0')
    const getNextFcNumber = async () => {
      const lastFc = await prisma.factureClient.findFirst({ 
        where: { numero: { startsWith: 'FC' } }, 
        orderBy: { numero: 'desc' } 
      })
      if (!lastFc || !lastFc.numero) return 1
      const match = lastFc.numero.match(/FC(\d+)/)
      return match ? parseInt(match[1]) + 1 : 1
    }

    let facture: any = null
    let attempt = 0
    let nextNumber = await getNextFcNumber()
    const maxAttempts = 5
    while (attempt < maxAttempts) {
      const numero = `FC${pad(nextNumber)}`
      try {
        // Remove temporary _fifoConsumed field before creating invoice
        const linesForDb = allLines.map(({ _fifoConsumed, ...line }) => line)
        
        facture = await prisma.factureClient.create({
          data: {
            numero,
            clientId: divers.id,
            date: new Date(),
            statut: 'PAYE',
            montantHT, montantTVA, timbreFiscal, montantTTC,
            notes: null,
            lignes: { create: linesForDb }
          },
          include: { client: true, lignes: true }
        })
        break
      } catch (e: any) {
        const msg = e?.message || ''
        if (e?.code === 'P2002' || msg.includes('Unique constraint failed')) {
          attempt += 1
          nextNumber += 1
          if (attempt >= maxAttempts) throw e
        } else {
          throw e
        }
      }
    }

    if (!facture) throw new Error('Echec création facture groupée')

    // Update quantiteRestante for consumed supplier invoice lines (FIFO)
    for (const line of allLines) {
      if (line._fifoConsumed && line._fifoConsumed.length > 0) {
        for (const consumed of line._fifoConsumed) {
          await prisma.ligneFactureFournisseur.update({
            where: { id: consumed.ligneId },
            data: {
              quantiteRestante: { decrement: consumed.quantityUsed }
            }
          })
        }
      }
      
      // Decrement invoiceableQuantity when invoice is created
      if (line.productId) {
        const product = await prisma.product.findUnique({ where: { id: line.productId } })
        if (product) {
          await prisma.product.update({
            where: { id: line.productId },
            data: { invoiceableQuantity: Math.max(0, product.invoiceableQuantity - line.quantite) }
          })
        }
      }
    }

    // Link all commandes to the facture
    for (const cmd of commandes) {
      await prisma.commandeClient.update({ where: { id: cmd.id }, data: { factureClientId: facture.id } })
    }

    res.json(facture)
  } catch (e: any) {
    console.error('Error bulk invoicing POS', e)
    res.status(500).json({ error: e.message || 'Erreur facture groupée' })
  }
})

export default router;
