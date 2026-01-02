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
import AssignmentIcon from '@mui/icons-material/Assignment'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/apiClient'
import DashboardLayout from '../components/layouts/DashboardLayout'

interface Fournisseur {
  id: number
  nom: string
}

interface Product {
  id: number
  name: string
  sku: string | null
  price: number
}

interface LigneDevis {
  id?: number
  productId: number | null
  product?: Product
  designation: string
  quantite: number
  prixUnitaire: number
  tauxTVA: number
  montantHT: number
  montantTVA: number
}

interface Devis {
  id: number
  numero: string
  date: string
  dateValidite: string
  fournisseur: Fournisseur
  montantHT: number
  montantTVA: number
  montantTTC: number
  statut: string
  lignes: LigneDevis[]
}

export default function Devis() {
  const [devisList, setDevisList] = useState<Devis[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [formData, setFormData] = useState({
    fournisseurId: '',
    date: new Date().toISOString().split('T')[0],
    dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    statut: 'EN_ATTENTE',
    lignes: [] as LigneDevis[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [devRes, foRes, prRes] = await Promise.all([
        api.get('/devis'),
        api.get('/fournisseurs'),
        api.get('/products')
      ])
      setDevisList(devRes.data)
      setFournisseurs(foRes.data)
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

  const handleOpenDialog = (devis?: Devis) => {
    if (devis) {
      setEditingId(devis.id)
      setFormData({
        fournisseurId: devis.fournisseur.id.toString(),
        date: devis.date.split('T')[0],
        dateValidite: devis.dateValidite.split('T')[0],
        statut: devis.statut,
        lignes: devis.lignes.map(l => ({
          ...l,
          productId: l.productId || null
        }))
      })
    } else {
      setEditingId(null)
      setFormData({
        fournisseurId: '',
        date: new Date().toISOString().split('T')[0],
        dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        statut: 'EN_ATTENTE',
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
          quantite: 1,
          prixUnitaire: 0,
          tauxTVA: 19,
          montantHT: 0,
          montantTVA: 0
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

  const handleLigneChange = (index: number, field: keyof LigneDevis, value: any) => {
    const newLignes = [...formData.lignes]
    newLignes[index] = { ...newLignes[index], [field]: value }
    
    // Recalculer les montants
    const ligne = newLignes[index]
    ligne.montantHT = ligne.quantite * ligne.prixUnitaire
    ligne.montantTVA = ligne.montantHT * ligne.tauxTVA / 100
    
    setFormData({ ...formData, lignes: newLignes })
  }

  const handleProductSelect = (index: number, product: Product | null) => {
    if (product) {
      const newLignes = [...formData.lignes]
      const ligne = newLignes[index]
      newLignes[index] = {
        ...ligne,
        productId: product.id,
        designation: product.name,
        prixUnitaire: product.price,
        montantHT: ligne.quantite * product.price,
        montantTVA: ligne.quantite * product.price * ligne.tauxTVA / 100
      }
      setFormData({ ...formData, lignes: newLignes })
    }
  }

  const calculateTotals = () => {
    const montantHT = formData.lignes.reduce((sum, l) => sum + l.montantHT, 0)
    const montantTVA = formData.lignes.reduce((sum, l) => sum + l.montantTVA, 0)
    const montantTTC = montantHT + montantTVA
    return { montantHT, montantTVA, montantTTC }
  }

  const handleSubmit = async () => {
    try {
      if (!formData.fournisseurId || formData.lignes.length === 0) {
        showSnackbar('Veuillez remplir tous les champs obligatoires', 'error')
        return
      }

      const data = {
        fournisseurId: parseInt(formData.fournisseurId),
        date: formData.date,
        dateValidite: formData.dateValidite,
        statut: formData.statut,
        lignes: formData.lignes
      }

      if (editingId) {
        await api.put(`/devis/${editingId}`, data)
        showSnackbar('Devis modifié avec succès', 'success')
      } else {
        await api.post('/devis', data)
        showSnackbar('Devis créé avec succès', 'success')
      }

      handleCloseDialog()
      loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showSnackbar('Erreur lors de la sauvegarde', 'error')
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/devis/${id}/statut`, { statut: newStatus })
      showSnackbar('Statut mis à jour', 'success')
      loadData()
    } catch (error) {
      console.error('Erreur changement statut:', error)
      showSnackbar('Erreur lors du changement de statut', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      try {
        await api.delete(`/devis/${id}`)
        showSnackbar('Devis supprimé avec succès', 'success')
        loadData()
      } catch (error) {
        console.error('Erreur suppression:', error)
        showSnackbar('Erreur lors de la suppression', 'error')
      }
    }
  }

  const columns: GridColDef[] = [
    { field: 'numero', headerName: 'Numéro', width: 130 },
    {
      field: 'date',
      headerName: 'Date',
      width: 110,
      valueGetter: (value) => new Date(value).toLocaleDateString('fr-FR')
    },
    {
      field: 'dateValidite',
      headerName: 'Validité',
      width: 110,
      valueGetter: (value) => new Date(value).toLocaleDateString('fr-FR')
    },
    {
      field: 'fournisseur',
      headerName: 'Fournisseur',
      width: 200,
      valueGetter: (value) => value?.nom || ''
    },
    {
      field: 'montantTTC',
      headerName: 'Montant TTC',
      width: 130,
      valueGetter: (value) => `${value?.toFixed(3)} TND`
    },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 180,
      renderCell: (params) => (
        <Select
          value={params.row.statut}
          onChange={(e) => handleStatusChange(params.row.id, e.target.value)}
          size="small"
          fullWidth
        >
          <MenuItem value="EN_ATTENTE">En Attente</MenuItem>
          <MenuItem value="ACCEPTE">Accepté</MenuItem>
          <MenuItem value="REFUSE">Refusé</MenuItem>
          <MenuItem value="EXPIRE">Expiré</MenuItem>
        </Select>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
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

  const totals = calculateTotals()

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
            <AssignmentIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Devis</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gestion des devis et estimations</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}
          >
            Nouveau Devis
          </Button>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{devisList.length}</Typography>}
              <Typography variant="caption" color="text.secondary">Total Devis</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{devisList.filter(d => d.statut === 'BROUILLON').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Brouillons</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{devisList.filter(d => d.statut === 'VALIDÉ').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Validés</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{devisList.filter(d => d.statut === 'ACCEPTE').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Acceptés</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Rechercher par numéro de devis ou fournisseur..."
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
              rows={devisList.filter(d =>
                d.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.fournisseur?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
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
            {editingId ? 'Modifier le Devis' : 'Nouveau Devis'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={formData.statut}
                    label="Statut"
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  >
                    <MenuItem value="EN_ATTENTE">En Attente</MenuItem>
                    <MenuItem value="ACCEPTE">Accepté</MenuItem>
                    <MenuItem value="REFUSE">Refusé</MenuItem>
                    <MenuItem value="EXPIRE">Expiré</MenuItem>
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
                  label="Date de validité"
                  type="date"
                  fullWidth
                  value={formData.dateValidite}
                  onChange={(e) => setFormData({ ...formData, dateValidite: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

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
                  <>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Produit</TableCell>
                            <TableCell>Désignation</TableCell>
                            <TableCell width={80}>Qté</TableCell>
                            <TableCell width={100}>Prix Unit. HT</TableCell>
                            <TableCell width={80}>TVA %</TableCell>
                            <TableCell width={100}>Montant HT</TableCell>
                            <TableCell width={100}>Montant TVA</TableCell>
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
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={ligne.quantite}
                                  onChange={(e) => handleLigneChange(index, 'quantite', parseFloat(e.target.value))}
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
                                <TextField
                                  size="small"
                                  type="number"
                                  value={ligne.tauxTVA}
                                  onChange={(e) => handleLigneChange(index, 'tauxTVA', parseFloat(e.target.value))}
                                  inputProps={{ min: 0, step: 1 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{ligne.montantHT.toFixed(3)}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{ligne.montantTVA.toFixed(3)}</Typography>
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

                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <Typography><strong>Total HT:</strong> {totals.montantHT.toFixed(3)} TND</Typography>
                        <Typography><strong>Total TVA:</strong> {totals.montantTVA.toFixed(3)} TND</Typography>
                        <Typography variant="h6" color="primary">
                          <strong>Total TTC: {totals.montantTTC.toFixed(3)} TND</strong>
                        </Typography>
                      </Box>
                    </Box>
                  </>
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
