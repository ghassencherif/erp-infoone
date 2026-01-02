// Reset database data while preserving Client and Fournisseur
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAll(label, fn) {
  try {
    const res = await fn();
    console.log(`✅ Deleted from ${label}:`, res.count);
    return res.count || 0;
  } catch (e) {
    console.error(`❌ Failed deleting ${label}:`, e.message);
    return 0;
  }
}

async function reset() {
  console.log('⚠️  RESET START — wiping data except Client and Fournisseur');

  let total = 0;

  // Logs and misc first
  total += await deleteAll('PrestashopSyncLog', () => prisma.prestashopSyncLog.deleteMany({}));
  total += await deleteAll('DeliveryEvent', () => prisma.deliveryEvent.deleteMany({}));
  total += await deleteAll('InvoiceSubstitution', () => prisma.invoiceSubstitution.deleteMany({}));
  total += await deleteAll('StockAvailable', () => prisma.stockAvailable.deleteMany({}));

  // Client-side documents
  total += await deleteAll('LigneAvoirClient', () => prisma.ligneAvoirClient.deleteMany({}));
  total += await deleteAll('AvoirClient', () => prisma.avoirClient.deleteMany({}));

  total += await deleteAll('LigneFactureClient', () => prisma.ligneFactureClient.deleteMany({}));
  total += await deleteAll('FactureClient', () => prisma.factureClient.deleteMany({}));

  total += await deleteAll('LigneBonLivraisonClient', () => prisma.ligneBonLivraisonClient.deleteMany({}));
  total += await deleteAll('BonLivraisonClient', () => prisma.bonLivraisonClient.deleteMany({}));

  total += await deleteAll('LigneBonCommandeClient', () => prisma.ligneBonCommandeClient.deleteMany({}));
  total += await deleteAll('BonCommandeClient', () => prisma.bonCommandeClient.deleteMany({}));

  total += await deleteAll('LigneCommandeClient', () => prisma.ligneCommandeClient.deleteMany({}));
  total += await deleteAll('CommandeClient', () => prisma.commandeClient.deleteMany({}));

  total += await deleteAll('LigneDevisClient', () => prisma.ligneDevisClient.deleteMany({}));
  total += await deleteAll('DevisClient', () => prisma.devisClient.deleteMany({}));

  // Supplier-side documents
  total += await deleteAll('LigneFactureFournisseur', () => prisma.ligneFactureFournisseur.deleteMany({}));
  total += await deleteAll('FactureFournisseur', () => prisma.factureFournisseur.deleteMany({}));

  total += await deleteAll('LigneBonDeReception', () => prisma.ligneBonDeReception.deleteMany({}));
  total += await deleteAll('BonDeReception', () => prisma.bonDeReception.deleteMany({}));

  total += await deleteAll('LigneBonDeCommande', () => prisma.ligneBonDeCommande.deleteMany({}));
  total += await deleteAll('BonDeCommande', () => prisma.bonDeCommande.deleteMany({}));

  total += await deleteAll('LigneFactureAvoir', () => prisma.ligneFactureAvoir.deleteMany({}));
  total += await deleteAll('FactureAvoir', () => prisma.factureAvoir.deleteMany({}));

  total += await deleteAll('LigneDevis', () => prisma.ligneDevis.deleteMany({}));
  total += await deleteAll('Devis', () => prisma.devis.deleteMany({}));

  total += await deleteAll('HistoriqueAchatFournisseur', () => prisma.historiqueAchatFournisseur.deleteMany({}));

  // Products last (after lines and stock)
  total += await deleteAll('Product', () => prisma.product.deleteMany({}));

  console.log('✅ RESET COMPLETE — total rows deleted:', total);
  console.log('ℹ️  Preserved tables: Client, Fournisseur, User, CompanySetting');
}

reset()
  .catch(e => { console.error('Reset failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
