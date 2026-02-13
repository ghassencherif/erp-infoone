import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Paper,
  Card,
  Grid,
  Skeleton,
  InputAdornment
} from '@mui/material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import BusinessIcon from '@mui/icons-material/Business'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/apiClient'
import DashboardLayout from '../components/layouts/DashboardLayout'

interface Fournisseur {
  id: number
  nom: string
  email: string | null
  telephone: string | null
  adresse: string | null
  ville: string | null
  codePostal: string | null
  pays: string | null
  matriculeFiscale: string | null
  actif: boolean
  createdAt: string
  updatedAt: string
}

const initialFormData = {
  nom: '',
  email: '',
  telephone: '',
  adresse: '',
  ville: '',
  codePostal: '',
  pays: 'Tunisie',
  matriculeFiscale: '',
  actif: true
}

export default function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState(initialFormData)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadFournisseurs()
  }, [])

  const loadFournisseurs = async () => {
    try {
      const response = await api.get('/fournisseurs')
      setFournisseurs(response.data)
    } catch (error) {
      console.error('Erreur chargement fournisseurs:', error)
      showSnackbar('Erreur lors du chargement des fournisseurs', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenDialog = (fournisseur?: Fournisseur) => {
    if (fournisseur) {
      setEditingId(fournisseur.id)
      setFormData({
        nom: fournisseur.nom,
        email: fournisseur.email || '',
        telephone: fournisseur.telephone || '',
        adresse: fournisseur.adresse || '',
        ville: fournisseur.ville || '',
        codePostal: fournisseur.codePostal || '',
        pays: fournisseur.pays || 'Tunisie',
        matriculeFiscale: fournisseur.matriculeFiscale || '',
        actif: fournisseur.actif
      })
    } else {
      setEditingId(null)
      setFormData(initialFormData)
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingId(null)
    setFormData(initialFormData)
  }

  const handleSave = async () => {
    try {
      // Remove spaces from phone number
      const cleanedFormData = {
        ...formData,
        telephone: formData.telephone?.replace(/\s+/g, '') || ''
      };
      
      if (editingId) {
        await api.put(`/fournisseurs/${editingId}`, cleanedFormData)
        showSnackbar('Fournisseur modifié avec succès', 'success')
      } else {
        await api.post('/fournisseurs', cleanedFormData)
        showSnackbar('Fournisseur créé avec succès', 'success')
      }
      handleCloseDialog()
      loadFournisseurs()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showSnackbar('Erreur lors de la sauvegarde', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      try {
        await api.delete(`/fournisseurs/${id}`)
        showSnackbar('Fournisseur supprimé avec succès', 'success')
        loadFournisseurs()
      } catch (error) {
        console.error('Erreur suppression:', error)
        showSnackbar('Erreur lors de la suppression', 'error')
      }
    }
  }

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'nom', headerName: 'Nom', width: 200 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'telephone', headerName: 'Téléphone', width: 130 },
    { field: 'ville', headerName: 'Ville', width: 130 },
    { field: 'pays', headerName: 'Pays', width: 100 },
    { field: 'matriculeFiscale', headerName: 'Matricule Fiscal', width: 150 },
    {
      field: 'actif',
      headerName: 'Actif',
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value ? 'success.main' : 'error.main' }}>
          {params.value ? 'Oui' : 'Non'}
        </Box>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Modifier"
          onClick={() => handleOpenDialog(params.row)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Supprimer"
          onClick={() => handleDelete(params.row.id)}
        />
      ]
    }
  ]

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
          <BusinessIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Gestion des Fournisseurs</Typography>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gérez vos fournisseurs et informations de contact</Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}
        >
          Nouveau Fournisseur
        </Button>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{fournisseurs.length}</Typography>}
            <Typography variant="caption" color="text.secondary">Total Fournisseurs</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{fournisseurs.filter(f => f.actif).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Actifs</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{fournisseurs.filter(f => !f.actif).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Inactifs</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
            {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{fournisseurs.filter(f => f.email).length}</Typography>}
            <Typography variant="caption" color="text.secondary">Avec Email</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par nom, email ou ville..."
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
            rows={fournisseurs.filter(f =>
              f.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              f.ville?.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } }
            }}
            sx={{
              '& .MuiDataGrid-row:hover': {
                bgcolor: '#f9f9f9',
                cursor: 'pointer'
              }
            }}
          />
        )}
      </Paper>

      {/* Dialog Création/Modification */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
          {editingId ? '✏️ Modifier Fournisseur' : '➕ Nouveau Fournisseur'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Nom *"
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            fullWidth
            required
            variant="outlined"
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Téléphone"
            value={formData.telephone}
            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Adresse"
            value={formData.adresse}
            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
            fullWidth
            multiline
            rows={2}
            variant="outlined"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Ville"
                value={formData.ville}
                onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Code Postal"
                value={formData.codePostal}
                onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <TextField
            label="Pays"
            value={formData.pays}
            onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Matricule Fiscal"
            value={formData.matriculeFiscale}
            onChange={(e) => setFormData({ ...formData, matriculeFiscale: e.target.value })}
            fullWidth
            helperText="Numéro d'identification fiscal"
            variant="outlined"
          />
          <Card sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  color="success"
                />
              }
              label="Fournisseur actif"
            />
          </Card>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.nom} sx={{ bgcolor: '#201B18', '&:hover': { bgcolor: '#0f0d0a' } }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

    </DashboardLayout>
  )
}
