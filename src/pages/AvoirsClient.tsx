import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, AlertColor, Paper, Card, Grid, Skeleton, InputAdornment
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar, GridRowParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import PrintIcon from '@mui/icons-material/Print';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
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
}

interface LigneAvoir {
  productId?: number;
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
}

interface AvoirClient {
  id: number;
  numero: string;
  client: Client;
  date: string;
  statut: string;
  montantHT: number;
  montantTVA: number;
  timbreFiscal: number;
  montantTTC: number;
  motif?: string;
  notes?: string;
}

export default function AvoirsClient() {
  const [avoirs, setAvoirs] = useState<AvoirClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAvoir, setEditingAvoir] = useState<AvoirClient | null>(null);
  const [formData, setFormData] = useState({
    clientId: '' as number | '',
    date: new Date().toISOString().split('T')[0],
    statut: 'BROUILLON',
    motif: '',
    notes: ''
  });
  const [lignes, setLignes] = useState<LigneAvoir[]>([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [avoirsRes, clientsRes, productsRes] = await Promise.all([
        api.get('/avoirs-client'),
        api.get('/clients'),
        api.get('/products')
      ]);
      setAvoirs(avoirsRes.data);
      setClients(clientsRes.data);
      setProducts(productsRes.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement données', severity: 'error' });
    } finally { setLoading(false); }
  };

  const handleOpenDialog = (avoir: AvoirClient | null = null) => {
    if (avoir) {
      setEditingAvoir(avoir);
      setFormData({
        clientId: avoir.client.id,
        date: avoir.date.split('T')[0],
        statut: avoir.statut,
        motif: avoir.motif || '',
        notes: avoir.notes || ''
      });
      api.get(`/avoirs-client/${avoir.id}`).then(res => {
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
      setEditingAvoir(null);
      setFormData({ clientId: '' as number | '', date: new Date().toISOString().split('T')[0], statut: 'BROUILLON', motif: '', notes: '' });
      setLignes([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => { setOpenDialog(false); setEditingAvoir(null); };

  const handleSave = async () => {
    if (formData.clientId === '') {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un client', severity: 'error' });
      return;
    }
    try {
      const payload = { ...formData, lignes };
      if (editingAvoir) {
        await api.put(`/avoirs-client/${editingAvoir.id}`, payload);
        setSnackbar({ open: true, message: 'Avoir modifié', severity: 'success' });
      } else {
        await api.post('/avoirs-client', payload);
        setSnackbar({ open: true, message: 'Avoir créé', severity: 'success' });
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
      await api.delete(`/avoirs-client/${deleteId}`);
      setSnackbar({ open: true, message: 'Avoir supprimé', severity: 'success' });
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

  const updateLigne = (index: number, field: keyof LigneAvoir, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newLignes[index].designation = product.name;
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

  const columns: GridColDef<AvoirClient>[] = [
    { field: 'numero', headerName: 'Numéro', flex: 0.8 },
    { 
      field: 'clientName', 
      headerName: 'Client', 
      flex: 1, 
      valueGetter: (value, row) => row?.client?.name || '' 
    },
    { 
      field: 'date', 
      headerName: 'Date', 
      flex: 0.8, 
      valueGetter: (value, row) => row?.date ? new Date(row.date).toLocaleDateString('fr-FR') : '' 
    },
    { field: 'statut', headerName: 'Statut', flex: 0.7 },
    { 
      field: 'montantTTC', 
      headerName: 'Montant TTC', 
      flex: 0.8, 
      valueGetter: (value, row) => `${row?.montantTTC?.toFixed(3)} TND` 
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      flex: 0.7,
      getActions: (params: GridRowParams<AvoirClient>) => [
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />,
        <GridActionsCellItem icon={<PrintIcon />} label="Imprimer" onClick={() => window.open(`/print/avoir/${params.row.id}`, '_blank')} />,
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
          <AssignmentReturnIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Avoirs Client</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gestion des retours et remboursements</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}>
          Nouvel Avoir
        </Button>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{avoirs.length}</Typography>}
            <Typography variant="caption" color="text.secondary">Total Avoirs</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{avoirs.filter(a => a.statut === 'BROUILLON').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Brouillons</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{avoirs.filter(a => a.statut === 'VALIDÉ').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Validés</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{(avoirs.reduce((sum, a) => sum + a.montantTTC, 0)).toFixed(3)}</Typography>}
            <Typography variant="caption" color="text.secondary">Montant Total (TTC)</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par numéro d'avoir ou client..."
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
            rows={avoirs.filter(a =>
              a.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              a.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <DialogTitle>{editingAvoir ? 'Modifier Avoir' : 'Nouvel Avoir'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select value={formData.clientId === '' ? '' : formData.clientId} onChange={e => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setFormData({ ...formData, clientId: val });
              }}>
                <MenuItem value="">-- Sélectionner --</MenuItem>
                {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value })}>
                <MenuItem value="BROUILLON">Brouillon</MenuItem>
                <MenuItem value="ENVOYE">Envoyé</MenuItem>
                <MenuItem value="PAYE">Payé</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Motif" value={formData.motif} onChange={e => setFormData({ ...formData, motif: e.target.value })} fullWidth multiline rows={2} />

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
                      <Select size="small" value={ligne.productId || ''} onChange={e => updateLigne(index, 'productId', Number(e.target.value))} fullWidth>
                        <MenuItem value="">-</MenuItem>
                        {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                      </Select>
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
          <Button onClick={handleSave} variant="contained">{editingAvoir ? 'Enregistrer' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Supprimer Avoir</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer cet avoir ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
