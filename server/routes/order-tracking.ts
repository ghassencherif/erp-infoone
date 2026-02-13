import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import http from 'http';
import https from 'https';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();


const allowedTransporters = ['ARAMEX', 'FIRST_DELIVERY', 'OUR_COMPANY'];

async function logDeliveryEvent(commandeId: number, transporter: string | null, oldStatus: string | null, newStatus: string | null, direction: 'OUTBOUND' | 'RETURN' = 'OUTBOUND') {
  try {
    await prisma.deliveryEvent.create({
      data: {
        commandeId,
        transporter: transporter as any,
        oldStatus: oldStatus as any,
        newStatus: newStatus as any,
        direction
      }
    });
  } catch (error) {
    console.error('Failed to log delivery event', error);
  }
}

// Map transporter-specific statuses to our DeliveryStatus enum
const normalizeStatus = (status: string) => {
  const val = status.toLowerCase();
  // Delivered statuses - Aramex "Shipment charges paid" means delivered
  if (['delivered', 'delivered/collected', 'livré', 'delivered/returned', 'shipment charges paid'].includes(val)) return 'DELIVERED';
  // Out for delivery statuses
  if (['out for delivery', 'out_for_delivery', 'out-for-delivery', 'en cours de livraison'].includes(val)) return 'OUT_FOR_DELIVERY';
  // Depot / origin facility
  if (['received at origin facility', 'origin facility', 'depot transporteur'].includes(val)) return 'DEPOT_TRANSPORTEUR';
  // Returned to shipper
  if (['returned to shipper', 'retour', 'return to shipper'].includes(val)) return 'RETOUR';
  // In transit statuses
  if (['in transit', 'in_transit', 'transit', 'en transit', 'shipment picked up'].includes(val)) return 'IN_TRANSIT';
  // Picked up statuses
  if (['picked up', 'picked_up', 'pickup', 'collecté'].includes(val)) return 'PICKED_UP';
  // Failed statuses
  if (['failed', 'failed delivery', 'returned', 'échoué'].includes(val)) return 'FAILED';
  // Cancelled statuses
  if (['cancelled', 'canceled', 'annulé'].includes(val)) return 'CANCELLED';
  return 'PENDING';
};

