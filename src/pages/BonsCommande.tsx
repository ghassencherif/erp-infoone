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
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
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

interface LigneBonCommande {
  id?: number
  productId: number | null
  product?: Product
  designation: string
  quantite: number
  prixUnitaireHT: number
  tauxTVA: number
  montantHT: number
  montantTVA: number
  montantTTC: number
}

interface BonDeCommande {
  id: number
  numero: string
  fournisseurId: number
  fournisseur: Fournisseur
  date: string
  dateEcheance: string | null
  statut: string
  montantHT: number
  montantTVA: number
  montantTTC: number
  notes: string | null
  lignes: LigneBonCommande[]
}

const statutLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  ANNULE: 'Annulé',
  LIVRE: 'Livré',
  PAYE: 'Payé'
}

const statutColors: Record<string, any> = {
  BROUILLON: 'default',
  ENVOYE: 'info',
  ACCEPTE: 'success',
  REFUSE: 'error',
  ANNULE: 'warning',
  LIVRE: 'primary',
  PAYE: 'success'
}

export default function BonsCommande() {
  const [bonsCommande, setBonsCommande] = useState<BonDeCommande[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [formData, setFormData] = useState({
    fournisseurId: 0,
    date: new Date().toISOString().split('T')[0],
    dateEcheance: '',
    notes: '',
    lignes: [] as LigneBonCommande[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [bcRes, foRes, prRes] = await Promise.all([
        api.get('/bons-commande'),
        api.get('/fournisseurs'),
        api.get('/products')
      ])
      setBonsCommande(bcRes.data)
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

  const handleOpenDialog = (bon?: BonDeCommande) => {
    if (bon) {
      setEditingId(bon.id)
      setFormData({
        fournisseurId: bon.fournisseurId,
        date: bon.date.split('T')[0],
        dateEcheance: bon.dateEcheance ? bon.dateEcheance.split('T')[0] : '',
        notes: bon.notes || '',
        lignes: bon.lignes.map(l => ({
          ...l,
          productId: l.product?.id || null
        }))
      })
    } else {
      setEditingId(null)
      setFormData({
        fournisseurId: 0,
        date: new Date().toISOString().split('T')[0],
        dateEcheance: '',
        notes: '',
        lignes: []
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingId(null)
  }

  const ajouterLigne = () => {
    setFormData({
      ...formData,
      lignes: [
        ...formData.lignes,
        {
          productId: null,
          designation: '',
          quantite: 1,
          prixUnitaireHT: 0,
          tauxTVA: 19,
          montantHT: 0,
          montantTVA: 0,
          montantTTC: 0
        }
      ]
    })
  }

  const supprimerLigne = (index: number) => {
    const newLignes = [...formData.lignes]
    newLignes.splice(index, 1)
    setFormData({ ...formData, lignes: newLignes })
  }

  const updateLigne = (index: number, field: keyof LigneBonCommande, value: any) => {
    const newLignes = [...formData.lignes]
    newLignes[index] = { ...newLignes[index], [field]: value }

    // Si on change le produit, mettre à jour la désignation et le prix
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value)
      if (product) {
        // Format: Product name with serial/barcode underneath if exists
        let designation = product.name;
        if (product.serialNumber) {
          designation += `\nSN: ${product.serialNumber}`;
        } else if (product.barcode) {
          designation += `\nCode barre: ${product.barcode}`;
        }
        newLignes[index].designation = designation
        newLignes[index].prixUnitaireHT = product.price || 0
      }
    }

    // Recalculer les montants
    const ligne = newLignes[index]
    ligne.montantHT = ligne.quantite * ligne.prixUnitaireHT
    ligne.montantTVA = ligne.montantHT * (ligne.tauxTVA / 100)
    ligne.montantTTC = ligne.montantHT + ligne.montantTVA

    setFormData({ ...formData, lignes: newLignes })
  }

  const handleSave = async () => {
    if (!formData.fournisseurId || formData.lignes.length === 0) {
      showSnackbar('Veuillez sélectionner un fournisseur et ajouter au moins une ligne', 'error')
      return
    }

    try {
      if (editingId) {
        await api.put(`/bons-commande/${editingId}`, {
          ...formData,
          statut: bonsCommande.find(b => b.id === editingId)?.statut || 'BROUILLON'
        })
        showSnackbar('Bon de commande modifié avec succès', 'success')
      } else {
        await api.post('/bons-commande', formData)
        showSnackbar('Bon de commande créé avec succès', 'success')
      }
      handleCloseDialog()
      loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showSnackbar('Erreur lors de la sauvegarde', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bon de commande ?')) {
      try {
        await api.delete(`/bons-commande/${id}`)
        showSnackbar('Bon de commande supprimé avec succès', 'success')
        loadData()
      } catch (error) {
        console.error('Erreur suppression:', error)
        showSnackbar('Erreur lors de la suppression', 'error')
      }
    }
  }

  const handleChangeStatut = async (id: number, statut: string) => {
    try {
      await api.patch(`/bons-commande/${id}/statut`, { statut })
      showSnackbar('Statut mis à jour avec succès', 'success')
      loadData()
    } catch (error) {
      console.error('Erreur changement statut:', error)
      showSnackbar('Erreur lors du changement de statut', 'error')
    }
  }

  const columns: GridColDef[] = [
    { field: 'numero', headerName: 'Numéro', width: 150 },
    {
      field: 'fournisseur',
      headerName: 'Fournisseur',
      width: 200,
      valueGetter: (value, row) => row.fournisseur?.nom || ''
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      valueGetter: (value) => new Date(value).toLocaleDateString('fr-FR')
    },
    {
      field: 'montantTTC',
      headerName: 'Montant TTC',
      width: 130,
      valueGetter: (value: number) => `${value.toFixed(3)} TND`
    },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 150,
      renderCell: (params) => (
        <FormControl size="small" fullWidth>
          <Select
            value={params.value}
            onChange={(e) => handleChangeStatut(params.row.id, e.target.value)}
            displayEmpty
          >
            {Object.keys(statutLabels).map(key => (
              <MenuItem key={key} value={key}>{statutLabels[key]}</MenuItem>
            ))}
          </Select>
        </FormControl>
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
          disabled={params.row.statut !== 'BROUILLON'}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Supprimer"
          onClick={() => handleDelete(params.row.id)}
        />
      ]
    }
  ]

  const totalHT = formData.lignes.reduce((sum, l) => sum + l.montantHT, 0)
  const totalTVA = formData.lignes.reduce((sum, l) => sum + l.montantTVA, 0)
  const totalTTC = formData.lignes.reduce((sum, l) => sum + l.montantTTC, 0)

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
            <ShoppingCartIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Bons de Commande Fournisseur</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gestion des commandes fournisseurs</Typography>
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
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{bonsCommande.length}</Typography>}
              <Typography variant="caption" color="text.secondary">Total Bons</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{bonsCommande.filter(b => b.statut === 'BROUILLON').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Brouillons</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{bonsCommande.filter(b => b.statut === 'VALIDE').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Validés</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{bonsCommande.filter(b => b.statut === 'RECEPTIONNE').length}</Typography>}
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
              rows={bonsCommande.filter(b =>
                b.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.fournisseur?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
              )}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
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
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
          <DialogTitle>
            {editingId ? 'Modifier Bon de Commande' : 'Nouveau Bon de Commande'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {/* En-tête du bon */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Fournisseur *</InputLabel>
                  <Select
                    value={formData.fournisseurId}
                    onChange={(e) => setFormData({ ...formData, fournisseurId: Number(e.target.value) })}
                    label="Fournisseur *"
                  >
                    {fournisseurs.map(f => (
                      <MenuItem key={f.id} value={f.id}>{f.nom}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Date Échéance"
                  type="date"
                  value={formData.dateEcheance}
                  onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>

              {/* Lignes de commande */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">Lignes de Commande</Typography>
                  <Button startIcon={<AddIcon />} onClick={ajouterLigne} size="small">
                    Ajouter une ligne
                  </Button>
                </Box>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produit</TableCell>
                        <TableCell>Désignation</TableCell>
                        <TableCell width={80}>Qté</TableCell>
                        <TableCell width={100}>Prix Unit. HT</TableCell>
                        <TableCell width={80}>TVA %</TableCell>
                        <TableCell width={100}>Total HT</TableCell>
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
                              onChange={(e, newValue) => updateLigne(index, 'productId', newValue?.id || null)}
                              renderInput={(params) => <TextField {...params} size="small" />}
                              sx={{ minWidth: 200 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={ligne.designation}
                              onChange={(e) => updateLigne(index, 'designation', e.target.value)}
                              size="small"
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={ligne.quantite}
                              onChange={(e) => updateLigne(index, 'quantite', Number(e.target.value))}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={ligne.prixUnitaireHT}
                              onChange={(e) => updateLigne(index, 'prixUnitaireHT', Number(e.target.value))}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={ligne.tauxTVA}
                              onChange={(e) => updateLigne(index, 'tauxTVA', Number(e.target.value))}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {ligne.montantHT.toFixed(3)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => supprimerLigne(index)} color="error">
                              <RemoveIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Totaux */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 3 }}>
                  <Box>
                    <Typography variant="body2">Total HT: <strong>{totalHT.toFixed(3)} TND</strong></Typography>
                    <Typography variant="body2">Total TVA: <strong>{totalTVA.toFixed(3)} TND</strong></Typography>
                    <Typography variant="h6">Total TTC: <strong>{totalTTC.toFixed(3)} TND</strong></Typography>
                  </Box>
                </Box>
              </Box>

              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button onClick={handleSave} variant="contained" disabled={!formData.fournisseurId || formData.lignes.length === 0}>
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  )
}
