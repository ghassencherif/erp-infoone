import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { 
  Box, Button, Typography, Chip, Stack, Snackbar, Alert, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Paper
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ReceiptIcon from '@mui/icons-material/Receipt';
import api from '../services/apiClient';

interface TrackingRow {
  id: number;
  numero: string;
  client: { name: string };
  date: string;
  montantTTC: number;
  transporter?: string | null;
  trackingNumber?: string | null;
  deliveryStatus?: string | null;
  deliveryDate?: string | null;
  deliveryNote?: string | null;
  lastTrackingCheck?: string | null;
}

interface ReturnRow {
  id: number;
  numero: string;
  client: { name: string };
  date: string;
  montantTTC: number;
  returnStatus?: string;
  returnTrackingNumber?: string | null;
  returnDate?: string | null;
  returnNote?: string | null;
  factureNumero?: string | null;
  returnCreatedAvoirId?: number | null;
  transporter?: string | null;
  trackingNumber?: string | null;
  deliveryStatus?: string | null;
}

interface EventRow {
  id: number;
  createdAt: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  commande: {
    id: number;
    numero: string;
    client?: { name: string } | null;
    transporter?: string | null;
    deliveryStatus?: string | null;
    deliveryDate?: string | null;
    transporterInvoiced: boolean;
  };
}

interface Client {
  id: number;
  name: string;
  code: string;
}

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  PICKED_UP: 'Collecté',
  IN_TRANSIT: 'En transit',
  OUT_FOR_DELIVERY: 'En cours de livraison',
  DELIVERED: 'Livré',
  FAILED: 'Échec',
  CANCELLED: 'Annulé',
  DEPOT_TRANSPORTEUR: 'Dépôt transporteur',
  RETOUR: 'Retour',
  PAS_DE_REPONSE_1: 'Pas de réponse 1',
  PAS_DE_REPONSE_2: 'Pas de réponse 2',
  INJOIGNABLE_1: 'Injoignable 1',
  INJOIGNABLE_2: 'Injoignable 2',
  ANNULE_1: 'Annulé 1',
  ANNULE_2: 'Annulé 2'
};

const returnStatusLabels: Record<string, string> = {
  PENDING: 'En attente retour',
  IN_TRANSIT: 'Retour en transit',
  STOCKED: 'Retourné en stock'
};

