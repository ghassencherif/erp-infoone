import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, AlertColor, Menu, MenuItem as MenuItemAction,
  Autocomplete, Chip, Paper, Card, Grid, Skeleton, InputAdornment
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar, GridRowParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import PrintIcon from '@mui/icons-material/Print';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import api from '../services/apiClient';

interface Client {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  reference?: string | null;
  invoiceableQuantity?: number;
}

interface LigneDevis {
  productId?: number;
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
}

interface DevisClient {
  id: number;
  numero: string;
  client: Client;
  date: string;
  dateValidite?: string;
  statut: string;
  montantHT: number;
  montantTVA: number;
  timbreFiscal: number;
  montantTTC: number;
  notes?: string;
}

export default function DevisClient() {
  const [devis, setDevis] = useState<DevisClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDevis, setEditingDevis] = useState<DevisClient | null>(null);
  const [formData, setFormData] = useState({
    clientId: '' as number | '',
    date: new Date().toISOString().split('T')[0],
    dateValidite: '',
    statut: 'BROUILLON',
    notes: ''
  });
  const [lignes, setLignes] = useState<LigneDevis[]>([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDevis, setSelectedDevis] = useState<DevisClient | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devisRes, clientsRes, productsRes] = await Promise.all([
        api.get('/devis-client'),
        api.get('/clients'),
        api.get('/products')
      ]);
      setDevis(devisRes.data);
      setClients(clientsRes.data);
      setProducts(productsRes.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement données', severity: 'error' });
    } finally { setLoading(false); }
  };

  const handleOpenDialog = (devisItem: DevisClient | null = null) => {
    if (devisItem) {
      setEditingDevis(devisItem);
      setFormData({
        clientId: devisItem.client.id,
        date: devisItem.date.split('T')[0],
        dateValidite: devisItem.dateValidite?.split('T')[0] || '',
        statut: devisItem.statut,
        notes: devisItem.notes || ''
      });
      api.get(`/devis-client/${devisItem.id}`).then(res => {
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
      setEditingDevis(null);
      setFormData({ clientId: '' as number | '', date: new Date().toISOString().split('T')[0], dateValidite: '', statut: 'BROUILLON', notes: '' });
      setLignes([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => { setOpenDialog(false); setEditingDevis(null); };

  const handleSave = async () => {
    if (formData.clientId === '') {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un client', severity: 'error' });
      return;
    }
    try {
      const payload = { ...formData, lignes };
      if (editingDevis) {
        await api.put(`/devis-client/${editingDevis.id}`, payload);
        setSnackbar({ open: true, message: 'Devis modifié', severity: 'success' });
      } else {
        await api.post('/devis-client', payload);
        setSnackbar({ open: true, message: 'Devis créé', severity: 'success' });
      }
      setOpenDialog(false);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur sauvegarde', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await api.delete(`/devis-client/${deleteId}`);
      setSnackbar({ open: true, message: 'Devis supprimé', severity: 'success' });
      setOpenDelete(false);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur suppression', severity: 'error' });
    }
  };

  const handleConvertToCommande = async () => {
    if (!selectedDevis) return;
    try {
      await api.post(`/devis-client/${selectedDevis.id}/convert-to-commande`);
      setSnackbar({ open: true, message: 'Devis converti en Commande Client', severity: 'success' });
      setAnchorEl(null);
      setSelectedDevis(null);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur conversion', severity: 'error' });
    }
  };

  const addLigne = () => {
    setLignes([...lignes, { designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  };

  const removeLigne = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof LigneDevis, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        // Format: Product name with serial/barcode underneath if exists
        let designation = product.name;
        if (product.serialNumber) {
          designation += `\nSN: ${product.serialNumber}`;
        } else if (product.barcode) {
          designation += `\nCode barre: ${product.barcode}`;
        }
        newLignes[index].designation = designation;
        newLignes[index].prixUnitaireHT = product.price;
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

  const columns: GridColDef<DevisClient>[] = [
    { field: 'numero', headerName: 'Numéro', flex: 0.8 },
    { 
      field: 'clientName', 
      headerName: 'Client', 
      flex: 1, 
      valueGetter: (_value, row) => row?.client?.name || '' 
    },
    { 
      field: 'date', 
      headerName: 'Date', 
      flex: 0.8, 
      valueGetter: (_value, row) => row?.date ? new Date(row.date).toLocaleDateString('fr-FR') : '' 
    },
    { field: 'statut', headerName: 'Statut', flex: 0.7 },
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
      flex: 1,
      getActions: (params: GridRowParams<DevisClient>) => [
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />,
        <GridActionsCellItem icon={<PrintIcon />} label="Imprimer" onClick={() => window.open(`/print/devis/${params.row.id}`, '_blank')} />,
        <GridActionsCellItem 
          icon={<MoreVertIcon />} 
          label="Convertir" 
          onClick={(e) => { 
            setSelectedDevis(params.row); 
            setAnchorEl(e.currentTarget as any); 
          }} 
        />,
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
          <ShoppingCartIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Devis Client</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Estimations et devis pour vos clients</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}>
          Nouveau Devis
        </Button>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{devis.length}</Typography>}
            <Typography variant="caption" color="text.secondary">Total Devis</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{devis.filter(d => d.statut === 'BROUILLON').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Brouillons</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{devis.filter(d => d.statut === 'VALIDÉ').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Validés</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{devis.filter(d => d.statut === 'ACCEPTÉ').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Acceptés</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par numéro de devis ou client..."
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
            rows={devis.filter(d =>
              d.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              d.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <DialogTitle>{editingDevis ? 'Modifier Devis' : 'Nouveau Devis'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Date Validité" type="date" value={formData.dateValidite} onChange={e => setFormData({ ...formData, dateValidite: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value })}>
                <MenuItem value="BROUILLON">Brouillon</MenuItem>
                <MenuItem value="ENVOYE">Envoyé</MenuItem>
                <MenuItem value="ACCEPTE">Accepté</MenuItem>
                <MenuItem value="REFUSE">Refusé</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="h6" sx={{ mt: 2 }}>Lignes</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell>Désignation</TableCell>
                  <TableCell>Qté</TableCell>
                  <TableCell>Prix Unit. HT</TableCell>
                  <TableCell>TVA %</TableCell>
                  <TableCell>Total HT</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lignes.map((ligne, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={products}
                        value={products.find(p => p.id === ligne.productId) || null}
                        onChange={(_e, newValue) => {
                          updateLigne(index, 'productId', newValue ? newValue.id : undefined as any);
                          if (newValue) updateLigne(index, 'designation', newValue.name);
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
                      />
                    </TableCell>
                    <TableCell><TextField size="small" value={ligne.designation} onChange={e => updateLigne(index, 'designation', e.target.value)} fullWidth /></TableCell>
                    <TableCell><TextField size="small" type="number" value={ligne.quantite} onChange={e => updateLigne(index, 'quantite', Number(e.target.value))} sx={{ width: 80 }} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={ligne.prixUnitaireHT} onChange={e => updateLigne(index, 'prixUnitaireHT', Number(e.target.value))} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={ligne.tauxTVA} onChange={e => updateLigne(index, 'tauxTVA', Number(e.target.value))} sx={{ width: 80 }} /></TableCell>
                    <TableCell>{(ligne.quantite * ligne.prixUnitaireHT * (1 + ligne.tauxTVA / 100)).toFixed(3)}</TableCell>
                    <TableCell><IconButton size="small" onClick={() => removeLigne(index)}><RemoveIcon /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={addLigne} startIcon={<AddIcon />}>Ajouter Ligne</Button>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography>Montant HT: {totals.montantHT.toFixed(3)} TND</Typography>
              <Typography>TVA: {totals.montantTVA.toFixed(3)} TND</Typography>
              <Typography>Timbre Fiscal: {totals.timbreFiscal.toFixed(3)} TND</Typography>
              <Typography variant="h6">Total TTC: {totals.montantTTC.toFixed(3)} TND</Typography>
            </Box>

            <TextField label="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{editingDevis ? 'Enregistrer' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Supprimer Devis</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce devis ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => { setAnchorEl(null); setSelectedDevis(null); }}
      >
        <MenuItemAction onClick={handleConvertToCommande}>
          <ShoppingCartIcon sx={{ mr: 1, fontSize: 20 }} />
          Convertir en Commande Client
        </MenuItemAction>
      </Menu>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
