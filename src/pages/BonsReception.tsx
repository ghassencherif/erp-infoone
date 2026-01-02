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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar,
  Autocomplete,
  Card,
  Grid,
  Skeleton,
  InputAdornment
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/apiClient'
import DashboardLayout from '../components/layouts/DashboardLayout'

interface Fournisseur {
  id: number
  nom: string
}

interface BonDeCommande {
  id: number
  numero: string
}

interface Product {
  id: number
  name: string
  sku: string | null
  price: number
}

interface LigneBonReception {
  id?: number
  productId: number | null
  product?: Product
  designation: string
  quantiteCommandee: number
  quantiteRecue: number
  prixUnitaire: number
}

interface BonDeReception {
  id: number
  numero: string
  date: string
  fournisseur: Fournisseur
  bonCommande?: BonDeCommande
  observations: string | null
  lignes: LigneBonReception[]
}

export default function BonsReception() {
  const [bonsReception, setBonsReception] = useState<BonDeReception[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [bonsCommande, setBonsCommande] = useState<BonDeCommande[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [formData, setFormData] = useState({
    fournisseurId: '',
    bonCommandeId: '',
    date: new Date().toISOString().split('T')[0],
    observations: '',
    lignes: [] as LigneBonReception[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [brRes, foRes, bcRes, prRes] = await Promise.all([
        api.get('/bons-reception'),
        api.get('/fournisseurs'),
        api.get('/bons-commande'),
        api.get('/products')
      ])
      setBonsReception(brRes.data)
      setFournisseurs(foRes.data)
      setBonsCommande(bcRes.data)
      setProducts(prRes.data)
    } catch (error) {
      console.error('Erreur chargement:', error)
      showSnackbar('Erreur lors du chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenDialog = (bon?: BonDeReception) => {
    if (bon) {
      setEditingId(bon.id)
      setFormData({
        fournisseurId: bon.fournisseur.id.toString(),
        bonCommandeId: bon.bonCommande?.id?.toString() || '',
        date: bon.date.split('T')[0],
        observations: bon.observations || '',
        lignes: bon.lignes.map(l => ({
          ...l,
          productId: l.productId || null
        }))
      })
    } else {
      setEditingId(null)
      setFormData({
        fournisseurId: '',
        bonCommandeId: '',
        date: new Date().toISOString().split('T')[0],
        observations: '',
        lignes: []
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingId(null)
  }

  const handleAddLigne = () => {
    setFormData({
      ...formData,
      lignes: [
        ...formData.lignes,
        {
          productId: null,
          designation: '',
          quantiteCommandee: 1,
          quantiteRecue: 1,
          prixUnitaire: 0
        }
      ]
    })
  }

  const handleRemoveLigne = (index: number) => {
    setFormData({
      ...formData,
      lignes: formData.lignes.filter((_, i) => i !== index)
    })
  }

  const handleLigneChange = (index: number, field: keyof LigneBonReception, value: any) => {
    const newLignes = [...formData.lignes]
    newLignes[index] = { ...newLignes[index], [field]: value }
    setFormData({ ...formData, lignes: newLignes })
  }

  const handleProductSelect = (index: number, product: Product | null) => {
    if (product) {
      const newLignes = [...formData.lignes]
      newLignes[index] = {
        ...newLignes[index],
        productId: product.id,
        designation: product.name,
        prixUnitaire: product.price
      }
      setFormData({ ...formData, lignes: newLignes })
    }
  }

  const handleSubmit = async () => {
    try {
      if (!formData.fournisseurId || formData.lignes.length === 0) {
        showSnackbar('Veuillez remplir tous les champs obligatoires', 'error')
        return
      }

      const data = {
        fournisseurId: parseInt(formData.fournisseurId),
        bonCommandeId: formData.bonCommandeId ? parseInt(formData.bonCommandeId) : null,
        date: formData.date,
        observations: formData.observations,
        lignes: formData.lignes
      }

      if (editingId) {
        await api.put(`/bons-reception/${editingId}`, data)
        showSnackbar('Bon de réception modifié avec succès', 'success')
      } else {
        await api.post('/bons-reception', data)
        showSnackbar('Bon de réception créé avec succès', 'success')
      }

      handleCloseDialog()
      loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showSnackbar('Erreur lors de la sauvegarde', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bon de réception ?')) {
      try {
        await api.delete(`/bons-reception/${id}`)
        showSnackbar('Bon de réception supprimé avec succès', 'success')
        loadData()
      } catch (error) {
        console.error('Erreur suppression:', error)
        showSnackbar('Erreur lors de la suppression', 'error')
      }
    }
  }

  const columns: GridColDef[] = [
    { field: 'numero', headerName: 'Numéro', width: 150 },
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      valueGetter: (value) => new Date(value).toLocaleDateString('fr-FR')
    },
    {
      field: 'fournisseur',
      headerName: 'Fournisseur',
      width: 200,
      valueGetter: (value) => value?.nom || ''
    },
    {
      field: 'bonCommande',
      headerName: 'Bon de Commande',
      width: 150,
      valueGetter: (value) => value?.numero || '-'
    },
    {
      field: 'lignes',
      headerName: 'Nb Lignes',
      width: 100,
      valueGetter: (value) => value?.length || 0
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handleOpenDialog(params.row)} size="small" color="primary">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row.id)} size="small" color="error">
            <DeleteIcon />
          </IconButton>
        </>
      )
    }
  ]

  return (
    <DashboardLayout>
      <Box>
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
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Bons de Réception</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gestion des réceptions de fournisseurs</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}
          >
            Nouveau Bon
          </Button>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{bonsReception.length}</Typography>}
              <Typography variant="caption" color="text.secondary">Total Bons</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{bonsReception.filter(b => b.statut === 'BROUILLON').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Brouillons</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{bonsReception.filter(b => b.statut === 'VALIDE').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Validés</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{bonsReception.filter(b => b.statut === 'RECEPTIONNE').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Réceptionnés</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Rechercher par numéro de bon ou fournisseur..."
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
              rows={bonsReception.filter(b =>
                b.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.fournisseur?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
              )}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
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

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
          <DialogTitle>
            {editingId ? 'Modifier le Bon de Réception' : 'Nouveau Bon de Réception'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Fournisseur *</InputLabel>
                <Select
                  value={formData.fournisseurId}
                  label="Fournisseur *"
                  onChange={(e) => setFormData({ ...formData, fournisseurId: e.target.value })}
                >
                  {fournisseurs.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.nom}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Bon de Commande (optionnel)</InputLabel>
                <Select
                  value={formData.bonCommandeId}
                  label="Bon de Commande (optionnel)"
                  onChange={(e) => setFormData({ ...formData, bonCommandeId: e.target.value })}
                >
                  <MenuItem value="">Aucun</MenuItem>
                  {bonsCommande.map((bc) => (
                    <MenuItem key={bc.id} value={bc.id}>
                      {bc.numero}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Date"
                type="date"
                fullWidth
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Observations"
                fullWidth
                multiline
                rows={2}
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Lignes</Typography>
                  <Button startIcon={<AddIcon />} onClick={handleAddLigne}>
                    Ajouter une ligne
                  </Button>
                </Box>

                {formData.lignes.length === 0 ? (
                  <Alert severity="info">Aucune ligne ajoutée. Cliquez sur "Ajouter une ligne" pour commencer.</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Produit</TableCell>
                          <TableCell>Désignation</TableCell>
                          <TableCell width={100}>Qté Commandée</TableCell>
                          <TableCell width={100}>Qté Reçue</TableCell>
                          <TableCell width={100}>Prix Unit. HT</TableCell>
                          <TableCell width={50}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.lignes.map((ligne, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Autocomplete
                                options={products}
                                getOptionLabel={(option) => `${option.name}${option.sku ? ` (${option.sku})` : ''}`}
                                value={products.find(p => p.id === ligne.productId) || null}
                                onChange={(_, newValue) => handleProductSelect(index, newValue)}
                                renderInput={(params) => (
                                  <TextField {...params} size="small" placeholder="Rechercher..." />
                                )}
                                sx={{ minWidth: 200 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                fullWidth
                                value={ligne.designation}
                                onChange={(e) => handleLigneChange(index, 'designation', e.target.value)}
                                placeholder="Désignation"
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={ligne.quantiteCommandee}
                                onChange={(e) => handleLigneChange(index, 'quantiteCommandee', parseFloat(e.target.value))}
                                inputProps={{ min: 0, step: 1 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={ligne.quantiteRecue}
                                onChange={(e) => handleLigneChange(index, 'quantiteRecue', parseFloat(e.target.value))}
                                inputProps={{ min: 0, step: 1 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={ligne.prixUnitaire}
                                onChange={(e) => handleLigneChange(index, 'prixUnitaire', parseFloat(e.target.value))}
                                inputProps={{ min: 0, step: 0.001 }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleRemoveLigne(index)} color="error">
                                <RemoveIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingId ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  )
}