export default function TrackingDashboard() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: '',
    clientName: '',
    useExisting: true
  });
  const [activeTab, setActiveTab] = useState<'tracking' | 'returns' | 'events'>('tracking');
  const [search, setSearch] = useState('');
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnDialog, setReturnDialog] = useState({
    open: false,
    mode: 'start' as 'start' | 'complete',
    row: null as ReturnRow | null,
    tracking: '',
    note: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tracking/commandes-client/in-transit');
      setRows(res.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement tracking', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await api.get('/tracking/events?limit=100');
      setEvents(res.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement notifications', severity: 'error' });
    } finally {
      setEventsLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (e) {
      console.error('Error loading clients', e);
    }
  };

  const loadReturns = async () => {
    setReturnsLoading(true);
    try {
      const res = await api.get('/commandes-client');
      const returnsData = res.data.filter((c: any) => 
        (c.returnStatus && c.returnStatus !== 'PENDING') || c.deliveryStatus === 'RETOUR'
      );
      setReturns(returnsData);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement retours', severity: 'error' });
    } finally {
      setReturnsLoading(false);
    }
  };

  const handleCompleteReturn = async (row: ReturnRow) => {
    setReturnDialog({
      open: true,
      mode: 'complete',
      row,
      tracking: row.returnTrackingNumber || '',
      note: row.returnNote || ''
    });
  };

  const submitReturnAction = async () => {
    if (!returnDialog.row) return;
    const { row, mode, tracking, note } = returnDialog;
    const trackingValue = tracking.trim() || row.returnTrackingNumber || row.trackingNumber || '';
    if (!trackingValue) {
      setSnackbar({ open: true, message: 'Tracking retour requis', severity: 'error' });
      return;
    }

    try {
      await api.post(`/tracking/commandes-client/${row.id}/return-complete`, {
        returnNote: note || '',
        trackingNumber: trackingValue
      });
      setSnackbar({ open: true, message: 'Retour validé en stock', severity: 'success' });
      setReturnDialog({ open: false, mode: 'start', row: null, tracking: '', note: '' });
      loadReturns();
      loadEvents();
    } catch (e: any) {
      const errMsg = e.response?.data?.error || 'Action retour échouée';
      setSnackbar({ open: true, message: errMsg, severity: 'error' });
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { loadClients(); }, []);
  useEffect(() => { loadReturns(); }, []);

  const handleCheck = async (row: TrackingRow) => {
    try {
      await api.post(`/tracking/commandes-client/${row.id}/check`);
      setSnackbar({ open: true, message: 'Statut synchronisé', severity: 'success' });
      load();
    } catch (e) {
      setSnackbar({ open: true, message: 'Échec de synchronisation', severity: 'error' });
    }
  };

  const columns: GridColDef<TrackingRow>[] = [
    { field: 'numero', headerName: 'Numéro', flex: 0.8 },
    { field: 'client', headerName: 'Client', flex: 1, valueGetter: (_v, row) => row.client?.name || '' },
    { field: 'transporter', headerName: 'Transporteur', flex: 0.8 },
    { field: 'trackingNumber', headerName: 'Tracking', flex: 1 },
    { field: 'deliveryStatus', headerName: 'Statut livraison', flex: 1, renderCell: (params) => (
      <Chip label={statusLabels[params.value || 'PENDING'] || params.value} size="small" />
    ) },
    { field: 'lastTrackingCheck', headerName: 'Dernière synchro', flex: 0.9, valueGetter: (_v, row) => row.lastTrackingCheck ? new Date(row.lastTrackingCheck).toLocaleString('fr-FR') : '' },
    { field: 'deliveryDate', headerName: 'Livré le', flex: 0.8, valueGetter: (_v, row) => row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString('fr-FR') : '' },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', flex: 0.7,
      getActions: (params) => [
        <GridActionsCellItem icon={<RefreshIcon />} label="Synchroniser" onClick={() => handleCheck(params.row)} />,
        <GridActionsCellItem icon={<DoneAllIcon />} label="Marquer livré" onClick={async () => {
          await api.post(`/tracking/commandes-client/${params.row.id}/mark-delivered`);
          load();
        }} />
      ]
    }
  ];

  const eventColumns: GridColDef<EventRow>[] = [
    { field: 'createdAt', headerName: 'Date', flex: 0.9, valueGetter: (_v, row) => new Date(row.createdAt).toLocaleString('fr-FR') },
    { field: 'numero', headerName: 'Commande', flex: 0.9, valueGetter: (_v, row) => row.commande?.numero },
    { field: 'client', headerName: 'Client', flex: 1, valueGetter: (_v, row) => row.commande?.client?.name || '' },
    { field: 'transporter', headerName: 'Transporteur', flex: 0.8, valueGetter: (_v, row) => row.commande?.transporter || '' },
    { field: 'tracking', headerName: 'Tracking', flex: 1, valueGetter: (_v, row) => row.commande?.trackingNumber || '' },
    { field: 'newStatus', headerName: 'Statut', flex: 0.8, renderCell: (params) => (
      <Chip label={statusLabels[params.value || 'DELIVERED'] || params.value} size="small" color="success" />
    ) },
    { field: 'delivered', headerName: 'Livré le', flex: 0.8, valueGetter: (_v, row) => row.commande?.deliveryDate ? new Date(row.commande.deliveryDate).toLocaleDateString('fr-FR') : '' },
    { field: 'invoiced', headerName: 'Facturé transporteur', flex: 0.9, renderCell: (params) => (
      params.row.commande?.transporterInvoiced ? <Chip label="Oui" color="success" size="small" /> : <Chip label="Non" size="small" />
    ) }
  ];

  const markInvoiced = async () => {
    if (selectedEvents.length === 0) return;
    
    // Check if any selected orders are already invoiced
    const selectedEventsData = events.filter(e => selectedEvents.includes(e.id));
    const alreadyInvoiced = selectedEventsData.filter(e => e.commande.transporterInvoiced);
    
    if (alreadyInvoiced.length > 0) {
      setSnackbar({ 
        open: true, 
        message: `${alreadyInvoiced.length} commande(s) déjà facturée(s)`, 
        severity: 'warning' 
      });
      return;
    }
    
    // Open dialog to create invoice
    setInvoiceDialog(true);
  };

  const searchTerm = search.trim().toLowerCase();
  const matchText = (values: Array<string | null | undefined>) =>
    !searchTerm || values.some((v) => v && v.toLowerCase().includes(searchTerm));

  const filteredRows = rows.filter((r) =>
    matchText([
      r.numero,
      r.trackingNumber,
      r.client?.name,
      r.transporter || null
    ])
  );

  const filteredReturns = returns.filter((r) =>
    matchText([
      r.numero,
      r.client?.name,
      r.trackingNumber,
      r.returnTrackingNumber,
      r.factureNumero || null,
      r.transporter || null
    ])
  );

  const filteredEvents = events.filter((e) =>
    matchText([
      e.commande?.numero,
      e.commande?.client?.name,
      e.commande?.transporter || null,
      e.commande?.deliveryStatus || null,
      e.commande?.trackingNumber || null
    ])
  );

  const createInvoice = async () => {
    try {
      setInvoicing(true);
      const payload: any = { eventIds: selectedEvents };
      
      if (invoiceForm.useExisting && invoiceForm.clientId) {
        payload.clientId = parseInt(invoiceForm.clientId);
      } else if (!invoiceForm.useExisting && invoiceForm.clientName.trim()) {
        payload.clientName = invoiceForm.clientName.trim();
      } else {
        setSnackbar({ open: true, message: 'Veuillez sélectionner ou saisir un client', severity: 'error' });
        setInvoicing(false);
        return;
      }
      
      const res = await api.post('/tracking/events/create-invoice', payload);
      setSnackbar({ open: true, message: res.data.message, severity: 'success' });
      setSelectedEvents([]);
      setInvoiceDialog(false);
      setInvoiceForm({ clientId: '', clientName: '', useExisting: true });
      loadEvents();
    } catch (e: any) {
      const errMsg = e.response?.data?.error || 'Échec de création de facture';
      setSnackbar({ open: true, message: errMsg, severity: 'error' });
    } finally {
      setInvoicing(false);
    }
  };

  const TabPanel = ({ value, index, children }: { value: string; index: string; children: React.ReactNode }) => (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );

  return (
    <DashboardLayout>
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h5">Suivi des livraisons</Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <TextField
            size="small"
            placeholder="Rechercher (tracking, commande, facture, client)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 360 }}
          />
        </Box>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mt: 2 }}
        >
          <Tab value="tracking" label="En cours" />
          <Tab value="returns" label="Retours" />
          <Tab value="events" label="Notifications livrées" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index="tracking">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading} variant="contained" color="primary">
            Rafraîchir
          </Button>
        </Box>
        <div style={{ height: 520, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            pageSizeOptions={[10, 25]}
          />
        </div>
      </TabPanel>

      <Dialog
        open={returnDialog.open}
        onClose={() => setReturnDialog({ open: false, mode: 'start', row: null, tracking: '', note: '' })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Valider retour en stock</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Tracking retour"
            value={returnDialog.tracking}
            required
            onChange={(e) => setReturnDialog({ ...returnDialog, tracking: e.target.value })}
            helperText="Tracking retour requis pour valider le retour"
          />
          <TextField
            label="Note retour"
            value={returnDialog.note}
            onChange={(e) => setReturnDialog({ ...returnDialog, note: e.target.value })}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialog({ open: false, mode: 'start', row: null, tracking: '', note: '' })}>
            Annuler
          </Button>
          <Button variant="contained" onClick={submitReturnAction}>
            Valider retour
          </Button>
        </DialogActions>
      </Dialog>

      <TabPanel value={activeTab} index="returns">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={loadReturns} disabled={returnsLoading} variant="contained" color="primary">
            Rafraîchir
          </Button>
        </Box>
        <div style={{ height: 460, width: '100%' }}>
          <DataGrid
            rows={filteredReturns}
            columns={[
              { field: 'numero', headerName: 'Numéro', width: 120 },
              { field: 'client', headerName: 'Client', width: 180, valueGetter: (_v, row) => row.client?.name || '' },
              { field: 'date', headerName: 'Date commande', width: 120, valueFormatter: (value) => new Date(value).toLocaleDateString('fr-FR') },
              { field: 'transporter', headerName: 'Transporteur', width: 120 },
              { field: 'trackingNumber', headerName: 'Tracking livraison', width: 150 },
              { field: 'returnStatus', headerName: 'Statut retour', width: 150, renderCell: (params) => (
                <Chip label={returnStatusLabels[params.value] || params.value} size="small" color={params.value === 'STOCKED' ? 'success' : 'warning'} />
              )},
              { field: 'returnTrackingNumber', headerName: 'Tracking retour', width: 150 },
              { field: 'returnDate', headerName: 'Date retour', width: 140, valueFormatter: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-' },
              { field: 'factureNumero', headerName: 'Facture', width: 120 },
              { field: 'returnCreatedAvoirId', headerName: 'Avoir ID', width: 100 },
              { field: 'montantTTC', headerName: 'Montant TTC', width: 120, valueFormatter: (value) => `${value.toFixed(3)} TND` },
              {
                field: 'actions',
                headerName: 'Actions',
                width: 200,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => {
                  const canComplete = (row.returnStatus !== 'STOCKED') && (row.deliveryStatus === 'RETOUR' || row.returnStatus === 'IN_TRANSIT');
                  return (
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      onClick={() => handleCompleteReturn(row)}
                      disabled={!canComplete}
                    >
                      Valider retour en stock
                    </Button>
                  );
                }
              }
            ]}
            getRowId={(row) => row.id}
            loading={returnsLoading}
            pageSizeOptions={[10, 25]}
          />
        </div>
      </TabPanel>

      <TabPanel value={activeTab} index="events">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={loadEvents} disabled={eventsLoading} variant="contained" color="primary">
            Rafraîchir
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<ReceiptIcon />}
            onClick={markInvoiced}
            disabled={selectedEvents.length === 0 || invoicing}
          >
            Créer facture transporteur
          </Button>
        </Box>

        <div style={{ height: 460, width: '100%' }}>
          <DataGrid
            rows={filteredEvents}
            columns={eventColumns}
            getRowId={(row) => row.id}
            loading={eventsLoading}
            checkboxSelection
            rowSelectionModel={selectedEvents}
            onRowSelectionModelChange={(sel) => setSelectedEvents(sel as number[])}
            isRowSelectable={(params) => !params.row.commande?.transporterInvoiced}
            pageSizeOptions={[10, 25]}
          />
        </div>
      </TabPanel>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={invoiceDialog} onClose={() => setInvoiceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer facture transporteur</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedEvents.length} livraison(s) sélectionnée(s)
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Type de client</InputLabel>
            <Select
              value={invoiceForm.useExisting ? 'existing' : 'new'}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, useExisting: e.target.value === 'existing' })}
              label="Type de client"
            >
              <MenuItem value="existing">Client existant</MenuItem>
              <MenuItem value="new">Nouveau client</MenuItem>
            </Select>
          </FormControl>

          {invoiceForm.useExisting ? (
            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
                value={invoiceForm.clientId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}
                label="Client"
              >
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label="Nom du nouveau client"
              value={invoiceForm.clientName}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
              placeholder="Ex: ARAMEX, First Delivery"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={createInvoice} disabled={invoicing}>
            Créer facture
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
