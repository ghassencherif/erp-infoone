import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, AlertColor,
  Chip, Menu, MenuItem as MenuItemAction, Autocomplete
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
import api from '../services/apiClient';

interface Client { id: number; name: string; }
interface Product { id: number; name: string; price: number; reference?: string | null; invoiceableQuantity?: number; }
interface LigneBon { productId?: number; designation: string; quantite: number; prixUnitaireHT: number; tauxTVA: number; }
interface BonCommandeClient {
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
  hasBonLivraison?: boolean;
  bonLivraisonNumero?: string | null;
  hasFacture?: boolean;
  factureNumero?: string | null;
}

export default function BonsCommandeClient() {
  const [bons, setBons] = useState<BonCommandeClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBon, setEditingBon] = useState<BonCommandeClient | null>(null);
  const [formData, setFormData] = useState({
    clientId: '' as number | '',
    date: new Date().toISOString().split('T')[0],
    dateEcheance: '',
    statut: 'BROUILLON',
    notes: ''
  });
  const [lignes, setLignes] = useState<LigneBon[]>([{ designation: '', quantite: 1, prixUnitaireHT: 0, tauxTVA: 19 }]);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBon, setSelectedBon] = useState<BonCommandeClient | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bonsRes, clientsRes, productsRes] = await Promise.all([
        api.get('/bons-commande-client'),
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

  const handleOpenDialog = (bon: BonCommandeClient | null = null) => {
    if (bon) {
      setEditingBon(bon);
      setFormData({
        clientId: bon.client.id,
        date: bon.date.split('T')[0],
        dateEcheance: bon.dateEcheance?.split('T')[0] || '',
        statut: bon.statut,
        notes: bon.notes || ''
      });
      api.get(`/bons-commande-client/${bon.id}`).then(res => {
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
      setFormData({ clientId: '' as number | '', date: new Date().toISOString().split('T')[0], dateEcheance: '', statut: 'BROUILLON', notes: '' });
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
        await api.put(`/bons-commande-client/${editingBon.id}`, payload);
        setSnackbar({ open: true, message: 'Bon commande modifié', severity: 'success' });
      } else {
        await api.post('/bons-commande-client', payload);
        setSnackbar({ open: true, message: 'Bon commande créé', severity: 'success' });
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
      await api.delete(`/bons-commande-client/${deleteId}`);
      setSnackbar({ open: true, message: 'Bon commande supprimé', severity: 'success' });
      setOpenDelete(false);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur suppression', severity: 'error' });
    }
  };

  const handleConvertToLivraison = async () => {
    if (!selectedBon) return;
    setAnchorEl(null);
    try {
      await api.post(`/bons-commande-client/${selectedBon.id}/convert-to-livraison`);
      setSnackbar({ open: true, message: 'Bon de livraison créé', severity: 'success' });
      setSelectedBon(null);
      loadData();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur conversion', severity: 'error' });
    }
  };

  const handleConvertToFacture = async () => {
    if (!selectedBon) return;
    setAnchorEl(null);
    try {
      await api.post(`/bons-commande-client/${selectedBon.id}/convert-to-facture`);
      setSnackbar({ open: true, message: 'Facture créée', severity: 'success' });
      setSelectedBon(null);
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
      case 'ACCEPTE': return 'success';
      case 'LIVRE': return 'primary';
      case 'ANNULE': return 'error';
      default: return 'default';
    }
  };

  const columns: GridColDef<BonCommandeClient>[] = [
    { field: 'numero', headerName: 'Numéro', flex: 0.8, renderCell: (params) => <Typography fontWeight={600}>{params.value}</Typography> },
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
      field: 'hasBonLivraison', 
      headerName: 'BL', 
      flex: 0.7,
      renderCell: (params: { row: BonCommandeClient }) => {
        if (params.row.hasBonLivraison && params.row.bonLivraisonNumero) {
          return (
            <Chip 
              label={params.row.bonLivraisonNumero} 
              color="primary" 
              size="small"
              icon={<LocalShippingIcon />}
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
      renderCell: (params: { row: BonCommandeClient }) => {
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
      flex: 1,
      getActions: (params: GridRowParams<BonCommandeClient>) => [
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />,
        <GridActionsCellItem icon={<PrintIcon />} label="Imprimer" onClick={() => window.open(`/print/bon-commande/${params.row.id}`, '_blank')} />,
        <GridActionsCellItem 
          icon={<MoreVertIcon />} 
          label="Convertir" 
          onClick={(e) => { 
            setSelectedBon(params.row); 
            setAnchorEl(e.currentTarget as any); 
          }} 
        />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => { setDeleteId(params.row.id); setOpenDelete(true); }} />
      ]
    }
  ];

  return (
    <DashboardLayout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={700}>Bons de Commande Client</Typography>
      </Box>
      <Box sx={{ height: 600, width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
        <DataGrid 
          rows={bons} 
          columns={columns} 
          loading={loading} 
          getRowId={(row) => row.id} 
          pageSizeOptions={[10, 25, 50]} 
          slots={{ toolbar: GridToolbar }}
          sx={{ border: 'none' }}
        />
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItemAction onClick={handleConvertToLivraison} disabled={selectedBon?.hasBonLivraison}>
          <LocalShippingIcon sx={{ mr: 1 }} /> Convertir en Bon de Livraison
        </MenuItemAction>
        <MenuItemAction onClick={handleConvertToFacture} disabled={selectedBon?.hasFacture}>
          <ReceiptIcon sx={{ mr: 1 }} /> Convertir en Facture
        </MenuItemAction>
      </Menu>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {editingBon ? 'Modifier Bon de Commande' : 'Nouveau Bon de Commande'}
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Date Échéance" type="date" value={formData.dateEcheance} onChange={e => setFormData({ ...formData, dateEcheance: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select value={formData.statut} onChange={e => setFormData({ ...formData, statut: e.target.value })}>
                <MenuItem value="BROUILLON">Brouillon</MenuItem>
                <MenuItem value="ENVOYE">Envoyé</MenuItem>
                <MenuItem value="ACCEPTE">Accepté</MenuItem>
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
        <DialogTitle>Supprimer Bon de Commande</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce bon de commande ?</DialogContent>
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
