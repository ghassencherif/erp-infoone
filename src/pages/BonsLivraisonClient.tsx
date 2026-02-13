import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, AlertColor, Chip,
  Autocomplete, Paper, Card, Grid, Skeleton, InputAdornment
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar, GridRowParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SearchIcon from '@mui/icons-material/Search';
import api from '../services/apiClient';

interface Client { id: number; name: string; }
interface Product { id: number; name: string; price: number; reference?: string | null; invoiceableQuantity?: number; }
interface LigneBon { productId?: number; designation: string; quantite: number; prixUnitaireHT: number; tauxTVA: number; }
interface BonLivraisonClient {
  id: number;
  numero: string;
  client: Client;
  date: string;
  statut: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  notes?: string;
  hasCommandeClient?: boolean;
  commandeClientNumero?: string | null;
  hasBonCommande?: boolean;
  bonCommandeNumero?: string | null;
  hasFacture?: boolean;
  factureNumero?: string | null;
}

export default function BonsLivraisonClient() {
  const [bons, setBons] = useState<BonLivraisonClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBon, setEditingBon] = useState<BonLivraisonClient | null>(null);
  const [formData, setFormData] = useState({
    clientId: '' as number | '',
    date: new Date().toISOString().split('T')[0],
    statut: 'BROUILLON',
    notes: ''
  });
  const [lignes, setLignes] = useState<LigneBon[]>([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [openClientModal, setOpenClientModal] = useState(false);
  const [selectedBon, setSelectedBon] = useState<BonLivraisonClient | null>(null);
  const [openBonModal, setOpenBonModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bonsRes, clientsRes, productsRes] = await Promise.all([
        api.get('/bons-livraison-client'),
        api.get('/clients'),
        api.get('/products')
      ]);
      setBons(bonsRes.data);
      setClients(clientsRes.data);
      setProducts(productsRes.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement données', severity: 'error' });
    } finally { setLoading(false); }
  };

  const handleOpenDialog = (bon: BonLivraisonClient | null = null) => {
    if (bon) {
      setEditingBon(bon);
      setFormData({
        clientId: bon.client.id,
        date: bon.date.split('T')[0],
        statut: bon.statut,
        notes: bon.notes || ''
      });
      api.get(`/bons-livraison-client/${bon.id}`).then(res => {
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
      setEditingBon(null);
      setFormData({ clientId: '' as number | '', date: new Date().toISOString().split('T')[0], statut: 'BROUILLON', notes: '' });
      setLignes([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => { setOpenDialog(false); setEditingBon(null); };

  const handleSave = async () => {
    if (formData.clientId === '') {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un client', severity: 'error' });
      return;
    }
    try {
      const payload = { ...formData, lignes };
      if (editingBon) {
        await api.put(`/bons-livraison-client/${editingBon.id}`, payload);
        setSnackbar({ open: true, message: 'Bon livraison modifié', severity: 'success' });
      } else {
        await api.post('/bons-livraison-client', payload);
        setSnackbar({ open: true, message: 'Bon livraison créé', severity: 'success' });
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
      await api.delete(`/bons-livraison-client/${deleteId}`);
      setSnackbar({ open: true, message: 'Bon livraison supprimé', severity: 'success' });
      setOpenDelete(false);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur suppression', severity: 'error' });
    }
  };

  const handleConvertToFacture = async (id: number) => {
    try {
      const response = await api.post(`/bons-livraison-client/${id}/convert-to-facture`);
      const facture = response.data;
      setSnackbar({ open: true, message: `Facture ${facture.numero} créée avec succès`, severity: 'success' });
      loadData(); // Reload the data
      // Optional: Navigate to factures page after a delay
      setTimeout(() => {
        window.location.href = '/factures-client';
      }, 1500);
    } catch (e: any) {
      console.error('Error converting to facture:', e);
      const errorMsg = e.response?.data?.error || 'Erreur conversion';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const addLigne = () => {
    setLignes([...lignes, { designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  };

  const removeLigne = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof LigneBon, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
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

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'BROUILLON': return 'default';
      case 'ENVOYE': return 'info';
      case 'LIVRE': return 'success';
      case 'ANNULE': return 'error';
      default: return 'default';
    }
  };

  const columns: GridColDef<BonLivraisonClient>[] = [
    { field: 'numero', headerName: 'Numéro', flex: 0.8, renderCell: (params) => (
      <Typography fontWeight={600} sx={{ cursor: 'pointer', color: '#B90202', '&:hover': { textDecoration: 'underline' } }} onClick={() => {
        setSelectedBon(params.row);
        setOpenBonModal(true);
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
    { 
      field: 'statut', 
      headerName: 'Statut', 
      flex: 0.7,
      renderCell: (params) => <Chip label={params.value} size="small" color={getStatutColor(params.value) as any} />
    },
    { 
      field: 'montantTTC', 
      headerName: 'Montant TTC', 
      flex: 0.8, 
      valueGetter: (_value, row) => `${row?.montantTTC?.toFixed(3)} TND` 
    },
    { 
      field: 'hasCommandeClient', 
      headerName: 'Cmd', 
      flex: 0.7,
      renderCell: (params: { row: BonLivraisonClient }) => {
        if (params.row.hasCommandeClient && params.row.commandeClientNumero) {
          return (
            <Chip 
              label={params.row.commandeClientNumero} 
              color="warning" 
              size="small"
              icon={<LocalShippingIcon />}
            />
          );
        }
        return null;
      }
    },
    { 
      field: 'hasBonCommande', 
      headerName: 'BC', 
      flex: 0.7,
      renderCell: (params: { row: BonLivraisonClient }) => {
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
      field: 'hasFacture', 
      headerName: 'Facture', 
      flex: 0.8,
      renderCell: (params: { row: BonLivraisonClient }) => {
        if (params.row.hasFacture && params.row.factureNumero) {
          return (
            <Chip 
              label={params.row.factureNumero} 
              color="success" 
              size="small"
              icon={<ReceiptIcon />}
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
      getActions: (params: GridRowParams<BonLivraisonClient>) => [
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />,
        <GridActionsCellItem icon={<PrintIcon />} label="Imprimer" onClick={() => window.open(`/print/bon-livraison/${params.row.id}`, '_blank')} />,
        <GridActionsCellItem 
          icon={<ReceiptIcon />} 
          label="Convertir en Facture" 
          onClick={() => handleConvertToFacture(params.row.id)}
          disabled={params.row.hasFacture}
          showInMenu
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
          <LocalShippingIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Bons de Livraison Client</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Suivi de vos livraisons aux clients</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{bons.length}</Typography>}
            <Typography variant="caption" color="text.secondary">Total Bons</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{bons.filter(b => b.statut === 'BROUILLON').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Brouillons</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{bons.filter(b => b.statut === 'VALIDE').length}</Typography>}
            <Typography variant="caption" color="text.secondary">Validés</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{bons.filter(b => b.hasFacture).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Facturés</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par numéro de bon ou client..."
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
      <Paper sx={{ height: 500, width: '100%', borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height="100%" />
        ) : (
          <DataGrid 
            rows={bons.filter(b =>
              b.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              b.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            columns={columns} 
            loading={loading} 
            getRowId={(row) => row.id} 
            pageSizeOptions={[10, 25, 50]} 
            slots={{ toolbar: GridToolbar }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-row:hover': {
                bgcolor: '#f9f9f9',
                cursor: 'pointer'
              }
            }}
          />
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          {editingBon ? 'Modifier Bon de Livraison' : 'Nouveau Bon de Livraison'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            <TextField label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value })}>
                <MenuItem value="BROUILLON">Brouillon</MenuItem>
                <MenuItem value="ENVOYE">Envoyé</MenuItem>
                <MenuItem value="LIVRE">Livré</MenuItem>
                <MenuItem value="ANNULE">Annulé</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Lignes</Typography>
            <Table size="small" sx={{ border: '1px solid #e0e0e0' }}>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>Produit</strong></TableCell>
                  <TableCell><strong>Désignation</strong></TableCell>
                  <TableCell><strong>Qté</strong></TableCell>
                  <TableCell><strong>Prix Unit. HT</strong></TableCell>
                  <TableCell><strong>TVA %</strong></TableCell>
                  <TableCell><strong>Total</strong></TableCell>
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
                        slotProps={{
                          popper: {
                            sx: { width: '600px !important' }
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell><TextField size="small" value={ligne.designation} onChange={e => updateLigne(index, 'designation', e.target.value)} fullWidth /></TableCell>
                    <TableCell><TextField size="small" type="number" value={ligne.quantite} onChange={e => updateLigne(index, 'quantite', Number(e.target.value))} sx={{ width: 80 }} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={ligne.prixUnitaireHT} onChange={e => updateLigne(index, 'prixUnitaireHT', Number(e.target.value))} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={ligne.tauxTVA} onChange={e => updateLigne(index, 'tauxTVA', Number(e.target.value))} sx={{ width: 80 }} /></TableCell>
                    <TableCell><strong>{(ligne.quantite * ligne.prixUnitaireHT * (1 + ligne.tauxTVA / 100)).toFixed(3)}</strong></TableCell>
                    <TableCell><IconButton size="small" color="error" onClick={() => removeLigne(index)}><RemoveIcon /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={addLigne} startIcon={<AddIcon />} variant="outlined">Ajouter Ligne</Button>

            <Box sx={{ mt: 2, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography>Montant HT: <strong>{totals.montantHT.toFixed(3)} TND</strong></Typography>
              <Typography>TVA: <strong>{totals.montantTVA.toFixed(3)} TND</strong></Typography>
              <Typography>Timbre Fiscal: <strong>{totals.timbreFiscal.toFixed(3)} TND</strong></Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>Total TTC: <strong>{totals.montantTTC.toFixed(3)} TND</strong></Typography>
            </Box>

            <TextField label="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" size="large">{editingBon ? 'Enregistrer' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Supprimer Bon de Livraison</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce bon de livraison ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Supprimer</Button>
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
      <Dialog open={openBonModal} onClose={() => setOpenBonModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#201B18', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Détails Bon de Livraison
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => {
            if (selectedBon) {
              window.open(`/print/bon-livraison/${selectedBon.id}`, '_blank');
            }
          }}>
            Imprimer
          </Button>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedBon && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Numéro</Typography>
                <Typography>{selectedBon.numero}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Client</Typography>
                <Typography>{selectedBon.client?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Date</Typography>
                <Typography>{new Date(selectedBon.date).toLocaleDateString('fr-FR')}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Statut</Typography>
                <Typography>{selectedBon.statut}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#666' }}>Montant TTC</Typography>
                <Typography sx={{ fontSize: '1.1em', fontWeight: 600 }}>{selectedBon.montantTTC.toFixed(3)} TND</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBonModal(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
