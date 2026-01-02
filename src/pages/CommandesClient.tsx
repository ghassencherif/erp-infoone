import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, AlertColor, Chip, Menu, MenuItem as MenuItemAction, ListSubheader,
  Autocomplete, Checkbox, FormControlLabel, Paper, Card, Grid, Skeleton, InputAdornment
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar, GridRowParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import PrintIcon from '@mui/icons-material/Print';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import api from '../services/apiClient';
import { OrderTrackingDialog, OrderTrackingData } from '../components/OrderTrackingDialog';

interface Client {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  reference: string | null;
  invoiceableQuantity: number;
}

interface LigneCommande {
  productId?: number;
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
  serialNumberUsed?: string;
}

interface ProductNeedingSubstitution {
  id: number;
  name: string;
  reference: string | null;
  quantity: number;
  invoiceProductId?: number;
}

interface CommandeClient {
  id: number;
  numero: string;
  client: Client;
  date: string;
  dateEcheance?: string;
  statut: string;
  source: string;
  montantHT: number;
  montantTVA: number;
  timbreFiscal: number;
  montantTTC: number;
  notes?: string;
  hasFacture?: boolean;
  factureNumero?: string | null;
  hasBonCommande?: boolean;
  bonCommandeNumero?: string | null;
  hasBonLivraison?: boolean;
  bonLivraisonNumero?: string | null;
}

