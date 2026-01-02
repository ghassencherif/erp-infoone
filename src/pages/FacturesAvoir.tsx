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
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/apiClient'
import DashboardLayout from '../components/layouts/DashboardLayout'

interface Fournisseur {
  id: number
  nom: string
}

interface FactureFournisseur {
  id: number
  numero: string
}

interface Product {
  id: number
  name: string
  sku: string | null
  price: number
}

interface LigneFactureAvoir {
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

interface FactureAvoir {
  id: number
  numero: string
  date: string
  fournisseur: Fournisseur
  factureOriginale?: FactureFournisseur
  motif: string
  montantHT: number
  montantTVA: number
  montantTTC: number
  lignes: LigneFactureAvoir[]
}

export default function FacturesAvoir() {
  const [factures, setFactures] = useState<FactureAvoir[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [facturesOriginales, setFacturesOriginales] = useState<FactureFournisseur[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [formData, setFormData] = useState({
    fournisseurId: '',
    factureOriginaleId: '',
    date: new Date().toISOString().split('T')[0],
    motif: '',
    lignes: [] as LigneFactureAvoir[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [avRes, foRes, facRes, prRes] = await Promise.all([
        api.get('/factures-avoir'),
        api.get('/fournisseurs'),
        api.get('/factures-fournisseur'),
        api.get('/products')
      ])
      setFactures(avRes.data)
      setFournisseurs(foRes.data)
      setFacturesOriginales(facRes.data)
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

  const handleOpenDialog = (facture?: FactureAvoir) => {
    if (facture) {
      setEditingId(facture.id)
      setFormData({
        fournisseurId: facture.fournisseur.id.toString(),
        factureOriginaleId: facture.factureOriginale?.id?.toString() || '',
        date: facture.date.split('T')[0],
        motif: facture.motif,
        lignes: facture.lignes.map(l => ({
          ...l,
          productId: l.productId || null
        }))
      })
    } else {
      setEditingId(null)
      setFormData({
        fournisseurId: '',
        factureOriginaleId: '',
        date: new Date().toISOString().split('T')[0],
        motif: '',
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

  const handleLigneChange = (index: number, field: keyof LigneFactureAvoir, value: any) => {
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
      // Format: Product name with serial/barcode underneath if exists
      let designation = product.name;
      if (product.serialNumber) {
        designation += `\nSN: ${product.serialNumber}`;
      } else if (product.barcode) {
        designation += `\nCode barre: ${product.barcode}`;
      }
      newLignes[index] = {
        ...ligne,
        productId: product.id,
        designation,
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
      if (!formData.fournisseurId || !formData.motif || formData.lignes.length === 0) {
        showSnackbar('Veuillez remplir tous les champs obligatoires', 'error')
        return
      }

      const data = {
        fournisseurId: parseInt(formData.fournisseurId),
        factureOriginaleId: formData.factureOriginaleId ? parseInt(formData.factureOriginaleId) : null,
        date: formData.date,
        motif: formData.motif,
        lignes: formData.lignes
      }

      if (editingId) {
        await api.put(`/factures-avoir/${editingId}`, data)
        showSnackbar('Facture d\'avoir modifiée avec succès', 'success')
      } else {
        await api.post('/factures-avoir', data)
        showSnackbar('Facture d\'avoir créée avec succès', 'success')
      }

      handleCloseDialog()
      loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showSnackbar('Erreur lors de la sauvegarde', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette facture d\'avoir ?')) {
      try {
        await api.delete(`/factures-avoir/${id}`)
        showSnackbar('Facture d\'avoir supprimée avec succès', 'success')
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
      field: 'factureOriginale',
      headerName: 'Facture Originale',
      width: 150,
      valueGetter: (value) => value?.numero || '-'
    },
    {
      field: 'motif',
      headerName: 'Motif',
      width: 200
    },
    {
      field: 'montantTTC',
      headerName: 'Montant TTC',
      width: 130,
      valueGetter: (value) => `${value?.toFixed(3)} TND`
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
            <AssignmentReturnIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Factures d'Avoir Fournisseur</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gestion des avoirs fournisseurs</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}
          >
            Nouvelle Facture d'Avoir
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
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{factures.filter(f => f.statut === 'VALIDÉ').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Validés</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{(factures.reduce((sum, f) => sum + f.montantTTC, 0)).toFixed(3)}</Typography>}
              <Typography variant="caption" color="text.secondary">Montant Total (TTC)</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Rechercher par numéro de facture ou fournisseur..."
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
                f.fournisseur?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
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
            {editingId ? 'Modifier la Facture d\'Avoir' : 'Nouvelle Facture d\'Avoir'}
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
                  <InputLabel>Facture Originale (optionnel)</InputLabel>
                  <Select
                    value={formData.factureOriginaleId}
                    label="Facture Originale (optionnel)"
                    onChange={(e) => setFormData({ ...formData, factureOriginaleId: e.target.value })}
                  >
                    <MenuItem value="">Aucune</MenuItem>
                    {facturesOriginales.map((fac) => (
                      <MenuItem key={fac.id} value={fac.id}>
                        {fac.numero}
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
                  label="Motif *"
                  fullWidth
                  value={formData.motif}
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  placeholder="Ex: Retour marchandise défectueuse"
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
                            <TableCell width={100}>HT</TableCell>
                            <TableCell width={100}>TVA</TableCell>
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
                        <Typography variant="h6" color="error">
                          <strong>Total Avoir TTC: {totals.montantTTC.toFixed(3)} TND</strong>
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