// Update order status and set transporter
router.post('/commandes-client/:id/start', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { transporter, trackingNumber, deliveryNote } = req.body;

    if (!allowedTransporters.includes(transporter)) {
      return res.status(400).json({ error: 'Invalid transporter' });
    }

    const commande = await prisma.commandeClient.update({
      where: { id: parseInt(id, 10) },
      data: {
        statut: 'EN_COURS_LIVRAISON',
        transporter: transporter as any,
        trackingNumber: trackingNumber || null,
        deliveryStatus: transporter === 'OUR_COMPANY' ? 'OUT_FOR_DELIVERY' : 'PENDING',
        deliveryNote: deliveryNote || null,
        lastTrackingCheck: new Date()
      },
      include: { client: true, lignes: true, bonsLivraison: true }
    });

    let bonLivraison = commande.bonsLivraison?.[0] || null;

    // Auto-create BL if not already linked when tracking number is provided
    if (!bonLivraison && trackingNumber) {
      const blCount = await prisma.bonLivraisonClient.count();
      const blNumero = `BL${String(blCount + 1).padStart(6, '0')}`;

      bonLivraison = await prisma.bonLivraisonClient.create({
        data: {
          numero: blNumero,
          clientId: commande.clientId,
          commandeClientId: commande.id,
          date: new Date(),
          statut: 'BROUILLON',
          montantHT: commande.montantHT,
          montantTVA: commande.montantTVA,
          montantTTC: commande.montantHT + commande.montantTVA,
          notes: `Créé automatiquement lors de la saisie du tracking ${trackingNumber}`,
          lignes: {
            create: commande.lignes.map((l: any) => ({
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
        }
      });

      await prisma.commandeClient.update({
        where: { id: commande.id },
        data: {
          bonLivraisonClientId: bonLivraison.id,
          bonsLivraison: { connect: { id: bonLivraison.id } }
        } as any
      });
    }

    if (['ARAMEX', 'FIRST_DELIVERY'].includes(transporter) && trackingNumber) {
      await checkDeliveryStatus(commande.id, transporter, trackingNumber, true);
    }

    res.json({
      message: 'Commande passée en livraison',
      commande,
      bonLivraison,
      printUrl: bonLivraison ? `/print/bon-livraison/${bonLivraison.id}` : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List in-transit orders (for dashboard) - MUST BE BEFORE /:id route
router.get('/commandes-client/in-transit', authenticate, async (_req, res) => {
  try {
    console.log('🔍 Fetching in-transit orders...');
    const commandes = await prisma.commandeClient.findMany({
      where: {
        statut: 'EN_COURS_LIVRAISON'
      },
      select: {
        id: true,
        numero: true,
        client: { select: { name: true } },
        date: true,
        montantTTC: true,
        transporter: true,
        trackingNumber: true,
        deliveryStatus: true,
        deliveryDate: true,
        deliveryNote: true,
        lastTrackingCheck: true
      },
      orderBy: { date: 'desc' }
    });

    // For each in-transit order, sync the current status from transporter API
    console.log(`📦 Found ${commandes.length} in-transit orders, syncing status...`);
    for (const commande of commandes) {
      if (commande.transporter && commande.trackingNumber) {
        try {
          await checkDeliveryStatus(commande.id, commande.transporter as any, commande.trackingNumber, false);
          console.log(`   ✓ Synced ${commande.numero} (${commande.transporter})`);
        } catch (e) {
          console.log(`   ✗ Failed to sync ${commande.numero}: ${(e as any).message}`);
        }
      }
    }

    // Refetch orders with updated status
    const updatedCommandes = await prisma.commandeClient.findMany({
      where: {
        statut: 'EN_COURS_LIVRAISON'
      },
      select: {
        id: true,
        numero: true,
        client: { select: { name: true } },
        date: true,
        montantTTC: true,
        transporter: true,
        trackingNumber: true,
        deliveryStatus: true,
        deliveryDate: true,
        deliveryNote: true,
        lastTrackingCheck: true
      },
      orderBy: { date: 'desc' }
    });

    console.log(`✅ Returning ${updatedCommandes.length} in-transit orders with current status`);
    res.json(updatedCommandes);
  } catch (error: any) {
    console.error('❌ Error fetching in-transit orders:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to fetch orders', details: error.toString() });
  }
});

// Get tracking info for order
router.get('/commandes-client/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const commande = await prisma.commandeClient.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        numero: true,
        transporter: true,
        trackingNumber: true,
        deliveryStatus: true,
        deliveryDate: true,
        deliveryNote: true,
        lastTrackingCheck: true,
        statut: true,
        returnStatus: true,
        returnTrackingNumber: true,
        returnDate: true,
        returnNote: true,
        returnCreatedAvoirId: true,
        factureClient: {
          select: { id: true, numero: true }
        },
        bonsLivraison: {
          select: {
            id: true,
            numero: true
          },
          take: 1
        }
      }
    });

    if (!commande) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { bonsLivraison, factureClient, ...rest } = commande;
    const bonLivraison = bonsLivraison?.[0] || null;

    res.json({
      ...rest,
      bonLivraisonId: bonLivraison?.id || null,
      bonLivraisonNumero: bonLivraison?.numero || null,
      factureId: factureClient?.id || null,
      factureNumero: factureClient?.numero || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start return tracking
router.post('/commandes-client/:id/return-start', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { transporter, trackingNumber, returnNote } = req.body;

    if (!allowedTransporters.includes(transporter)) {
      return res.status(400).json({ error: 'Invalid transporter' });
    }
    if (transporter !== 'OUR_COMPANY' && !trackingNumber?.trim()) {
      return res.status(400).json({ error: 'Tracking number required for transporteur' });
    }

    const commande = await prisma.commandeClient.findUnique({
      where: { id: parseInt(id, 10) }
    });
    if (!commande) return res.status(404).json({ error: 'Commande non trouvée' });
    if (commande.returnStatus === 'STOCKED') {
      return res.status(400).json({ error: 'Retour déjà stocké' });
    }

    const updated = await prisma.commandeClient.update({
      where: { id: parseInt(id, 10) },
      data: {
        returnStatus: 'IN_TRANSIT',
        returnTrackingNumber: trackingNumber?.trim() || null,
        returnNote: returnNote || null
      }
    });

    await logDeliveryEvent(updated.id, transporter, commande.returnStatus, 'IN_TRANSIT', 'RETURN');

    res.json({ message: 'Retour démarré', commande: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Complete return: restock and optionally create avoir
router.post('/commandes-client/:id/return-complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { returnNote, trackingNumber } = req.body;

    const commande = await prisma.commandeClient.findUnique({
      where: { id: parseInt(id, 10) },
      include: { lignes: true, factureClient: { include: { lignes: true, client: true } }, client: true }
    });
    if (!commande) return res.status(404).json({ error: 'Commande non trouvée' });
    if (commande.returnStatus === 'STOCKED') {
      return res.status(400).json({ error: 'Retour déjà traité' });
    }

    // Restock products
    const hasInvoice = !!commande.factureClient;
    for (const ligne of commande.lignes) {
      if (!ligne.productId) continue;
      const stock = await prisma.stockAvailable.findFirst({ where: { productId: ligne.productId } });
      if (stock) {
        await prisma.stockAvailable.update({ where: { id: stock.id }, data: { quantity: { increment: ligne.quantite } } });
      }
      
      // If commande has an invoice, also increment invoiceableQuantity
      if (hasInvoice) {
        await prisma.product.update({
          where: { id: ligne.productId },
          data: { invoiceableQuantity: { increment: ligne.quantite } }
        });
      }
    }

    let createdAvoirId: number | null = null;
    if (commande.factureClient && !commande.returnCreatedAvoirId) {
      // Build avoir from facture lines
      let montantHT = 0;
      let montantTVA = 0;
      const timbreFiscal = 1.0;
      const lignesData = commande.factureClient.lignes.map((l) => {
        const mHT = l.quantite * l.prixUnitaireHT;
        const mTVA = mHT * (l.tauxTVA / 100);
        montantHT += mHT;
        montantTVA += mTVA;
        return {
          productId: l.productId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          tauxTVA: l.tauxTVA,
          montantHT: mHT,
          montantTVA: mTVA,
          montantTTC: mHT + mTVA
        };
      });
      const montantTTC = montantHT + montantTVA + timbreFiscal;

      const lastAvoir = await prisma.avoirClient.findFirst({ orderBy: { numero: 'desc' } });
      const lastNum = lastAvoir ? parseInt(lastAvoir.numero.replace('AC', '')) : 0;
      const numero = `AC${String(lastNum + 1).padStart(6, '0')}`;

      const avoir = await prisma.avoirClient.create({
        data: {
          numero,
          clientId: commande.clientId,
          factureClientId: commande.factureClientId,
          date: new Date(),
          statut: 'BROUILLON',
          montantHT,
          montantTVA,
          timbreFiscal,
          montantTTC,
          motif: `Retour commande ${commande.numero}`,
          notes: returnNote || `Avoir généré lors du retour commande ${commande.numero}`,
          lignes: { create: lignesData }
        }
      });
      createdAvoirId = avoir.id;
    }

    const updated = await prisma.commandeClient.update({
      where: { id: commande.id },
      data: {
        returnStatus: 'STOCKED',
        returnDate: new Date(),
        returnNote: returnNote || commande.returnNote,
        returnTrackingNumber: trackingNumber?.trim() || commande.returnTrackingNumber,
        returnCreatedAvoirId: createdAvoirId || commande.returnCreatedAvoirId || undefined
      }
    });

    await logDeliveryEvent(updated.id, commande.transporter || null, commande.returnStatus, 'STOCKED', 'RETURN');

    res.json({ message: 'Retour stocké', commande: updated, avoirId: createdAvoirId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark order as delivered (manual)
router.post('/commandes-client/:id/mark-delivered', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryNote, deliveryDate } = req.body;

    const current = await prisma.commandeClient.findUnique({ where: { id: parseInt(id, 10) } });

    const commande = await prisma.commandeClient.update({
      where: { id: parseInt(id, 10) },
      data: {
        statut: 'LIVRE',
        deliveryStatus: 'DELIVERED',
        deliveryNote: deliveryNote || undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date()
      }
    });

    if (current?.deliveryStatus !== 'DELIVERED') {
      await logDeliveryEvent(commande.id, current?.transporter || null, current?.deliveryStatus || null, 'DELIVERED');
    }

    res.json({
      message: 'Commande marquée livrée',
      commande
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List delivered events (recent)
router.get('/events', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    const events = await prisma.deliveryEvent.findMany({
      where: {
        direction: 'OUTBOUND' // Only show outbound delivery events, exclude returns
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        commande: {
          select: {
            id: true,
            numero: true,
            client: { select: { name: true } },
            transporter: true,
            deliveryStatus: true,
            deliveryDate: true,
            transporterInvoiced: true
          }
        }
      }
    });
    console.log(`📋 Retrieved ${events.length} OUTBOUND delivery events`);
    res.json(events);
  } catch (error: any) {
    console.error('❌ Error fetching delivery events:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch events' });
  }
});

// Mark delivered events as invoiced to transporter
// Create transporter invoice for delivered orders
router.post('/events/create-invoice', authenticate, async (req, res) => {
  try {
    const { eventIds, clientId, clientName } = req.body as { eventIds: number[]; clientId?: number; clientName?: string };
    
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'eventIds required' });
    }

    // Get events and their related orders with all product lines
    const events = await prisma.deliveryEvent.findMany({
      where: { id: { in: eventIds } },
      include: {
        commande: {
          include: {
            client: true,
            lignes: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    const commandeIds = [...new Set(events.map((e) => e.commandeId))];
    
    // Check if any orders are already invoiced
    const alreadyInvoiced = events.filter(e => e.commande.transporterInvoiced);
    if (alreadyInvoiced.length > 0) {
      return res.status(400).json({ 
        error: `${alreadyInvoiced.length} commande(s) déjà facturée(s)`,
        alreadyInvoiced: alreadyInvoiced.map(e => e.commande.numero)
      });
    }

    // Get or create client for the transporter invoice
    let targetClientId = clientId;
    if (!targetClientId) {
      // Create a default transporter client if clientName provided
      if (clientName) {
        const existingClient = await prisma.client.findFirst({
          where: { name: clientName }
        });
        
        if (existingClient) {
          targetClientId = existingClient.id;
        } else {
          // Generate unique client code
          const count = await prisma.client.count();
          const newClient = await prisma.client.create({
            data: {
              code: `TR${String(count + 1).padStart(4, '0')}`,
              name: clientName,
              email: null,
              phone: null,
              address: null
            }
          });
          targetClientId = newClient.id;
        }
      } else {
        return res.status(400).json({ error: 'clientId or clientName required' });
      }
    }

    // Generate invoice number
    const lastInvoice = await prisma.factureClient.findFirst({
      orderBy: { numero: 'desc' }
    });
    const lastNum = lastInvoice ? parseInt(lastInvoice.numero.replace(/\D/g, '')) || 0 : 0;
    const numero = `FC${String(lastNum + 1).padStart(6, '0')}`;

    // Get delivery settings from company settings
    const settings = await prisma.companySetting.findUnique({ where: { id: 1 } });
    const deliveryFeeTTC = settings?.deliveryFeeDefault ?? 8; // 8 TND TTC by default
    const deliveryTvaRate = settings?.deliveryTvaRate ?? 7; // 7% TVA
    const deliveryFeeHT = deliveryFeeTTC / (1 + deliveryTvaRate / 100); // Calculate HT: 8 / 1.07 = 7.477
    const deliveryFeeTVA = deliveryFeeTTC - deliveryFeeHT; // Calculate TVA portion

    // Collect all product lines from all commandes (WITHOUT delivery fees)
    const productLines: any[] = [];
    let productsMontantHT = 0;
    let productsMontantTVA = 0;

    for (const event of events) {
      const trackingInfo = event.commande.trackingNumber 
        ? ` (Colis: ${event.commande.trackingNumber})` 
        : ` (${event.commande.numero})`;
      
      for (const ligne of event.commande.lignes) {
        // Add product line to invoice with tracking number reference
        productLines.push({
          productId: ligne.productId,
          designation: `${ligne.designation}${trackingInfo}`,
          quantite: ligne.quantite,
          prixUnitaireHT: ligne.prixUnitaireHT,
          tauxTVA: ligne.tauxTVA,
          montantHT: ligne.montantHT,
          montantTVA: ligne.montantTVA,
          montantTTC: ligne.montantTTC
        });
        
        productsMontantHT += ligne.montantHT;
        productsMontantTVA += ligne.montantTVA;
      }
    }

    // Add single delivery line at the bottom with reference based on transporter
    const transporter = events[0]?.commande.transporter || 'TRANSPORTEUR';
    const deliveryReference = transporter === 'ARAMEX' ? 'LIV-ARMX' : 
                             transporter === 'FIRST_DELIVERY' ? 'LIV-FD' : 
                             'LIV-TRANS';
    
    productLines.push({
      productId: null,
      designation: `Frais de Livraison`,
      reference: deliveryReference,
      quantite: events.length, // Number of commandes
      prixUnitaireHT: deliveryFeeHT,
      tauxTVA: deliveryTvaRate,
      montantHT: deliveryFeeHT * events.length,
      montantTVA: deliveryFeeTVA * events.length,
      montantTTC: deliveryFeeTTC * events.length
    });

    // Calculate final totals (products + delivery)
    const montantHT = productsMontantHT + (deliveryFeeHT * events.length);
    const montantTVA = productsMontantTVA + (deliveryFeeTVA * events.length);
    const timbreFiscal = 1.0;
    const montantTTC = montantHT + montantTVA + timbreFiscal;

    // Create invoice with all product lines + delivery line
    const facture = await prisma.factureClient.create({
      data: {
        numero,
        clientId: targetClientId,
        date: new Date(),
        statut: 'BROUILLON',
        montantHT,
        montantTVA,
        timbreFiscal,
        montantTTC,
        notes: `Facturation transport pour ${events.length} livraison(s): ${events.map(e => e.commande.numero).join(', ')}`,
        lignes: {
          create: productLines
        }
      },
      include: {
        client: true,
        lignes: true
      }
    });

    // Link invoice to all commandes
    await prisma.commandeClient.updateMany({
      where: { id: { in: commandeIds } },
      data: { 
        transporterInvoiced: true, 
        transporterInvoiceId: facture.id 
      }
    });

    res.json({ 
      message: `Facture ${facture.numero} créée pour ${events.length} livraison(s)`,
      facture,
      count: commandeIds.length 
    });
  } catch (error: any) {
    console.error('Error creating transporter invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/events/invoice', authenticate, async (req, res) => {
  try {
    const { eventIds, transporterInvoiceId } = req.body as { eventIds: number[]; transporterInvoiceId?: number };
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'eventIds required' });
    }

    const events = await prisma.deliveryEvent.findMany({
      where: { id: { in: eventIds } },
      select: { commandeId: true }
    });

    const commandeIds = [...new Set(events.map((e) => e.commandeId))];

    await prisma.commandeClient.updateMany({
      where: { id: { in: commandeIds } },
      data: { transporterInvoiced: true, transporterInvoiceId: transporterInvoiceId || null }
    });

    res.json({ message: 'Commandes marquées comme facturées au transporteur', count: commandeIds.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual check of a specific order
router.post('/commandes-client/:id/check', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const commande = await prisma.commandeClient.findUnique({ where: { id: parseInt(id, 10) } });

    if (!commande || !commande.transporter || !commande.trackingNumber) {
      return res.status(400).json({ error: 'Missing transporter or tracking number' });
    }

    const info = await checkDeliveryStatus(
      commande.id,
      commande.transporter,
      commande.trackingNumber,
      true
    );

    res.json(info || { message: 'No update' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check delivery status via transporter API
async function checkDeliveryStatus(commandeId: number, transporter: string, trackingNumber: string, sendNotifications = false) {
  try {
    let deliveryInfo: any = null;

    if (transporter === 'ARAMEX') {
      deliveryInfo = await checkAramexTracking(trackingNumber);
    } else if (transporter === 'FIRST_DELIVERY') {
      deliveryInfo = await checkFirstDeliveryTracking(trackingNumber);
    }

    if (!deliveryInfo) return null;

    const normalized = normalizeStatus(deliveryInfo.status || 'PENDING');

    const current = await prisma.commandeClient.findUnique({ where: { id: commandeId } });

    const mappedStatut = mapDeliveryToCommandeStatut(normalized);

    const updated = await prisma.commandeClient.update({
      where: { id: commandeId },
      data: {
        deliveryStatus: normalized as any,
        deliveryNote: deliveryInfo.notes || null,
        deliveryDate: deliveryInfo.deliveryDate || undefined,
        statut: mappedStatut,
        lastTrackingCheck: new Date()
      },
      include: { client: true }
    });

    if (current?.deliveryStatus !== normalized) {
      // Log as RETURN direction if status is RETOUR, otherwise OUTBOUND
      const direction = normalized === 'RETOUR' ? 'RETURN' : 'OUTBOUND';
      await logDeliveryEvent(commandeId, transporter, current?.deliveryStatus || null, normalized, direction);
    }

    if (sendNotifications && normalized === 'DELIVERED') {
      await sendSmsNotification(updated, 'DELIVERED');
    }

    return updated;
  } catch (error) {
    console.error(`Error checking delivery status for order ${commandeId}:`, error);
    return null;
  }
}

// Aramex API integration (SOAP-based)
// Docs: https://www.aramex.com/docs - Shipment Tracking API v1.0
// WSDL: http://ws.aramex.net/shippingapi/tracking/service_1_0.svc?wsdl
// Endpoint: http://ws.aramex.net/shippingapi/tracking/service_1_0.svc
// Note: Can authenticate with Account Number + PIN (username/password optional for some regions)
async function checkAramexTracking(trackingNumber: string) {
  try {
    const username = process.env.ARAMEX_USERNAME || '';
    const password = process.env.ARAMEX_PASSWORD || '';
    const accountNumber = process.env.ARAMEX_ACCOUNT_NUMBER;
    const accountPin = process.env.ARAMEX_ACCOUNT_PIN;
    const accountEntity = process.env.ARAMEX_ACCOUNT_ENTITY || 'TUN'; // Tunisia entity code
    const accountCountry = process.env.ARAMEX_ACCOUNT_COUNTRY || 'TN';
    const version = process.env.ARAMEX_VERSION || 'v1.0';

    if (!accountNumber || !accountPin) {
      console.warn('⚠️  Aramex SOAP credentials not configured (ARAMEX_ACCOUNT_NUMBER, ARAMEX_ACCOUNT_PIN required)');
      return null;
    }

    console.log(`📦 Querying Aramex SOAP API for tracking: ${trackingNumber}`);

    // Build SOAP XML request
    // Some Aramex regions allow auth with just Account Number + PIN (no username/password)
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.aramex.net/ShippingAPI/v1/">
  <soap:Body>
    <ShipmentTrackingRequest xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      <ClientInfo>
        <UserName>${username}</UserName>
        <Password>${password}</Password>
        <Version>${version}</Version>
        <AccountNumber>${accountNumber}</AccountNumber>
        <AccountPin>${accountPin}</AccountPin>
        <AccountEntity>${accountEntity}</AccountEntity>
        <AccountCountryCode>${accountCountry}</AccountCountryCode>
      </ClientInfo>
      <Transaction>
        <Reference1></Reference1>
        <Reference2></Reference2>
        <Reference3></Reference3>
        <Reference4></Reference4>
        <Reference5></Reference5>
      </Transaction>
      <Shipments>
        <string xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${trackingNumber}</string>
      </Shipments>
      <GetLastTrackingUpdateOnly>true</GetLastTrackingUpdateOnly>
    </ShipmentTrackingRequest>
  </soap:Body>
</soap:Envelope>`;

    // Call SOAP API
    const resp = await axios.post(
      'http://ws.aramex.net/shippingapi/tracking/service_1_0.svc',
      soapRequest,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://ws.aramex.net/ShippingAPI/v1/Service_1_0/TrackShipments'
        },
        timeout: 20000,
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true })
      }
    );

    // Parse SOAP response
    const xmlResponse = resp.data;
    
    // Log response for debugging
    console.log('📋 Aramex SOAP Response received');
    
    // Check for errors in SOAP response
    const hasErrorMatch = xmlResponse.match(/<tns:HasErrors>(.*?)<\/tns:HasErrors>/);
    if (hasErrorMatch && hasErrorMatch[1] === 'true') {
      const errorMatch = xmlResponse.match(/<tns:Message>(.*?)<\/tns:Message>/);
      console.error('❌ Aramex API error:', errorMatch ? errorMatch[1] : 'Unknown error');
      return null;
    }
    
    // Extract tracking results from XML (simple parsing)
    // Try both with and without namespace prefix
    const updateCodeMatch = xmlResponse.match(/<(?:tns:)?UpdateCode>(.*?)<\/(?:tns:)?UpdateCode>/);
    const updateDescMatch = xmlResponse.match(/<(?:tns:)?UpdateDescription>(.*?)<\/(?:tns:)?UpdateDescription>/);
    const updateDateMatch = xmlResponse.match(/<(?:tns:)?UpdateDateTime>(.*?)<\/(?:tns:)?UpdateDateTime>/);
    const updateLocMatch = xmlResponse.match(/<(?:tns:)?UpdateLocation>(.*?)<\/(?:tns:)?UpdateLocation>/);
    const commentsMatch = xmlResponse.match(/<(?:tns:)?Comments>(.*?)<\/(?:tns:)?Comments>/);

    const updateCode = updateCodeMatch ? updateCodeMatch[1].trim() : '';
    const updateDescription = updateDescMatch ? updateDescMatch[1].trim() : '';
    const updateDateTime = updateDateMatch ? updateDateMatch[1].trim() : '';
    const updateLocation = updateLocMatch ? updateLocMatch[1].trim() : '';
    const comments = commentsMatch ? commentsMatch[1].trim() : '';
    
    console.log('🔍 Aramex parsed data:', { updateCode, updateDescription, updateDateTime });
    
    // If no tracking data found, return null
    if (!updateDescription && !updateCode) {
      console.warn('⚠️  No tracking updates found in Aramex response');
      return null;
    }

    // Map Aramex status codes to our enum
    // Common codes: DLV=Delivered, PIU=Picked Up, DEL=Delivered, FAD=Failed, CXL=Cancelled
    const statusMap: { [key: string]: string } = {
      'DLV': 'DELIVERED',
      'DEL': 'DELIVERED',
      'PIU': 'PICKED_UP',
      'OFD': 'OUT_FOR_DELIVERY',
      'ITR': 'IN_TRANSIT',
      'PUP': 'PICKED_UP',
      'FAD': 'FAILED',
      'RTN': 'RETOUR',
      'CXL': 'CANCELLED',
      'SHP': 'DELIVERED'  // Shipment charges paid = Delivered
    };

    // Try status code first, then fall back to description
    let status = updateCode ? statusMap[updateCode] : null;
    if (!status) {
      status = normalizeStatus(updateDescription);
    }
    
    // Override: "Shipment charges paid" description always means DELIVERED
    if (updateDescription.toLowerCase().includes('shipment charges paid')) {
      status = 'DELIVERED';
    }
    
    const delivered = status === 'DELIVERED';
    const notes = [updateDescription, comments].filter(Boolean).join(' - ');
    
    console.log(`✅ Aramex tracking for ${trackingNumber}: ${status} (${updateDescription})`);
    
    return {
      status,
      notes,
      deliveryDate: updateDateTime ? new Date(updateDateTime) : undefined,
      isDelivered: delivered,
      location: updateLocation
    };
  } catch (error: any) {
    console.error('❌ Aramex SOAP tracking error:', error.message);
    
    // Detailed error diagnostics
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Cannot reach Aramex SOAP endpoint. Check network connectivity.');
      console.error('   Endpoint: http://ws.aramex.net/shippingapi/tracking/service_1_0.svc');
    } else if (error.response?.status === 500) {
      console.error('🔑 Aramex authentication failed. Check:');
      console.error('   - ARAMEX_ACCOUNT_NUMBER = 153595');
      console.error('   - ARAMEX_ACCOUNT_PIN = 332432');
      if (error.response?.data) {
        console.error('   Response:', error.response.data.substring(0, 200));
      }
    } else if (error.response?.data) {
      // Log SOAP fault details
      const faultMatch = error.response.data.match(/<faultstring>(.*?)<\/faultstring>/);
      if (faultMatch) {
        console.error('   SOAP Fault:', faultMatch[1]);
      }
    }
    
    return null;
  }
}

function mapDeliveryToCommandeStatut(deliveryStatus: string) {
  switch (deliveryStatus) {
    case 'DELIVERED':
      return 'LIVRE';
    case 'OUT_FOR_DELIVERY':
      return 'EN_COURS_LIVRAISON';
    case 'DEPOT_TRANSPORTEUR':
      return 'DEPOT_TRANSPORTEUR' as any;
    case 'RETOUR':
      return 'RETOUR' as any;
    default:
      return 'EN_COURS_LIVRAISON';
  }
}

// First Delivery API integration
// Docs: https://www.firstdeliverygroup.com/api/v2/documentation
// Method: POST /etat with barCode (tracking number is barCode in their system)
async function checkFirstDeliveryTracking(trackingNumber: string) {
  try {
    const apiKey = process.env.FIRST_DELIVERY_API_KEY;
    const baseUrl = process.env.FIRST_DELIVERY_API_URL || 'https://www.firstdeliverygroup.com/api/v2';

    if (!apiKey) {
      console.warn('First Delivery API credentials not configured (FIRST_DELIVERY_API_KEY)');
      return null;
    }

    console.log(`📦 Querying First Delivery API for tracking: ${trackingNumber}`);

    // First Delivery API: Check order status using barCode (tracking number)
    // POST /etat endpoint requires Bearer token
    const resp = await axios.post(
      `${baseUrl}/etat`,
      {
        barCode: trackingNumber // First Delivery uses "barCode" instead of tracking number
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    // First Delivery API response structure:
    // { status: 200, isError: false, message: "...", result: { state: "Livré" | "En attente" | ... } }
    if (!resp.data || resp.data.isError) {
      console.warn(`⚠️ First Delivery error: ${resp.data?.message}`);
      return null;
    }

    const result = resp.data?.result;
    const stateString = result?.state;
    
    if (!stateString) {
      console.warn(`⚠️ First Delivery returned no state for tracking ${trackingNumber}`);
      return null;
    }

    // Map French state strings to our enum (based on First Delivery documentation)
    const stateMap: { [key: string]: string } = {
      'Livré': 'DELIVERED',               // Code 2 - Commande livré
      'livré': 'DELIVERED',
      'En attente': 'PENDING',            // Code 0 - Commande en attente de traitement
      'en attente': 'PENDING',
      'En cours': 'IN_TRANSIT',           // Code 1 - Commande en cours de traitement
      'en cours': 'IN_TRANSIT',
      'En cours de livraison': 'OUT_FOR_DELIVERY', // Code 102 - Pickup en cours d'enlèvement
      'Echange': 'IN_TRANSIT',            // Code 3 - Commande en état d'échange
      'Retour Expéditeur': 'FAILED',      // Code 5 - Commande en retour expéditeur
      'Supprimé': 'CANCELLED',            // Code 6 - Commande annulé par expéditeur
      'Enlevé': 'PICKED_UP',              // Code 103 - Pickup enlevé
      'Demande d\'enlèvement': 'PENDING', // Code 100
      'Retour reçu': 'FAILED'             // Code 30
    };

    const status = stateMap[stateString] || normalizeStatus(stateString);
    const delivered = status === 'DELIVERED';
    
    // First Delivery API doesn't return date fields, so we use current time when status changes to DELIVERED
    let deliveryDate: Date | undefined;
    if (delivered) {
      // Set delivery date to now if the package is delivered
      deliveryDate = new Date();
    }

    console.log(`✅ First Delivery tracking for ${trackingNumber}: ${status} (${stateString})`);
    if (deliveryDate) {
      console.log(`📅 Delivery date: ${deliveryDate.toISOString()}`);
    }

    return {
      status,
      notes: result?.comment || result?.note || stateString,
      deliveryDate,
      isDelivered: delivered
    };
  } catch (error: any) {
    console.error('❌ First Delivery tracking error:', error.response?.data || error.message);
    // Provide debugging info
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('🔑 Check FIRST_DELIVERY_API_KEY is correct');
    }
    if (error.response?.status === 429) {
      console.error('⚠️  Rate limited: First Delivery allows 1 req/sec per rule. Queue requests.');
    }
    return null;
  }
}

// Scheduled job to check all in-transit orders
export async function checkAllTrackingStatuses() {
  try {
    const inTransit = await prisma.commandeClient.findMany({
      where: {
        statut: 'EN_COURS_LIVRAISON',
        transporter: { in: ['ARAMEX', 'FIRST_DELIVERY'] },
        trackingNumber: { not: null }
      }
    });

    for (const commande of inTransit) {
      if (commande.trackingNumber && commande.transporter) {
        await checkDeliveryStatus(
          commande.id,
          commande.transporter,
          commande.trackingNumber,
          true
        );
      }
    }

    console.log(`✅ Checked ${inTransit.length} tracking statuses`);
  } catch (error) {
    console.error('Error in tracking status check:', error);
  }
}

async function sendSmsNotification(commande: any, type: 'DELIVERED' | 'OUT_FOR_DELIVERY') {
  try {
    const smsEnabled = process.env.SMS_ENABLED === 'true';
    if (!smsEnabled) return;

    const to = commande.client?.phone || commande.client?.telephone;
    if (!to) return;

    const body = type === 'DELIVERED'
      ? `Votre commande ${commande.numero} a été livrée. Merci pour votre confiance.`
      : `Votre commande ${commande.numero} est en cours de livraison.`;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (!accountSid || !authToken || !from) {
      console.warn('Twilio SMS not configured');
      return;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', from);
    params.append('Body', body);

    await axios.post(twilioUrl, params.toString(), {
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  } catch (error: any) {
    console.error('SMS notification failed:', error.response?.data || error.message);
  }
}

export default router;
