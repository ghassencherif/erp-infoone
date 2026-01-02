import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, AlertColor,
  Autocomplete, Chip, Paper, Card, Grid, Skeleton, InputAdornment
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar, GridRowParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import PrintIcon from '@mui/icons-material/Print';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import api from '../services/apiClient';
import { numberToWordsFr } from '../utils/numberToWords';

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

interface LigneFacture {
  productId?: number;
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
  invoiceProductId?: number; // The product to use for invoice
  needsSubstitution?: boolean;
}

interface FactureClient {
  id: number;
  numero: string;
  client: Client;
  date: string;
  dateEcheance?: string;
  statut: string;
  montantHT: number;
  montantTVA: number;
  timbreFiscal: number;
  montantTTC: number;
  notes?: string;
  sourceType?: 'COMMANDE' | 'BC' | 'BL' | null;
  sourceNumero?: string | null;
}

export default function FacturesClient() {
  const [factures, setFactures] = useState<FactureClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFacture, setEditingFacture] = useState<FactureClient | null>(null);
  const [formData, setFormData] = useState({
    clientId: '' as number | '',
    date: new Date().toISOString().split('T')[0],
    dateEcheance: '',
    statut: 'BROUILLON',
    notes: ''
  });
  const [lignes, setLignes] = useState<LigneFacture[]>([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const [openClientDialog, setOpenClientDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [openClientModal, setOpenClientModal] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<FactureClient | null>(null);
  const [openFactureModal, setOpenFactureModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: 'PROFESSIONNEL' as 'PROFESSIONNEL' | 'PARTICULIER',
    matriculeFiscale: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facturesRes, clientsRes, productsRes] = await Promise.all([
        api.get('/factures-client'),
        api.get('/clients'),
        api.get('/products')
      ]);
      setFactures(facturesRes.data);
      setClients(clientsRes.data);
      setProducts(productsRes.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement données', severity: 'error' });
    } finally { setLoading(false); }
  };

  const handleOpenDialog = (facture: FactureClient | null = null) => {
    if (facture) {
      setEditingFacture(facture);
      setFormData({
        clientId: facture.client.id,
        date: facture.date.split('T')[0],
        dateEcheance: facture.dateEcheance?.split('T')[0] || '',
        statut: facture.statut,
        notes: facture.notes || ''
      });
      // Load lignes from API
      api.get(`/factures-client/${facture.id}`).then(res => {
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
      setEditingFacture(null);
      setFormData({ clientId: '' as number | '', date: new Date().toISOString().split('T')[0], dateEcheance: '', statut: 'BROUILLON', notes: '' });
      setLignes([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => { setOpenDialog(false); setEditingFacture(null); };

  const handleOpenClientDialog = () => {
    setOpenClientDialog(true);
  };

  const handleCloseClientDialog = () => {
    setOpenClientDialog(false);
    setNewClientData({
      name: '',
      email: '',
      phone: '',
      address: '',
      type: 'PROFESSIONNEL',
      matriculeFiscale: ''
    });
  };

  const handleSaveClient = async () => {
    if (!newClientData.name) {
      setSnackbar({ open: true, message: 'Le nom du client est requis', severity: 'error' });
      return;
    }

    try {
      const res = await api.post('/clients', {
        name: newClientData.name,
        email: newClientData.email || null,
        phone: newClientData.phone || null,
        address: newClientData.address || null,
        type: newClientData.type,
        matriculeFiscale: newClientData.type === 'PROFESSIONNEL' ? newClientData.matriculeFiscale : null
      });
      setClients([...clients, res.data]);
      setFormData({ ...formData, clientId: res.data.id });
      setSnackbar({ open: true, message: 'Client créé avec succès', severity: 'success' });
      handleCloseClientDialog();
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur lors de la création du client', severity: 'error' });
    }
  };

  const handleSave = async () => {
    if (formData.clientId === '') {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un client', severity: 'error' });
      return;
    }
    
    // Check for lines that need substitution but don't have one selected
    const missingSubstitutions = lignes.filter(l => l.needsSubstitution && !l.invoiceProductId);
    if (missingSubstitutions.length > 0) {
      setSnackbar({ 
        open: true, 
        message: 'Certains produits nécessitent un produit de substitution pour facturation', 
        severity: 'error' 
      });
      return;
    }
    
    try {
      // Build invoice substitutions array
      const invoiceSubstitutions = lignes
        .filter(l => l.needsSubstitution && l.productId && l.invoiceProductId && l.productId !== l.invoiceProductId)
        .map(l => ({
          realProductId: l.productId,
          invoicedProductId: l.invoiceProductId,
          quantity: l.quantite
        }));
      
      const payload = { 
        ...formData, 
        lignes: lignes.map(l => ({
          productId: l.productId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          tauxTVA: l.tauxTVA
        })),
        invoiceSubstitutions: invoiceSubstitutions.length > 0 ? invoiceSubstitutions : undefined
      };
      
      if (editingFacture) {
        await api.put(`/factures-client/${editingFacture.id}`, payload);
        setSnackbar({ open: true, message: 'Facture modifiée', severity: 'success' });
      } else {
        await api.post('/factures-client', payload);
        setSnackbar({ open: true, message: 'Facture créée', severity: 'success' });
      }
      setOpenDialog(false);
      loadData();
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || 'Erreur sauvegarde';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await api.delete(`/factures-client/${deleteId}`);
      setSnackbar({ open: true, message: 'Facture supprimée', severity: 'success' });
      setOpenDelete(false);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur suppression', severity: 'error' });
    }
  };

  const addLigne = () => {
    setLignes([...lignes, { designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  };

  const removeLigne = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof LigneFacture, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        // Calculate HT price from TTC price
        const tvaRate = product.tvaRate || 19;
        const prixHT = product.price / (1 + tvaRate / 100);
        // Format: Product name with serial/barcode underneath if exists
        let designation = product.name;
        if (product.serialNumber) {
          designation += `\nSN: ${product.serialNumber}`;
        } else if (product.barcode) {
          designation += `\nCode barre: ${product.barcode}`;
        }
        newLignes[index].designation = designation;
        newLignes[index].prixUnitaireHT = prixHT;
        newLignes[index].tauxTVA = tvaRate;
        
        // Check if product has invoiceable quantity
        if (product.invoiceableQuantity === 0) {
          newLignes[index].needsSubstitution = true;
          newLignes[index].invoiceProductId = undefined;
          
          // Try to find a substitute with same reference
          const substitute = products.find(p => 
            p.reference === product.reference && 
            p.reference !== null &&
            p.invoiceableQuantity > 0 &&
            p.id !== product.id
          );
          
          if (substitute) {
            newLignes[index].invoiceProductId = substitute.id;
          }
        } else {
          newLignes[index].needsSubstitution = false;
          newLignes[index].invoiceProductId = product.id;
        }
      }
    }
    setLignes(newLignes);
  };

  const calculateTotals = () => {
    const montantHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaireHT), 0);
    const montantTVA = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaireHT * l.tauxTVA / 100), 0);
    const timbreFiscal = 1.0;
    const montantTTC = montantHT + montantTVA + timbreFiscal;
    return { montantHT, montantTVA, timbreFiscal, montantTTC };
  };

  const totals = calculateTotals();

  const columns: GridColDef<FactureClient>[] = [
    { field: 'numero', headerName: 'Numéro', flex: 0.8, renderCell: (params) => (
      <Typography fontWeight={600} sx={{ cursor: 'pointer', color: '#B90202', '&:hover': { textDecoration: 'underline' } }} onClick={() => {
        setSelectedFacture(params.row);
        setOpenFactureModal(true);
      }}>
        {params.value}
      </Typography>
    )},
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
      field: 'date', 
      headerName: 'Date', 
      flex: 0.8, 
      valueGetter: (_value, row) => row?.date ? new Date(row.date).toLocaleDateString('fr-FR') : '' 
    },
    { field: 'statut', headerName: 'Statut', flex: 0.7 },
    { 
      field: 'sourceDocument', 
      headerName: 'Source', 
      flex: 0.8,
      renderCell: (params: { row: FactureClient }) => {
        if (params.row.sourceType && params.row.sourceNumero) {
          const { sourceType, sourceNumero } = params.row;
          let color: 'warning' | 'info' | 'primary' = 'info';
          let icon = <DescriptionIcon />;
          
          if (sourceType === 'COMMANDE') {
            color = 'warning';
            icon = <ShoppingCartIcon />;
          } else if (sourceType === 'BC') {
            color = 'info';
            icon = <DescriptionIcon />;
          } else if (sourceType === 'BL') {
            color = 'primary';
            icon = <LocalShippingIcon />;
          }
          
          return (
            <Chip 
              label={sourceNumero} 
              color={color} 
              size="small"
              icon={icon}
            />
          );
        }
        return null;
      }
    },
    { 
      field: 'montantTTC', 
      headerName: 'Montant TTC', 
      flex: 0.8, 
      valueGetter: (_value, row) => `${row?.montantTTC?.toFixed(3)} TND`
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      flex: 0.7,
      getActions: (params: GridRowParams<FactureClient>) => [
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />,
        <GridActionsCellItem icon={<PrintIcon />} label="Imprimer" onClick={() => window.open(`/print/facture/${params.row.id}`, '_blank')} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => { setDeleteId(params.row.id); setOpenDelete(true); }} />
      ]
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
          <DescriptionIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Factures Client</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gérez vos factures clients et suivi des paiements</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}>
          Nouvelle Facture
        </Button>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{factures.length}</Typography>}
            <Typography variant="caption" color="text.secondary">Total Factures</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{factures.filter(f => f.statut === 'BROUILLON').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Brouillons</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{factures.filter(f => f.statut === 'EN_ATTENTE').length}</Typography>}
            <Typography variant="caption" color="text.secondary">En Attente Paiement</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{factures.filter(f => f.statut === 'PAYEE').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Payées</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par numéro de facture ou client..."
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

      {/* DataGrid */}
      <Paper sx={{ height: 500, width: '100%' }}>
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height="100%" />
        ) : (
          <DataGrid 
            rows={factures.filter(f =>
              f.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              f.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            columns={columns} 
            loading={loading} 
            getRowId={(row) => row.id} 
            pageSizeOptions={[10, 25]} 
            slots={{ toolbar: GridToolbar }}
            sx={{
              '& .MuiDataGrid-row:hover': {
                bgcolor: '#f9f9f9',
                cursor: 'pointer'
              }
            }}
          />
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{editingFacture ? 'Modifier Facture' : 'Nouvelle Facture'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Autocomplete
                options={clients}
                value={clients.find(c => c.id === formData.clientId) || null}
                onChange={(_e, newValue) => setFormData({ ...formData, clientId: newValue ? newValue.id : '' })}
                getOptionLabel={(option) => option?.name || ''}
                filterOptions={(options, state) => {
                  const q = state.inputValue.toLowerCase();
                  return options.filter(o => o.name?.toLowerCase().includes(q));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Client" placeholder="Rechercher client..." fullWidth />
                )}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                clearOnEscape
                disablePortal
                fullWidth
                sx={{ flex: 1 }}
                slotProps={{
                  popper: {
                    sx: { width: '500px !important' }
                  }
                }}
              />
              <Button 
                variant="outlined" 
                startIcon={<PersonAddIcon />}
                onClick={handleOpenClientDialog}
                sx={{ mt: 0.5, minWidth: 160 }}
              >
                Nouveau Client
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Date Échéance" type="date" value={formData.dateEcheance} onChange={e => setFormData({ ...formData, dateEcheance: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value })}>
                <MenuItem value="BROUILLON">Brouillon</MenuItem>
                <MenuItem value="ENVOYE">Envoyé</MenuItem>
                <MenuItem value="PAYE">Payé</MenuItem>
                <MenuItem value="ANNULE">Annulé</MenuItem>
              </Select>
            </FormControl>

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
                  const availableInvoiceProducts = products.filter(p => p.invoiceableQuantity > 0);
                  const sameReferenceProducts = selectedProduct?.reference 
                    ? availableInvoiceProducts.filter(p => p.reference === selectedProduct.reference && p.id !== selectedProduct.id)
                    : [];
                  
                  return (
                    <>
                      <TableRow key={index}>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={products}
                            value={products.find(p => p.id === ligne.productId) || null}
                            onChange={(_e, newValue) => {
                              updateLigne(index, 'productId', newValue ? newValue.id : undefined as any);
                            }}
                            getOptionLabel={(option) => option?.name || ''}
                            filterOptions={(options, state) => {
                              const q = state.inputValue.toLowerCase();
                              const filtered = options.filter(o =>
                                o.name.toLowerCase().includes(q) ||
                                (o.reference?.toLowerCase().includes(q))
                              );
                              return filtered.slice(0, 100);
                            }}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                            renderOption={(props, option) => (
                              <li {...props} key={option.id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                  <span>
                                    {option.name}
                                    {option.reference ? ` (${option.reference})` : ''}
                                  </span>
                                  {typeof option.invoiceableQuantity === 'number' && (
                                    <Chip size="small" label={`Facturable: ${option.invoiceableQuantity}`} color={option.invoiceableQuantity > 0 ? 'success' : 'default'} />
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
                      {ligne.needsSubstitution && (
                        <TableRow key={`${index}-sub`}>
                          <TableCell colSpan={7} sx={{ bgcolor: 'warning.light', p: 2 }}>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                              ⚠️ Ce produit n'a pas de quantité facturable disponible. 
                              Veuillez sélectionner un produit de substitution pour la facturation.
                            </Alert>
                            <FormControl fullWidth size="small">
                              <InputLabel>Produit pour facturation</InputLabel>
                              <Select
                                value={ligne.invoiceProductId || ''}
                                onChange={e => updateLigne(index, 'invoiceProductId', Number(e.target.value))}
                                label="Produit pour facturation"
                              >
                                <MenuItem value="">-- Sélectionner --</MenuItem>
                                {sameReferenceProducts.length > 0 && (
                                  <>
                                    <MenuItem disabled sx={{ fontWeight: 'bold', bgcolor: 'info.light' }}>
                                      Même référence ({selectedProduct?.reference})
                                    </MenuItem>
                                    {sameReferenceProducts.map(p => (
                                      <MenuItem key={p.id} value={p.id}>
                                        {p.name} (Facturable: {p.invoiceableQuantity})
                                      </MenuItem>
                                    ))}
                                  </>
                                )}
                                {sameReferenceProducts.length > 0 && availableInvoiceProducts.length > sameReferenceProducts.length && (
                                  <MenuItem disabled sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>
                                    Autres produits
                                  </MenuItem>
                                )}
                                {availableInvoiceProducts
                                  .filter(p => !sameReferenceProducts.includes(p))
                                  .map(p => (
                                    <MenuItem key={p.id} value={p.id}>
                                      {p.name} (Facturable: {p.invoiceableQuantity})
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={addLigne} startIcon={<AddIcon />}>Ajouter Ligne</Button>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography>Montant HT: {totals.montantHT.toFixed(3)} TND</Typography>
              <Typography>TVA: {totals.montantTVA.toFixed(3)} TND</Typography>
              <Typography>Timbre Fiscal: {totals.timbreFiscal.toFixed(3)} TND</Typography>
              <Typography variant="h6">Total TTC: {totals.montantTTC.toFixed(3)} TND</Typography>
              <Typography 
                variant="body2" 
                sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}
              >
                Arrêté la présente facture à la somme de : {numberToWordsFr(totals.montantTTC)}
              </Typography>
            </Box>

            <TextField label="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{editingFacture ? 'Enregistrer' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Supprimer Facture</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer cette facture ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openClientDialog} onClose={handleCloseClientDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau Client</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nom *"
              value={newClientData.name}
              onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={newClientData.type}
                onChange={(e) => setNewClientData({ ...newClientData, type: e.target.value as 'PROFESSIONNEL' | 'PARTICULIER' })}
                label="Type"
              >
                <MenuItem value="PROFESSIONNEL">Professionnel</MenuItem>
                <MenuItem value="PARTICULIER">Particulier</MenuItem>
              </Select>
            </FormControl>
            {newClientData.type === 'PROFESSIONNEL' && (
              <TextField
                label="Matricule Fiscal"
                value={newClientData.matriculeFiscale}
                onChange={(e) => setNewClientData({ ...newClientData, matriculeFiscale: e.target.value })}
                fullWidth
              />
            )}
            <TextField
              label="Email"
              value={newClientData.email}
              onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
              fullWidth
              type="email"
            />
            <TextField
              label="Téléphone"
              value={newClientData.phone}
              onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Adresse"
              value={newClientData.address}
              onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClientDialog}>Annuler</Button>
          <Button onClick={handleSaveClient} variant="contained">Créer</Button>
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

      {/* Facture Details Modal */}
      <Dialog open={openFactureModal} onClose={() => setOpenFactureModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#201B18', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Détails Facture
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => {
            if (selectedFacture) {
              window.open(`http://localhost:3000/print/facture/${selectedFacture.id}`, '_blank');
            }
          }}>
            Imprimer
          </Button>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedFacture && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Numéro</Typography>
                <Typography>{selectedFacture.numero}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Client</Typography>
                <Typography>{selectedFacture.client?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Date</Typography>
                <Typography>{new Date(selectedFacture.date).toLocaleDateString('fr-FR')}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Statut</Typography>
                <Typography>{selectedFacture.statut}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Montant TTC</Typography>
                <Typography sx={{ fontSize: '1.1em', fontWeight: 600 }}>{selectedFacture.montantTTC.toFixed(3)} TND</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFactureModal(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
