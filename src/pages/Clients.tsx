import { useEffect, useState } from 'react';
import { AlertColor, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Client } from '../types';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Paper, Card, Grid, Skeleton, InputAdornment, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { DataGrid, GridActionsCellItem, GridToolbar } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import api from '../services/apiClient';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<{ name: string; email: string; phone: string; address: string; type: string; matriculeFiscale: string }>({ name: '', email: '', phone: '', address: '', type: 'PARTICULIER', matriculeFiscale: '' });
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });
  const [openHistory, setOpenHistory] = useState<boolean>(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => { loadClients(); }, []);
  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement clients', severity: 'error' });
    } finally { setLoading(false); }
  };

  const handleOpenDialog = (client: Client | null = null) => {
    setEditingClient(client);
    setFormData(client ? {
      name: client.name ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      type: (client as any).type || 'PARTICULIER',
      matriculeFiscale: (client as any).matriculeFiscale ?? ''
    } : { name: '', email: '', phone: '', address: '', type: 'PARTICULIER', matriculeFiscale: '' });
    setOpenDialog(true);
  };
  const handleCloseDialog = () => { setOpenDialog(false); setEditingClient(null); };

  const handleSave = async () => {
    try {
      if (!formData.name || formData.name.trim() === '') {
        setSnackbar({ open: true, message: 'Le nom du client est obligatoire', severity: 'error' });
        return;
      }
      
      // Remove spaces from phone number
      const cleanedFormData = {
        ...formData,
        phone: formData.phone?.replace(/\s+/g, '') || ''
      };
      
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, cleanedFormData);
        setSnackbar({ open: true, message: 'Client modifié', severity: 'success' });
      } else {
        await api.post('/clients', cleanedFormData);
        setSnackbar({ open: true, message: 'Client ajouté', severity: 'success' });
      }
      setOpenDialog(false);
      loadClients();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || 'Erreur sauvegarde';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await api.delete(`/clients/${deleteId}`);
      setSnackbar({ open: true, message: 'Client supprimé', severity: 'success' });
      setOpenDelete(false);
      loadClients();
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur suppression', severity: 'error' });
    }
  };

  const handleViewHistory = async (client: Client) => {
    setHistoryClient(client);
    setOpenHistory(true);
    try {
      const res = await api.get(`/clients/${client.id}/orders`);
      setOrderHistory(res.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement historique', severity: 'error' });
      setOrderHistory([]);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_VALIDATION': return 'warning';
      case 'ANNULE': return 'error';
      case 'EN_COURS_PREPARATION': return 'info';
      case 'EN_COURS_LIVRAISON': return 'primary';
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
      case 'LIVRE': return 'Livré';
      default: return statut;
    }
  };

  const columns: GridColDef<Client>[] = [
    { field: 'code', headerName: 'Code', flex: 0.6, renderCell: (params) => <Typography fontWeight={600}>{params.value}</Typography> },
    { field: 'name', headerName: 'Nom', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phone', headerName: 'Téléphone', flex: 1 },
    { field: 'address', headerName: 'Adresse', flex: 1 },
    { field: 'createdAt', headerName: 'Créé le', flex: 1, valueGetter: (params: { row: Client }) => params?.row?.createdAt ? new Date(params.row.createdAt).toLocaleDateString('fr-FR') : '' },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      flex: 0.9,
      getActions: (params: GridRowParams<Client>) => [
        <GridActionsCellItem icon={<HistoryIcon />} label="Historique" onClick={() => handleViewHistory(params.row)} />,
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />,
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
          <PersonIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Gestion des Clients</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gérez tous vos clients et suivez l'historique de leurs commandes</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" startIcon={<SyncIcon />} onClick={async () => {
            setLoading(true);
            try {
              const res = await api.post('/clients/sync');
              setSnackbar({ open: true, message: res.data.message || 'Synchronisation terminée', severity: 'success' });
              await loadClients();
            } catch (e: any) {
              setSnackbar({ open: true, message: e?.response?.data?.error || 'Erreur synchronisation', severity: 'error' });
            } finally {
              setLoading(false);
            }
          }} sx={{ bgcolor: '#B90202', '&:hover': { bgcolor: '#9a0101' } }}>
            Synchroniser
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}>
            Ajouter Client
          </Button>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{clients.length}</Typography>}
            <Typography variant="caption" color="text.secondary">Total de Clients</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{clients.filter(c => c.email).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Avec Email</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{clients.filter(c => c.phone).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Avec Téléphone</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{clients.filter(c => c.code).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Avec Code</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par nom, email ou téléphone..."
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
            rows={clients.filter(c => 
              c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
          {editingClient ? '✏️ Modifier Client' : '➕ Ajouter Client'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {editingClient && (
            <TextField 
              label="Code Client" 
              value={editingClient.code} 
              fullWidth 
              disabled
              variant="outlined"
            />
          )}
          <TextField 
            label="Nom du Client *" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
            fullWidth 
            required 
            variant="outlined"
          />
          <FormControl fullWidth>
            <InputLabel>Type de Client</InputLabel>
            <Select 
              value={formData.type} 
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              label="Type de Client"
            >
              <MenuItem value="PARTICULIER">Particulier</MenuItem>
              <MenuItem value="PROFESSIONNEL">Professionnel</MenuItem>
            </Select>
          </FormControl>
          {formData.type === 'PROFESSIONNEL' && (
            <TextField 
              label="Matricule Fiscal" 
              value={formData.matriculeFiscale} 
              onChange={e => setFormData({ ...formData, matriculeFiscale: e.target.value })} 
              fullWidth
              variant="outlined"
            />
          )}
          <TextField 
            label="Email" 
            value={formData.email} 
            onChange={e => setFormData({ ...formData, email: e.target.value })} 
            fullWidth 
            type="email"
            variant="outlined"
          />
          <TextField 
            label="Téléphone" 
            value={formData.phone} 
            onChange={e => setFormData({ ...formData, phone: e.target.value })} 
            fullWidth
            variant="outlined"
          />
          <TextField 
            label="Adresse" 
            value={formData.address} 
            onChange={e => setFormData({ ...formData, address: e.target.value })} 
            fullWidth
            multiline
            rows={3}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#201B18', '&:hover': { bgcolor: '#0f0d0a' } }}>
            {editingClient ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Supprimer Client</DialogTitle>
        <DialogContent>Voulez-vous vraiment supprimer ce client ?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openHistory} onClose={() => setOpenHistory(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Historique des Commandes - {historyClient?.name} ({historyClient?.code})
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

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