export default function CommandesClient() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCommande, setEditingCommande] = useState<CommandeClient | null>(null);
  const [formData, setFormData] = useState({
    clientId: '' as number | '',
    date: new Date().toISOString().split('T')[0],
    dateEcheance: '',
    statut: 'EN_ATTENTE_VALIDATION',
    source: 'OTHER',
    notes: '',
    deliveryFree: true
  });
  const [deliveryConfig, setDeliveryConfig] = useState({ fee: 8, tvaRate: 7 });
  const [lignes, setLignes] = useState<LigneCommande[]>([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19, serialNumberUsed: '' }]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCommande, setSelectedCommande] = useState<CommandeClient | null>(null);
  const [openSubstitutionModal, setOpenSubstitutionModal] = useState(false);
  const [productsNeedingSubstitution, setProductsNeedingSubstitution] = useState<ProductNeedingSubstitution[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [openHistory, setOpenHistory] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkInvoicing, setBulkInvoicing] = useState(false);
  const [openBulkPreview, setOpenBulkPreview] = useState(false);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkPreviewLines, setBulkPreviewLines] = useState<any[]>([]);
  const [bulkPreviewTotals, setBulkPreviewTotals] = useState<{ montantHT: number; montantTVA: number; timbreFiscal: number; montantTTC: number } | null>(null);
  const [openTrackingDialog, setOpenTrackingDialog] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<CommandeClient | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<any | null>(null);
  const [openPrintDialog, setOpenPrintDialog] = useState(false);
  const [printTicketOrder, setPrintTicketOrder] = useState<CommandeClient | null>(null);
  const [ticketAlreadyPrinted, setTicketAlreadyPrinted] = useState(false);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [detailsCommande, setDetailsCommande] = useState<CommandeClient | null>(null);
  const [openNewClientModal, setOpenNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', phone: '', address: '', type: 'PARTICULIER', matriculeFiscale: '' });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [openClientModal, setOpenClientModal] = useState(false);
  const [openCommandeModal, setOpenCommandeModal] = useState(false);
  const [selectedBL, setSelectedBL] = useState<any>(null);
  const [openBLModal, setOpenBLModal] = useState(false);
  const [selectedFactureFromChip, setSelectedFactureFromChip] = useState<any>(null);
  const [openFactureModalFromChip, setOpenFactureModalFromChip] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [commandesRes, clientsRes, productsRes, settingsRes] = await Promise.all([
        api.get('/commandes-client'),
        api.get('/clients'),
        api.get('/products'),
        api.get('/settings/company')
      ]);
      setCommandes(commandesRes.data);
      setClients(clientsRes.data);
      setProducts(productsRes.data);
      setAllProducts(productsRes.data);
      const settings = settingsRes.data;
      if (settings?.deliveryFeeDefault !== undefined) {
        setDeliveryConfig({
          fee: Number(settings.deliveryFeeDefault) || 0,
          tvaRate: Number(settings.deliveryTvaRate) || 7
        });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement données', severity: 'error' });
    } finally { setLoading(false); }
  };

  const handleOpenDialog = (commande: CommandeClient | null = null) => {
    if (commande) {
      setEditingCommande(commande);
      setFormData({
        clientId: commande.client.id,
        date: commande.date.split('T')[0],
        dateEcheance: commande.dateEcheance?.split('T')[0] || '',
        statut: commande.statut,
        source: commande.source || 'OTHER',
        notes: commande.notes || '',
        deliveryFree: !commande.deliveryFee || commande.deliveryFee <= 0
      });
      api.get(`/commandes-client/${commande.id}`).then(res => {
        if (res.data.lignes) {
          setLignes(res.data.lignes.map((l: any) => ({
            productId: l.productId,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaireHT: l.prixUnitaireHT,
            tauxTVA: l.tauxTVA
          })));
        }
      });
    } else {
      setEditingCommande(null);
      setFormData({ clientId: '' as number | '', date: new Date().toISOString().split('T')[0], dateEcheance: '', statut: 'EN_ATTENTE_VALIDATION', source: 'OTHER', notes: '', deliveryFree: true });
      setLignes([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => { setOpenDialog(false); setEditingCommande(null); };

  const handleSave = async () => {
    if (formData.clientId === '') {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un client', severity: 'error' });
      return;
    }

    // Require serial number when product has one
    for (const [idx, ligne] of lignes.entries()) {
      if (!ligne.productId) continue;
      const prod = products.find(p => p.id === ligne.productId);
      if (prod?.serialNumber && !ligne.serialNumberUsed?.trim()) {
        setSnackbar({ open: true, message: `Numéro de série requis pour la ligne ${idx + 1}`, severity: 'error' });
        return;
      }
    }

    try {
      const payload = { ...formData, lignes };
      if (editingCommande) {
        await api.put(`/commandes-client/${editingCommande.id}`, payload);
        setSnackbar({ open: true, message: 'Commande modifiée', severity: 'success' });
      } else {
        await api.post('/commandes-client', payload);
        setSnackbar({ open: true, message: 'Commande créée', severity: 'success' });
      }
      setOpenDialog(false);
      loadData();
    } catch (e: any) {
      const errorMsg = e.response?.data?.details 
        ? e.response.data.details.join('\n') 
        : e.response?.data?.error || 'Erreur sauvegarde';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await api.delete(`/commandes-client/${deleteId}`);
      setSnackbar({ open: true, message: 'Commande supprimée', severity: 'success' });
      setOpenDelete(false);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur suppression', severity: 'error' });
    }
  };

  const handleConvertToLivraison = async () => {
    if (!selectedCommande) return;
    try {
      await api.post(`/commandes-client/${selectedCommande.id}/convert-to-livraison`);
      setSnackbar({ open: true, message: 'Commande convertie en Bon de Livraison', severity: 'success' });
      setAnchorEl(null);
      setSelectedCommande(null);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur conversion', severity: 'error' });
    }
  };

  const handleOpenTracking = async (commande: CommandeClient) => {
    try {
      setTrackingLoading(true);
      setTrackingOrder(commande);
      setOpenTrackingDialog(true);

      const res = await api.get(`/tracking/commandes-client/${commande.id}`);
      setTrackingInfo(res.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur récupération tracking', severity: 'error' });
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSubmitTracking = async (data: OrderTrackingData) => {
    if (!trackingOrder) return;
    const res = await api.post(`/tracking/commandes-client/${trackingOrder.id}/start`, data);
    setSnackbar({ open: true, message: 'Livraison lancée', severity: 'success' });
    if (res.data?.printUrl) {
      window.open(res.data.printUrl, '_blank');
    }
    await loadData();
    const refreshed = await api.get(`/tracking/commandes-client/${trackingOrder.id}`);
    setTrackingInfo(refreshed.data);
  };

  const handleStartReturn = async (data: any) => {
    if (!trackingOrder) return;
    try {
      await api.post(`/tracking/commandes-client/${trackingOrder.id}/return-start`, data);
      setSnackbar({ open: true, message: 'Retour démarré', severity: 'success' });
      const refreshed = await api.get(`/tracking/commandes-client/${trackingOrder.id}`);
      setTrackingInfo(refreshed.data);
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur démarrage retour', severity: 'error' });
    }
  };

  const handleCompleteReturn = async (data: any) => {
    if (!trackingOrder) return;
    try {
      await api.post(`/tracking/commandes-client/${trackingOrder.id}/return-complete`, data);
      setSnackbar({ open: true, message: 'Retour stocké', severity: 'success' });
      await loadData();
      const refreshed = await api.get(`/tracking/commandes-client/${trackingOrder.id}`);
      setTrackingInfo(refreshed.data);
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur validation retour', severity: 'error' });
    }
  };

  const handleOpenPrintTicket = async (commande: CommandeClient) => {
    try {
      // Get full order details to check if ticket was already printed
      const res = await api.get(`/commandes-client/${commande.id}`);
      setPrintTicketOrder(res.data);
      setTicketAlreadyPrinted(res.data.printTicket || false);
      setOpenPrintDialog(true);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur récupération commande', severity: 'error' });
    }
  };

  const handlePrintTicket = () => {
    if (printTicketOrder) {
      window.open(`/print-ticket/${printTicketOrder.id}`, '_blank', 'width=400,height=600');
      setOpenPrintDialog(false);
    }
  };

  const handleCreateNewClient = async () => {
    if (!newClientForm.name.trim()) {
      setSnackbar({ open: true, message: 'Veuillez entrer un nom de client', severity: 'error' });
      return;
    }
    try {
      const res = await api.post('/clients', {
        name: newClientForm.name,
        email: newClientForm.email || null,
        phone: newClientForm.phone || null,
        address: newClientForm.address || null,
        type: newClientForm.type,
        matriculeFiscale: newClientForm.type === 'PROFESSIONNEL' ? newClientForm.matriculeFiscale : null
      });
      const createdClient = res.data;
      setClients([...clients, createdClient]);
      setFormData({ ...formData, clientId: createdClient.id });
      setNewClientForm({ name: '', email: '', phone: '', address: '', type: 'PARTICULIER', matriculeFiscale: '' });
      setOpenNewClientModal(false);
      setSnackbar({ open: true, message: `Client "${createdClient.name}" créé avec succès`, severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur création client', severity: 'error' });
    }
  };

  const handleConvertToFacture = async (invoiceSubstitutions?: any[]) => {
    if (!selectedCommande) return;
    try {
      await api.post(`/commandes-client/${selectedCommande.id}/convert-to-facture`, {
        invoiceSubstitutions
      });
      setSnackbar({ open: true, message: 'Commande convertie en Facture', severity: 'success' });
      setAnchorEl(null);
      setSelectedCommande(null);
      setOpenSubstitutionModal(false);
      setProductsNeedingSubstitution([]);
      loadData();
    } catch (e: any) {
      if (e.response?.status === 400 && e.response?.data?.error === 'SUBSTITUTION_REQUIRED') {
        // Open substitution modal
        const needingSubstitution = e.response.data.productsNeedingSubstitution || [];
        setProductsNeedingSubstitution(needingSubstitution.map((p: any) => ({
          ...p,
          invoiceProductId: undefined
        })));
        setOpenSubstitutionModal(true);
      } else {
        setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur conversion', severity: 'error' });
      }
    }
  };

  const addLigne = () => {
    setLignes([...lignes, { designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19, serialNumberUsed: '' }]);
  };

  const removeLigne = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof LigneCommande, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        // Keep designation clean; serial/barcode will be shown separately
        newLignes[index].designation = product.name;
        const pickedPrice = (product as any).price ?? (product as any).cost ?? 0;
        newLignes[index].prixUnitaireHT = Number(Number(pickedPrice).toFixed(3));
        if (!newLignes[index].tauxTVA) newLignes[index].tauxTVA = 19;
        if (!product.serialNumber) {
          newLignes[index].serialNumberUsed = '';
        }
      }
    }
    setLignes(newLignes);
  };

  const changeLigneProduct = (index: number, product: Product | null) => {
    const newLignes = [...lignes];
    if (product) {
      // Calculate HT price from TTC price
      const tvaRate = product.tvaRate || 19;
      const prixHT = product.price / (1 + tvaRate / 100);
      // Keep designation clean; serial/barcode shown separately
      const designation = product.name;
      newLignes[index] = {
        ...newLignes[index],
        productId: product.id,
        designation,
        prixUnitaireHT: Number(Number(prixHT).toFixed(3)),
        tauxTVA: tvaRate,
        serialNumberUsed: product.serialNumber ? '' : undefined
      };
    } else {
      newLignes[index] = {
        ...newLignes[index],
        productId: undefined,
        designation: '',
        prixUnitaireHT: 0,
        serialNumberUsed: ''
      };
    }
    setLignes(newLignes);
  };

  const calculateTotals = () => {
    const deliveryTvaRate = deliveryConfig.tvaRate;
    const deliveryFeeTTC = formData.deliveryFree ? 0 : deliveryConfig.fee;
    const deliveryFee = deliveryFeeTTC / (1 + deliveryTvaRate / 100); // HT portion

    // Products HT/TVA
    const productsHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaireHT), 0);
    const productsTVA = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaireHT * l.tauxTVA / 100), 0);

    // Delivery HT/TVA (TTC provided, convert to HT + TVA)
    const deliveryTVA = deliveryFeeTTC - deliveryFee;

    const montantHT = productsHT + deliveryFee;
    const montantTVA = productsTVA + (formData.deliveryFree ? 0 : deliveryTVA);
    const timbreFiscal = 0;
    const montantTTC = montantHT + montantTVA + timbreFiscal;

    return { montantHT, montantTVA, timbreFiscal, montantTTC, deliveryFee, deliveryFeeTTC, deliveryTVA, deliveryTvaRate, productsHT, productsTVA };
  };

  const totals = calculateTotals();

  const updateSubstitution = (realProductId: number, invoiceProductId: number | undefined) => {
    setProductsNeedingSubstitution(prev =>
      prev.map(p => p.id === realProductId ? { ...p, invoiceProductId } : p)
    );
  };

  const handleConfirmSubstitution = () => {
    // Validate all products have substitutions selected
    const allSelected = productsNeedingSubstitution.every(p => p.invoiceProductId);
    if (!allSelected) {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un produit de substitution pour chaque ligne', severity: 'error' });
      return;
    }

    // Build substitutions array
    const invoiceSubstitutions = productsNeedingSubstitution.map(p => ({
      realProductId: p.id,
      invoicedProductId: p.invoiceProductId!,
      quantity: p.quantity
    }));

    console.log('Sending substitutions:', invoiceSubstitutions);

    // Retry conversion with substitutions
    handleConvertToFacture(invoiceSubstitutions);
  };

  const getAvailableProducts = (realProduct: ProductNeedingSubstitution) => {
    return allProducts
      .filter(p => p.invoiceableQuantity > 0)
      .sort((a, b) => {
        // Products with same reference first
        const aHasSameRef = a.reference && a.reference === realProduct.reference;
        const bHasSameRef = b.reference && b.reference === realProduct.reference;
        if (aHasSameRef && !bHasSameRef) return -1;
        if (!aHasSameRef && bHasSameRef) return 1;
        return a.name.localeCompare(b.name);
      });
  };

  const handleViewHistory = async (clientId: number, clientName: string) => {
    const client = clients.find(c => c.id === clientId);
    setHistoryClient(client || { id: clientId, name: clientName });
    setOpenHistory(true);
    try {
      const res = await api.get(`/clients/${clientId}/orders`);
      setOrderHistory(res.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement historique', severity: 'error' });
      setOrderHistory([]);
    }
  };

  const handleBulkInvoice = async () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Veuillez sélectionner au moins une commande', severity: 'error' });
      return;
    }

    const selectedCommandes = commandes.filter(c => selectedRows.includes(c.id));
    const uninvoiced = selectedCommandes.filter(c => !c.hasFacture);

    if (uninvoiced.length === 0) {
      setSnackbar({ open: true, message: 'Toutes les commandes sélectionnées sont déjà facturées', severity: 'error' });
      return;
    }

    if (uninvoiced.length !== selectedRows.length) {
      setSnackbar({ open: true, message: `${selectedRows.length - uninvoiced.length} commande(s) déjà facturée(s) seront ignorées`, severity: 'warning' });
    }

    setBulkInvoicing(true);
    try {
      await api.post('/factures-client/bulk-invoice', {
        commandeIds: uninvoiced.map(c => c.id)
      });
      
      setSnackbar({ open: true, message: `Facture groupée créée avec succès (${uninvoiced.length} commandes)`, severity: 'success' });
      setSelectedRows([]);
      loadData();
    } catch (error: any) {
      console.error('Erreur création facture groupée:', error);
      setSnackbar({ open: true, message: error.response?.data?.error || 'Erreur lors de la création de la facture groupée', severity: 'error' });
    } finally {
      setBulkInvoicing(false);
    }
  };

  const handleBulkPreview = async () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Sélectionnez des commandes pour prévisualiser', severity: 'error' });
      return;
    }
    const selectedCommandes = commandes.filter(c => selectedRows.includes(c.id));
    const uninvoiced = selectedCommandes.filter(c => !c.hasFacture);
    if (uninvoiced.length === 0) {
      setSnackbar({ open: true, message: 'Toutes les commandes sélectionnées ont déjà une facture', severity: 'error' });
      return;
    }
    setOpenBulkPreview(true);
    setBulkPreviewLoading(true);
    try {
      const res = await api.post('/factures-client/bulk-invoice/simulate', { commandeIds: uninvoiced.map(c => c.id) });
      setBulkPreviewLines(res.data.lignes);
      setBulkPreviewTotals(res.data.totaux);
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur simulation facture', severity: 'error' });
      setOpenBulkPreview(false);
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const confirmBulkInvoice = async () => {
    setBulkInvoicing(true);
    try {
      await api.post('/factures-client/bulk-invoice', { commandeIds: selectedRows });
      setSnackbar({ open: true, message: 'Facture groupée créée', severity: 'success' });
      setOpenBulkPreview(false);
      setSelectedRows([]);
      loadData();
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur création facture', severity: 'error' });
    } finally {
      setBulkInvoicing(false);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_VALIDATION': return 'warning';
      case 'ANNULE': return 'error';
      case 'EN_COURS_PREPARATION': return 'info';
      case 'EN_COURS_LIVRAISON': return 'primary';
      case 'DEPOT_TRANSPORTEUR': return 'info';
      case 'PAS_DE_REPONSE_1': return 'default';
      case 'PAS_DE_REPONSE_2': return 'default';
      case 'INJOIGNABLE_1': return 'default';
      case 'INJOIGNABLE_2': return 'default';
      case 'ANNULE_1': return 'error';
      case 'ANNULE_2': return 'error';
      case 'RETOUR': return 'error';
      case 'LIVRE': return 'success';
      default: return 'default';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_VALIDATION': return 'En attente';
      case 'ANNULE': return 'Annulé';
      case 'EN_COURS_PREPARATION': return 'En préparation';
      case 'EN_COURS_LIVRAISON': return 'En livraison';
      case 'DEPOT_TRANSPORTEUR': return 'Dépôt transporteur';
      case 'PAS_DE_REPONSE_1': return 'Pas de réponse 1';
      case 'PAS_DE_REPONSE_2': return 'Pas de réponse 2';
      case 'INJOIGNABLE_1': return 'Injoignable 1';
      case 'INJOIGNABLE_2': return 'Injoignable 2';
      case 'ANNULE_1': return 'Annulé 1';
      case 'ANNULE_2': return 'Annulé 2';
      case 'RETOUR': return 'Retour';
      case 'LIVRE': return 'Livré';
      default: return statut;
    }
  };

  const columns: GridColDef<CommandeClient>[] = [
    { 
      field: 'numero', 
      headerName: 'Numéro', 
      flex: 0.8, 
      renderCell: (params) => (
        <Typography 
          onClick={() => {
            setDetailsCommande(params.row);
            setOpenDetailsModal(true);
          }}
          sx={{ 
            fontWeight: 'bold', 
            cursor: 'pointer', 
            color: 'primary.main',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {params.value}
        </Typography>
      ) 
    },
    { 
      field: 'clientName', 
      headerName: 'Client', 
      flex: 1, 
      renderCell: (params) => (
        <Typography sx={{ cursor: 'pointer', color: '#B90202', '&:hover': { textDecoration: 'underline' } }} onClick={() => {
          setSelectedClient(params.row?.client);
          setOpenClientModal(true);
        }}>
          {params.row?.client?.name || ''}
        </Typography>
      )
    },
    { 
      field: 'source', 
      headerName: 'Source', 
      flex: 0.7,
      valueGetter: (value) => {
        const sourceLabels: Record<string, string> = {
          'WEBSITE': 'Site Web',
          'FACEBOOK': 'Facebook',
          'INSTAGRAM': 'Instagram',
          'WHATSAPP': 'WhatsApp',
          'PHONE': 'Téléphone',
          'OTHER': 'Autre'
        };
        return sourceLabels[value] || value;
      }
    },
    { 
      field: 'date', 
      headerName: 'Date', 
      flex: 0.8, 
      valueGetter: (_value, row) => row?.date ? new Date(row.date).toLocaleDateString('fr-FR') : '' 
    },
    { 
      field: 'statut', 
      headerName: 'Statut', 
      flex: 0.9,
      renderCell: (params) => {
        const handleStatusChange = async (newStatus: string) => {
          try {
            await api.patch(`/commandes-client/${params.row.id}/status`, { statut: newStatus });
            setSnackbar({ open: true, message: 'Statut modifié', severity: 'success' });
            loadData();
          } catch (e) {
            setSnackbar({ open: true, message: 'Erreur modification statut', severity: 'error' });
          }
        };
        
        return (
          <Select
            value={params.value}
            onChange={(e) => handleStatusChange(e.target.value as string)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="EN_ATTENTE_VALIDATION">En attente validation</MenuItem>
            <MenuItem value="ANNULE">Annulé</MenuItem>
            <MenuItem value="EN_COURS_PREPARATION">En cours préparation</MenuItem>
            <MenuItem value="EN_COURS_LIVRAISON">En cours livraison</MenuItem>
              <MenuItem value="DEPOT_TRANSPORTEUR">Dépôt transporteur</MenuItem>
              <MenuItem value="PAS_DE_REPONSE_1">Pas de réponse 1</MenuItem>
              <MenuItem value="PAS_DE_REPONSE_2">Pas de réponse 2</MenuItem>
              <MenuItem value="INJOIGNABLE_1">Injoignable 1</MenuItem>
              <MenuItem value="INJOIGNABLE_2">Injoignable 2</MenuItem>
              <MenuItem value="ANNULE_1">Annulé 1</MenuItem>
              <MenuItem value="ANNULE_2">Annulé 2</MenuItem>
              <MenuItem value="RETOUR">Retour</MenuItem>
            <MenuItem value="LIVRE">Livré</MenuItem>
          </Select>
        );
      }
    },
    { 
      field: 'montantTTC', 
      headerName: 'Montant TTC', 
      flex: 0.8, 
  valueGetter: (_value, row) => `${row?.montantTTC?.toFixed(3)} TND`
    },
    { 
      field: 'hasBonCommande', 
      headerName: 'BC', 
      flex: 0.7,
      renderCell: (params: { row: CommandeClient }) => {
        if (params.row.hasBonCommande && params.row.bonCommandeNumero) {
          return (
            <Chip 
              label={params.row.bonCommandeNumero} 
              color="info" 
              size="small"
              icon={<DescriptionIcon />}
            />
          );
        }
        return null;
      }
    },
    { 
      field: 'hasBonLivraison', 
      headerName: 'BL', 
      flex: 0.7,
      renderCell: (params: { row: CommandeClient }) => {
        if (params.row.hasBonLivraison && params.row.bonLivraisonNumero) {
          return (
            <Chip 
              label={params.row.bonLivraisonNumero} 
              color="primary" 
              size="small"
              icon={<LocalShippingIcon />}
              onClick={async () => {
                try {
                  const res = await api.get(`/bons-livraison-client?numero=${params.row.bonLivraisonNumero}`);
                  if (res.data && res.data.length > 0) {
                    setSelectedBL(res.data[0]);
                    setOpenBLModal(true);
                  }
                } catch (err) {
                  console.error('Error fetching BL:', err);
                }
              }}
              sx={{ cursor: 'pointer' }}
            />
          );
        }
        return null;
      }
    },
    { 
      field: 'hasFacture', 
      headerName: 'Facture', 
      flex: 0.8,
      renderCell: (params: { row: CommandeClient }) => {
        if (params.row.hasFacture && params.row.factureNumero) {
          return (
            <Chip 
              label={params.row.factureNumero} 
              color="success" 
              size="small"
              icon={<ReceiptIcon />}
              onClick={async () => {
                try {
                  const res = await api.get(`/factures-client?numero=${params.row.factureNumero}`);
                  if (res.data && res.data.length > 0) {
                    setSelectedFactureFromChip(res.data[0]);
                    setOpenFactureModalFromChip(true);
                  }
                } catch (err) {
                  console.error('Error fetching Facture:', err);
                }
              }}
              sx={{ cursor: 'pointer' }}
            />
          );
        }
        return null;
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      flex: 1.2,
      getActions: (params: GridRowParams<CommandeClient>) => {
        const actions = [
          <GridActionsCellItem 
            icon={<HistoryIcon />} 
            label="Historique Client" 
            onClick={() => handleViewHistory(params.row.client.id, params.row.client.name)} 
          />,
          <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />
        ];

        actions.push(
          <GridActionsCellItem 
            icon={<MoreVertIcon />} 
            label="Convertir" 
            onClick={(e) => { 
              setSelectedCommande(params.row); 
              setAnchorEl(e.currentTarget as any); 
            }} 
          />
        );

        return actions;
      }
    }
  ];

  return (
    <DashboardLayout>
      {/* Hero Header */}
      <Paper
        sx={{
          background: 'linear-gradient(135deg, #201B18 0%, #2d2620 100%)',
          color: 'white',
          p: 3,
          mb: 3,
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ShoppingCartIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Commandes Client</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gérez vos commandes clients et créez des factures</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained"
            startIcon={<LocalShippingIcon />}
            onClick={() => navigate('/commandes-client/tracking')}
            sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}
          >
            Suivi de Commande
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: '#B90202', '&:hover': { bgcolor: '#9a0101' } }}>
            Nouvelle Commande
          </Button>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{commandes.length}</Typography>}
            <Typography variant="caption" color="text.secondary">Total Commandes</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{commandes.filter(c => c.statut === 'EN_ATTENTE_VALIDATION').length}</Typography>}
            <Typography variant="caption" color="text.secondary">En Attente</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{commandes.filter(c => !c.hasFacture).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Non Facturées</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{commandes.filter(c => c.hasFacture).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Facturées</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search & Bulk Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <TextField
            fullWidth
            placeholder="Rechercher par numéro de commande ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="small"
          />
        </Paper>
        {selectedRows.length > 0 && (
          <>
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={handleBulkPreview}
              disabled={bulkInvoicing}
            >
              Prévisualiser ({selectedRows.length})
            </Button>
            <Button 
              variant="contained" 
              color="secondary"
              startIcon={<ReceiptIcon />} 
              onClick={handleBulkInvoice}
              disabled={bulkInvoicing}
            >
              Facturer {selectedRows.length}
            </Button>
          </>
        )}
      </Box>

      {/* DataGrid */}
      <Paper sx={{ height: 500, width: '100%' }}>
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height="100%" />
        ) : (
          <DataGrid 
            rows={commandes.filter(c =>
              c.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            columns={columns} 
            loading={loading} 
            getRowId={(row) => row.id} 
            pageSizeOptions={[10, 25]} 
            slots={{ toolbar: GridToolbar }}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selectedRows}
            onRowSelectionModelChange={(newSelection) => {
              setSelectedRows(newSelection as number[]);
            }}
            isRowSelectable={(params: GridRowParams) => !params.row.hasFacture}
            sx={{
              '& .MuiDataGrid-row:hover': {
                bgcolor: '#f9f9f9',
                cursor: 'pointer'
              }
            }}
          />
        )}
      </Paper>

      {/* Bulk preview dialog */}
      <Dialog open={openBulkPreview} onClose={() => setOpenBulkPreview(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Prévisualisation Facture DIVERS</DialogTitle>
        <DialogContent>
          {bulkPreviewLoading ? (
            <Typography>Chargement...</Typography>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell align="right">Qté</TableCell>
                    <TableCell align="right">Prix HT (cost+7%)</TableCell>
                    <TableCell align="right">Montant HT</TableCell>
                    <TableCell align="right">TVA</TableCell>
                    <TableCell align="right">TTC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bulkPreviewLines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{l.designation}</TableCell>
                      <TableCell align="right">{l.quantite}</TableCell>
                      <TableCell align="right">{Number(l.prixUnitaireHT).toFixed(3)} TND</TableCell>
                      <TableCell align="right">{Number(l.montantHT).toFixed(3)} TND</TableCell>
                      <TableCell align="right">{Number(l.montantTVA).toFixed(3)} TND</TableCell>
                      <TableCell align="right">{Number(l.montantTTC).toFixed(3)} TND</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {bulkPreviewTotals && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                  <Typography>HT: <strong>{bulkPreviewTotals.montantHT.toFixed(3)} TND</strong></Typography>
                  <Typography>TVA: <strong>{bulkPreviewTotals.montantTVA.toFixed(3)} TND</strong></Typography>
                  <Typography>Timbre: <strong>{bulkPreviewTotals.timbreFiscal.toFixed(3)} TND</strong></Typography>
                  <Typography>TTC: <strong>{bulkPreviewTotals.montantTTC.toFixed(3)} TND</strong></Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkPreview(false)}>Fermer</Button>
          <Button variant="contained" color="secondary" onClick={confirmBulkInvoice} disabled={bulkPreviewLoading || bulkInvoicing}>Créer la facture</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{editingCommande ? 'Modifier Commande' : 'Nouvelle Commande'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Autocomplete
                options={clients}
                value={clients.find(c => c.id === formData.clientId) || null}
                onChange={(_e, newValue) => setFormData({ ...formData, clientId: newValue ? newValue.id : '' })}
                getOptionLabel={(option) => option?.name || ''}
                filterOptions={(options, state) => {
                  const q = state.inputValue.toLowerCase();
                  return options.filter(o =>
                    (o.name?.toLowerCase().includes(q))
                  );
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.name}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="Client" placeholder="Rechercher client..." fullWidth />
                )}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                clearOnEscape
                disablePortal
                fullWidth
                slotProps={{
                  popper: {
                    sx: { width: '500px !important' }
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={() => setOpenNewClientModal(true)}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Ajouter Client
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Date Échéance" type="date" value={formData.dateEcheance} onChange={e => setFormData({ ...formData, dateEcheance: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value })}>
                  <MenuItem value="EN_ATTENTE_VALIDATION">En attente validation</MenuItem>
                  <MenuItem value="ANNULE">Annulé</MenuItem>
                  <MenuItem value="EN_COURS_PREPARATION">En cours préparation</MenuItem>
                  <MenuItem value="EN_COURS_LIVRAISON">En cours livraison</MenuItem>
                  <MenuItem value="LIVRE">Livré</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                  <MenuItem value="WEBSITE">Site Web</MenuItem>
                  <MenuItem value="FACEBOOK">Facebook</MenuItem>
                  <MenuItem value="INSTAGRAM">Instagram</MenuItem>
                  <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                  <MenuItem value="PHONE">Téléphone</MenuItem>
                  <MenuItem value="OTHER">Autre</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>Lignes</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell>Désignation</TableCell>
                  <TableCell>Qté</TableCell>
                  <TableCell>Prix Unit. TTC</TableCell>
                  <TableCell>TVA %</TableCell>
                  <TableCell>Total TTC</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lignes.map((ligne, index) => {
                  const selectedProduct = products.find(p => p.id === ligne.productId);
                  const hasSerialNumber = selectedProduct?.serialNumber;
                  
                  return (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={products}
                            value={selectedProduct || null}
                            onChange={(_e, newValue) => changeLigneProduct(index, newValue)}
                            getOptionLabel={(option) => {
                              let label = option?.name || '';
                              if (option?.serialNumber) {
                                label += `\nSN: ${option.serialNumber}`;
                              } else if (option?.barcode) {
                                label += `\nCode: ${option.barcode}`;
                              }
                              return label;
                            }}
                            filterOptions={(options, state) => {
                              const q = state.inputValue.toLowerCase();
                              const filtered = options.filter(o =>
                                o.name.toLowerCase().includes(q) ||
                                (o.reference?.toLowerCase().includes(q)) ||
                                (o.serialNumber?.toLowerCase().includes(q)) ||
                                (o.barcode?.toLowerCase().includes(q))
                              );
                              return filtered.slice(0, 100);
                            }}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                            renderOption={(props, option) => (
                              <li {...props} key={option.id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', whiteSpace: 'pre-wrap' }}>
                                  <span>
                                    {option.name}
                                    {option.serialNumber ? `\nSN: ${option.serialNumber}` : option.barcode ? `\nCode: ${option.barcode}` : ''}
                                    {option.reference ? ` (${option.reference})` : ''}
                                  </span>
                                  {typeof option.invoiceableQuantity === 'number' && (
                                    <Chip size="small" label={`Stock: ${option.invoiceableQuantity}`} color={option.invoiceableQuantity > 0 ? 'success' : 'default'} />
                                  )}
                                </Box>
                              </li>
                            )}
                            renderInput={(params) => (
                              <TextField {...params} label="Produit" placeholder="Rechercher produit..." fullWidth />
                            )}
                            disablePortal
                            fullWidth
                            slotProps={{
                              popper: {
                                sx: { width: '600px !important' }
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell><TextField size="small" value={ligne.designation} onChange={e => updateLigne(index, 'designation', e.target.value)} fullWidth /></TableCell>
                        <TableCell><TextField size="small" type="number" value={ligne.quantite} onChange={e => updateLigne(index, 'quantite', Number(e.target.value))} sx={{ width: 80 }} /></TableCell>
                        <TableCell><TextField size="small" type="number" value={(ligne.prixUnitaireHT * (1 + ligne.tauxTVA / 100)).toFixed(3)} onChange={e => {
                          const prixTTC = Number(e.target.value);
                          const prixHT = prixTTC / (1 + ligne.tauxTVA / 100);
                          updateLigne(index, 'prixUnitaireHT', Number(prixHT.toFixed(3)));
                        }} sx={{ width: 100 }} /></TableCell>
                        <TableCell><TextField size="small" type="number" value={ligne.tauxTVA} disabled sx={{ width: 80, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)' } }} /></TableCell>
                        <TableCell>{(ligne.quantite * ligne.prixUnitaireHT * (1 + ligne.tauxTVA / 100)).toFixed(3)}</TableCell>
                        <TableCell><IconButton size="small" onClick={() => removeLigne(index)}><RemoveIcon /></IconButton></TableCell>
                      </TableRow>
                      {hasSerialNumber && (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ pt: 0, pb: 2 }}>
                            <Box sx={{ pl: 2 }}>
                              <TextField
                                size="small"
                                label="Numéro de série"
                                placeholder="Entrez le numéro de série utilisé"
                                value={ligne.serialNumberUsed || ''}
                                onChange={e => updateLigne(index, 'serialNumberUsed', e.target.value)}
                                fullWidth
                                variant="outlined"
                                required
                                sx={{ bgcolor: '#f5f5f5', maxWidth: '400px' }}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={addLigne} startIcon={<AddIcon />}>Ajouter Ligne</Button>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.deliveryFree}
                      onChange={(e) => setFormData({ ...formData, deliveryFree: e.target.checked })}
                    />
                  }
                  label="Livraison gratuite"
                />
                {!formData.deliveryFree && (
                  <Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 'bold' }}>
                    + {Number(deliveryConfig.fee ?? 0).toFixed(3)} TND (frais de livraison)
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                Note: Les frais de livraison par défaut incluent la TVA {deliveryConfig.tvaRate}%. Cochez « Livraison gratuite » pour les retirer.
              </Typography>
            </Box>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography>Montant HT: {totals.montantHT.toFixed(3)} TND</Typography>
              <Typography variant="body2" sx={{ pl: 2, color: 'text.secondary' }}>↳ Produits HT: {totals.productsHT.toFixed(3)} TND</Typography>
              {totals.deliveryFee > 0 && (
                <Typography variant="body2" sx={{ pl: 2, color: 'info.main' }}>↳ Livraison HT ({totals.deliveryTvaRate}%): {totals.deliveryFee.toFixed(3)} TND</Typography>
              )}
              <Typography>TVA totale: {totals.montantTVA.toFixed(3)} TND</Typography>
              <Typography variant="body2" sx={{ pl: 2, color: 'text.secondary' }}>↳ TVA Produits: {totals.productsTVA.toFixed(3)} TND</Typography>
              {totals.deliveryFee > 0 && (
                <Typography variant="body2" sx={{ pl: 2, color: 'info.main' }}>↳ TVA Livraison ({totals.deliveryTvaRate}%): {totals.deliveryTVA.toFixed(3)} TND</Typography>
              )}
              <Typography>Timbre Fiscal: {totals.timbreFiscal.toFixed(3)} TND</Typography>
              <Typography variant="h6">Total TTC: {totals.montantTTC.toFixed(3)} TND</Typography>
            </Box>

            <TextField label="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{editingCommande ? 'Enregistrer' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => { setAnchorEl(null); setSelectedCommande(null); }}
      >
        <MenuItemAction
          onClick={() => {
            if (selectedCommande) {
              handleOpenTracking(selectedCommande);
            }
            setAnchorEl(null);
          }}
        >
          <LocalShippingIcon sx={{ mr: 1, fontSize: 20 }} />
          Suivi livraison
        </MenuItemAction>
        <MenuItemAction
          onClick={() => handleConvertToLivraison()}
          disabled={!!selectedCommande?.hasBonLivraison}
        >
          <LocalShippingIcon sx={{ mr: 1, fontSize: 20 }} />
          Convertir en Bon de Livraison
        </MenuItemAction>
        <MenuItemAction
          onClick={() => handleConvertToFacture()}
          disabled={!!selectedCommande?.hasFacture}
        >
          <ReceiptIcon sx={{ mr: 1, fontSize: 20 }} />
          Convertir en Facture
        </MenuItemAction>
        <MenuItemAction
          onClick={() => {
            if (selectedCommande) {
              window.open(`/print/commande/${selectedCommande.id}`, '_blank');
            }
            setAnchorEl(null);
          }}
        >
          <PrintIcon sx={{ mr: 1, fontSize: 20 }} />
          Imprimer Commande
        </MenuItemAction>
        {selectedCommande?.source === 'OTHER' && (
          <MenuItemAction
            onClick={() => {
              if (selectedCommande) {
                handleOpenPrintTicket(selectedCommande);
              }
              setAnchorEl(null);
            }}
          >
            <ReceiptIcon sx={{ mr: 1, fontSize: 20 }} />
            Imprimer Ticket
          </MenuItemAction>
        )}
        <MenuItemAction
          onClick={() => {
            if (selectedCommande) {
              setDeleteId(selectedCommande.id);
              setOpenDelete(true);
            }
            setAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
          disabled={!!selectedCommande?.hasFacture || !!selectedCommande?.hasBonLivraison || !!selectedCommande?.hasBonCommande}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          Supprimer
        </MenuItemAction>
      </Menu>

      <Dialog open={openNewClientModal} onClose={() => setOpenNewClientModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un nouveau client</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom du client"
              value={newClientForm.name}
              onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
              fullWidth
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Type de Client</InputLabel>
              <Select 
                value={newClientForm.type} 
                onChange={(e) => setNewClientForm({ ...newClientForm, type: e.target.value })}
                label="Type de Client"
              >
                <MenuItem value="PARTICULIER">Particulier</MenuItem>
                <MenuItem value="PROFESSIONNEL">Professionnel</MenuItem>
              </Select>
            </FormControl>
            {newClientForm.type === 'PROFESSIONNEL' && (
              <TextField 
                label="Matricule Fiscal" 
                value={newClientForm.matriculeFiscale} 
                onChange={(e) => setNewClientForm({ ...newClientForm, matriculeFiscale: e.target.value })} 
                fullWidth
              />
            )}
            <TextField
              label="Email"
              type="email"
              value={newClientForm.email}
              onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Téléphone"
              value={newClientForm.phone}
              onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Adresse de livraison"
              value={newClientForm.address}
              onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Rue, Ville, Code postal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewClientModal(false)}>Annuler</Button>
          <Button onClick={handleCreateNewClient} variant="contained">Créer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Supprimer Commande</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer cette commande ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openSubstitutionModal} onClose={() => setOpenSubstitutionModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Substitution de Produits Requise</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Les produits suivants n'ont pas de quantité facturable disponible. Veuillez sélectionner un produit de substitution pour chacun.
          </Alert>
          
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produit Original</TableCell>
                <TableCell>Référence</TableCell>
                <TableCell>Quantité</TableCell>
                <TableCell>Produit à Facturer</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productsNeedingSubstitution.map((product) => {
                const availableProducts = getAvailableProducts(product);
                const sameRefProducts = availableProducts.filter(p => p.reference && p.reference === product.reference);
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.reference || '-'}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small" required error={!product.invoiceProductId}>
                        <Select
                          value={product.invoiceProductId || ''}
                          onChange={(e) => updateSubstitution(product.id, Number(e.target.value))}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>-- Sélectionner un produit --</MenuItem>
                          {sameRefProducts.length > 0 && (
                            <ListSubheader sx={{ bgcolor: 'info.light', color: 'info.contrastText', fontWeight: 'bold' }}>
                              Même référence ({product.reference})
                            </ListSubheader>
                          )}
                          {sameRefProducts.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name} (Dispo: {p.invoiceableQuantity})
                            </MenuItem>
                          ))}
                          {availableProducts.filter(p => !p.reference || p.reference !== product.reference).length > 0 && (
                            <ListSubheader sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}>
                              Autres produits
                            </ListSubheader>
                          )}
                          {availableProducts
                            .filter(p => !p.reference || p.reference !== product.reference)
                            .map(p => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.name} {p.reference ? `[${p.reference}]` : ''} (Dispo: {p.invoiceableQuantity})
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenSubstitutionModal(false); setProductsNeedingSubstitution([]); }}>
            Annuler
          </Button>
          <Button onClick={handleConfirmSubstitution} variant="contained" color="primary">
            Confirmer et Créer la Facture
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openHistory} onClose={() => setOpenHistory(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Historique des Commandes - {historyClient?.name}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {orderHistory.length === 0 ? (
            <Typography variant="body1" sx={{ py: 3, textAlign: 'center' }}>
              Aucune commande pour ce client
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Numéro</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Source</strong></TableCell>
                  <TableCell><strong>Montant TTC</strong></TableCell>
                  <TableCell><strong>Produits</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderHistory.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell><Typography fontWeight={600}>{order.numero}</Typography></TableCell>
                    <TableCell>{new Date(order.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatutLabel(order.statut)} 
                        size="small" 
                        color={getStatutColor(order.statut) as any}
                      />
                    </TableCell>
                    <TableCell>{order.source || '-'}</TableCell>
                    <TableCell><strong>{order.montantTTC?.toFixed(3)} TND</strong></TableCell>
                    <TableCell>
                      {order.lignes?.map((ligne: any, idx: number) => (
                        <Typography key={idx} variant="body2">
                          {ligne.designation} (x{ligne.quantite})
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(false)} variant="contained">Fermer</Button>
        </DialogActions>
      </Dialog>

      <OrderTrackingDialog
        open={openTrackingDialog}
        orderId={trackingOrder?.id || 0}
        orderNumber={trackingOrder?.numero || ''}
        onClose={() => setOpenTrackingDialog(false)}
        onSubmit={handleSubmitTracking}
        onStartReturn={handleStartReturn}
        onCompleteReturn={handleCompleteReturn}
        tracking={trackingInfo || undefined}
      />

      <Dialog open={openPrintDialog} onClose={() => setOpenPrintDialog(false)}>
        <DialogTitle>Imprimer Ticket POS</DialogTitle>
        <DialogContent>
          <Typography>
            {ticketAlreadyPrinted 
              ? "Le ticket a déjà été imprimé. Voulez-vous l'imprimer à nouveau ?" 
              : "Voulez-vous imprimer le ticket ?"}
          </Typography>
          {printTicketOrder && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Commande: {printTicketOrder.numero}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Montant: {printTicketOrder.montantTTC.toFixed(3)} TND
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPrintDialog(false)}>Annuler</Button>
          <Button onClick={handlePrintTicket} variant="contained" color="primary">
            Imprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
          Détails de la Commande - {detailsCommande?.numero}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {detailsCommande && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Header Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Client</Typography>
                  <Typography variant="body1" fontWeight="bold">{detailsCommande.client?.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Statut</Typography>
                  <Chip 
                    label={detailsCommande.statut}
                    color={detailsCommande.statut === 'LIVRE' ? 'success' : detailsCommande.statut === 'ANNULE' ? 'error' : 'default'}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{new Date(detailsCommande.date).toLocaleDateString('fr-FR')}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Source</Typography>
                  <Typography variant="body1">{detailsCommande.source || 'N/A'}</Typography>
                </Box>
              </Box>

              {/* Ligne Items */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Articles</Typography>
                <Table size="small" sx={{ bgcolor: '#f5f5f5' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                      <TableCell fontWeight="bold">Désignation</TableCell>
                      <TableCell align="center">Qté</TableCell>
                      <TableCell align="right">Prix HT</TableCell>
                      <TableCell align="right">TVA %</TableCell>
                      <TableCell align="right">Montant TTC</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailsCommande.lignes?.map((ligne: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{ligne.designation}</TableCell>
                        <TableCell align="center">{ligne.quantite}</TableCell>
                        <TableCell align="right">{ligne.prixUnitaireHT.toFixed(3)}</TableCell>
                        <TableCell align="right">{ligne.tauxTVA}%</TableCell>
                        <TableCell align="right">
                          {(ligne.prixUnitaireHT * ligne.quantite * (1 + ligne.tauxTVA / 100)).toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Totals */}
              <Box sx={{ bgcolor: '#f9f9f9', p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Sous-total HT:</Typography>
                  <Typography fontWeight="bold">{detailsCommande.montantHT.toFixed(3)} TND</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>TVA:</Typography>
                  <Typography fontWeight="bold">{detailsCommande.montantTVA.toFixed(3)} TND</Typography>
                </Box>
                {detailsCommande.timbreFiscal > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Timbre Fiscal:</Typography>
                    <Typography fontWeight="bold">{detailsCommande.timbreFiscal.toFixed(3)} TND</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid', pt: 1, mt: 1 }}>
                  <Typography variant="h6" fontWeight="bold">TOTAL TTC:</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">{detailsCommande.montantTTC.toFixed(3)} TND</Typography>
                </Box>
              </Box>

              {/* Notes */}
              {detailsCommande.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f9f9f9', p: 1, borderRadius: 1 }}>
                    {detailsCommande.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDetailsModal(false)}>Fermer</Button>
          <Button 
            variant="contained" 
            startIcon={<PrintIcon />}
            onClick={() => {
              setOpenDetailsModal(false);
              setPrintTicketOrder(detailsCommande);
              setOpenPrintDialog(true);
            }}
          >
            Imprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Client Details Modal */}
      <Dialog open={openClientModal} onClose={() => setOpenClientModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#201B18', color: 'white' }}>Détails Client</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedClient && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Nom</Typography>
                <Typography>{selectedClient.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Type</Typography>
                <Typography>{(selectedClient as any).type || 'PARTICULIER'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Téléphone</Typography>
                <Typography>{(selectedClient as any).phone || 'Non renseigné'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Adresse</Typography>
                <Typography>{(selectedClient as any).address || 'Non renseignée'}</Typography>
              </Box>
              {(selectedClient as any).matriculeFiscale && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Matricule Fiscal</Typography>
                  <Typography>{(selectedClient as any).matriculeFiscale}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClientModal(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* BL Details Modal */}
      <Dialog open={openBLModal} onClose={() => setOpenBLModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#201B18', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Détails Bon de Livraison
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => {
            if (selectedBL) {
              window.open(`http://localhost:3000/print/bon-livraison/${selectedBL.id}`, '_blank');
            }
          }}>
            Imprimer
          </Button>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedBL && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Numéro</Typography>
                <Typography>{selectedBL.numero}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Client</Typography>
                <Typography>{selectedBL.client?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Date</Typography>
                <Typography>{new Date(selectedBL.date).toLocaleDateString('fr-FR')}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Statut</Typography>
                <Typography>{selectedBL.statut}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Montant TTC</Typography>
                <Typography sx={{ fontSize: '1.1em', fontWeight: 600 }}>{selectedBL.montantTTC?.toFixed(3)} TND</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBLModal(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Facture Details Modal */}
      <Dialog open={openFactureModalFromChip} onClose={() => setOpenFactureModalFromChip(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#201B18', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Détails Facture
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => {
            if (selectedFactureFromChip) {
              window.open(`http://localhost:3000/print/facture/${selectedFactureFromChip.id}`, '_blank');
            }
          }}>
            Imprimer
          </Button>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedFactureFromChip && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Numéro</Typography>
                <Typography>{selectedFactureFromChip.numero}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Client</Typography>
                <Typography>{selectedFactureFromChip.client?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Date</Typography>
                <Typography>{new Date(selectedFactureFromChip.date).toLocaleDateString('fr-FR')}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Statut</Typography>
                <Typography>{selectedFactureFromChip.statut}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Montant TTC</Typography>
                <Typography sx={{ fontSize: '1.1em', fontWeight: 600 }}>{selectedFactureFromChip.montantTTC?.toFixed(3)} TND</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFactureModalFromChip(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
