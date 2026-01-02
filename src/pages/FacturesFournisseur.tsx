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
  Chip,
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
import ReceiptIcon from '@mui/icons-material/Receipt'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/apiClient'
import DashboardLayout from '../components/layouts/DashboardLayout'
import { createFilterOptions } from '@mui/material/Autocomplete'

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
  reference?: string | null
  serialNumber?: string | null
  barcode?: string | null
  tvaRate?: number
  // fournisseurReference could be stored in Historique or invoice lines, but not on Product; optional for display only
  fournisseurReference?: string | null
  linkedFournisseurNames?: string[] // list of supplier names this product has been purchased from
}

interface LigneFacture {
  id?: number
  productId: number | null
  product?: Product
  designation: string
  fournisseurReference?: string
  serialNumber?: string | null
  quantite: number
  prixUnitaire: number
  tauxTVA: number
  montantHT: number
  montantTVA: number
}

interface FactureFournisseur {
  id: number
  numero: string
  date: string
  dateEcheance: string
  fournisseur: Fournisseur
  bonCommande?: BonDeCommande
  montantHT: number
  montantTVA: number
  timbreFiscal: number
  montantTTC: number
  statut: string
  lignes: LigneFacture[]
}

export default function FacturesFournisseur() {
  const [factures, setFactures] = useState<FactureFournisseur[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [bonsCommande, setBonsCommande] = useState<BonDeCommande[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [formData, setFormData] = useState({
    numero: '',
    fournisseurId: '',
    bonCommandeId: '',
    date: new Date().toISOString().split('T')[0],
    dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    statut: 'BROUILLON',
    lignes: [] as LigneFacture[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [facRes, foRes, bcRes, prRes, histRes] = await Promise.all([
        api.get('/factures-fournisseur'),
        api.get('/fournisseurs'),
        api.get('/bons-commande'),
        api.get('/products'),
        api.get('/historique-achats/all-links') // get product-supplier links
      ])
      console.log('Fournisseurs chargés:', foRes.data)
      console.log('Bons de commande chargés:', bcRes.data)
      
      // Enrich products with linked supplier names
      const linkMap = new Map<number, string[]>()
      if (histRes.data && Array.isArray(histRes.data)) {
        histRes.data.forEach((link: any) => {
          if (!linkMap.has(link.productId)) linkMap.set(link.productId, [])
          linkMap.get(link.productId)!.push(link.fournisseurNom)
        })
      }
      
      const enrichedProducts = prRes.data.map((p: Product) => ({
        ...p,
        linkedFournisseurNames: linkMap.get(p.id) || []
      }))
      
      setFactures(facRes.data)
      setFournisseurs(foRes.data)
      setBonsCommande(bcRes.data)
      setProducts(enrichedProducts)
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

  const handleOpenDialog = (facture?: FactureFournisseur) => {
    if (facture) {
      setEditingId(facture.id)
      setFormData({
        numero: facture.numero,
        fournisseurId: facture.fournisseur.id.toString(),
        bonCommandeId: facture.bonCommande?.id?.toString() || '',
        date: facture.date.split('T')[0],
        dateEcheance: facture.dateEcheance.split('T')[0],
        statut: facture.statut,
        lignes: facture.lignes.map(l => ({
          ...l,
          productId: l.productId || null
        }))
      })
    } else {
      setEditingId(null)
      setFormData({
        numero: '',
        fournisseurId: '',
        bonCommandeId: '',
        date: new Date().toISOString().split('T')[0],
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        statut: 'BROUILLON',
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
          fournisseurReference: '',
          serialNumber: '',
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

  const handleLigneChange = (index: number, field: keyof LigneFacture, value: any) => {
    const newLignes = [...formData.lignes]
    newLignes[index] = { ...newLignes[index], [field]: value }
    
    // Recalculer les montants
    const ligne = newLignes[index]
    ligne.montantHT = ligne.quantite * ligne.prixUnitaire
    ligne.montantTVA = ligne.montantHT * ligne.tauxTVA / 100
    
    setFormData({ ...formData, lignes: newLignes })
  }

  const handleProductSelect = (index: number, product: Product | null) => {
    const newLignes = [...formData.lignes]
    const ligne = newLignes[index]
    if (product) {
      // Format: Product name with serial/barcode underneath if exists
      let designation = product.name;
      if (product.serialNumber) {
        designation += `\nSN: ${product.serialNumber}`;
      } else if (product.barcode) {
        designation += `\nCode barre: ${product.barcode}`;
      }
      // Calculate HT price from TTC price
      const tvaRate = product.tvaRate || 19;
      const prixHT = product.price / (1 + tvaRate / 100);
      newLignes[index] = {
        ...ligne,
        productId: product.id,
        product: product,
        designation,
        prixUnitaire: prixHT,
        tauxTVA: tvaRate,
        montantHT: ligne.quantite * prixHT,
        montantTVA: ligne.quantite * prixHT * tvaRate / 100
      }
    } else {
      // Clear product selection
      newLignes[index] = {
        ...ligne,
        productId: null,
        product: undefined,
        designation: '',
        prixUnitaire: 0,
        montantHT: 0,
        montantTVA: 0
      }
    }
    setFormData({ ...formData, lignes: newLignes })
  }

  const filterOptions = createFilterOptions<Product>({
    stringify: (option) => {
      const parts = [
        option.name,
        option.sku || '',
        option.reference || '',
        option.fournisseurReference || '',
        ...(option.linkedFournisseurNames || [])
      ]
      return parts.join(' ')
    }
  })

  const getSortedProducts = (selectedFournisseurId: string | number) => {
    if (!selectedFournisseurId) return products
    const selectedFournisseur = fournisseurs.find(f => f.id === Number(selectedFournisseurId))
    if (!selectedFournisseur) return products
    
    const linked: Product[] = []
    const other: Product[] = []
    
    products.forEach(p => {
      if (p.linkedFournisseurNames?.includes(selectedFournisseur.nom)) {
        linked.push(p)
      } else {
        other.push(p)
      }
    })
    
    return [...linked, ...other]
  }

  const calculateTotals = () => {
    const montantHT = formData.lignes.reduce((sum, l) => sum + l.montantHT, 0)
    const montantTVA = formData.lignes.reduce((sum, l) => sum + l.montantTVA, 0)
    const timbreFiscal = 1.0
    const montantTTC = montantHT + montantTVA + timbreFiscal
    return { montantHT, montantTVA, timbreFiscal, montantTTC }
  }

  const handleSubmit = async () => {
    try {
      if (!formData.fournisseurId || formData.lignes.length === 0) {
        showSnackbar('Veuillez remplir tous les champs obligatoires', 'error')
        return
      }

      if (!editingId && !formData.numero) {
        showSnackbar('Le numéro de facture est requis', 'error')
        return
      }

      const data = {
        numero: formData.numero,
        fournisseurId: parseInt(formData.fournisseurId),
        bonCommandeId: formData.bonCommandeId ? parseInt(formData.bonCommandeId) : null,
        date: formData.date,
        dateEcheance: formData.dateEcheance,
        statut: formData.statut,
        lignes: formData.lignes
      }

      if (editingId) {
        await api.put(`/factures-fournisseur/${editingId}`, data)
        showSnackbar('Facture modifiée avec succès', 'success')
      } else {
        await api.post('/factures-fournisseur', data)
        showSnackbar('Facture créée avec succès', 'success')
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
      await api.patch(`/factures-fournisseur/${id}/statut`, { statut: newStatus })
      showSnackbar('Statut mis à jour', 'success')
      loadData()
    } catch (error) {
      console.error('Erreur changement statut:', error)
      showSnackbar('Erreur lors du changement de statut', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      try {
        await api.delete(`/factures-fournisseur/${id}`)
        showSnackbar('Facture supprimée avec succès', 'success')
        loadData()
      } catch (error) {
        console.error('Erreur suppression:', error)
        showSnackbar('Erreur lors de la suppression', 'error')
      }
    }
  }

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'PAYE': return 'success'
      case 'BROUILLON': return 'default'
      case 'ENVOYE': return 'info'
      case 'ACCEPTE': return 'success'
      case 'REFUSE': return 'error'
      case 'ANNULE': return 'error'
      case 'LIVRE': return 'success'
      default: return 'default'
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
      field: 'dateEcheance',
      headerName: 'Échéance',
      width: 110,
      valueGetter: (value) => new Date(value).toLocaleDateString('fr-FR')
    },
    {
      field: 'fournisseur',
      headerName: 'Fournisseur',
      width: 180,
      valueGetter: (value) => value?.nom || ''
    },
    {
      field: 'montantTTC',
      headerName: 'Montant TTC',
      width: 120,
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
          <MenuItem value="BROUILLON">Brouillon</MenuItem>
          <MenuItem value="ENVOYE">Envoyé</MenuItem>
          <MenuItem value="ACCEPTE">Accepté</MenuItem>
          <MenuItem value="PAYE">Payé</MenuItem>
          <MenuItem value="REFUSE">Refusé</MenuItem>
          <MenuItem value="ANNULE">Annulé</MenuItem>
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
            <ReceiptIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Factures Fournisseur</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Gestion des factures d'achat fournisseur</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: 'white', color: '#201B18', '&:hover': { bgcolor: '#f0f0f0' } }}
          >
            Nouvelle Facture
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
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{factures.filter(f => f.statut === 'EN_ATTENTE').length}</Typography>}
              <Typography variant="caption" color="text.secondary">En Attente</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{factures.filter(f => f.statut === 'PAYEE').length}</Typography>}
              <Typography variant="caption" color="text.secondary">Payées</Typography>
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
            {editingId ? 'Modifier la Facture' : 'Nouvelle Facture'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Numéro de Facture *"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                fullWidth
                required
                disabled={!!editingId}
                helperText={editingId ? "Le numéro ne peut pas être modifié" : "Entrez le numéro de facture du fournisseur"}
              />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Autocomplete
                  options={fournisseurs}
                  getOptionLabel={(option) => option.nom}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionKey={(option) => option.id}
                  value={fournisseurs.find(f => f.id === Number(formData.fournisseurId)) || null}
                  onChange={(_, newValue) => setFormData({ ...formData, fournisseurId: newValue ? newValue.id.toString() : '' })}
                  renderInput={(params) => (
                    <TextField {...params} label="Fournisseur *" placeholder="Rechercher un fournisseur..." required />
                  )}
                  noOptionsText="Aucun fournisseur disponible"
                />

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
                  label="Date d'échéance"
                  type="date"
                  fullWidth
                  value={formData.dateEcheance}
                  onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />

                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={formData.statut}
                    label="Statut"
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  >
                    <MenuItem value="BROUILLON">Brouillon</MenuItem>
                    <MenuItem value="ENVOYE">Envoyé</MenuItem>
                    <MenuItem value="ACCEPTE">Accepté</MenuItem>
                    <MenuItem value="PAYE">Payé</MenuItem>
                    <MenuItem value="REFUSE">Refusé</MenuItem>
                    <MenuItem value="ANNULE">Annulé</MenuItem>
                  </Select>
                </FormControl>
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
                            <TableCell>Réf. Fournisseur</TableCell>
                            <TableCell>Numéro de série</TableCell>
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
                                  options={getSortedProducts(formData.fournisseurId)}
                                  filterOptions={filterOptions}
                                  getOptionLabel={(option) => {
                                    const parts = [option.name]
                                    if (option.fournisseurReference) parts.push(`Ref Fournisseur: ${option.fournisseurReference}`)
                                    if (option.reference) parts.push(`Ref ERP: ${option.reference}`)
                                    if (option.sku) parts.push(`SKU: ${option.sku}`)
                                    return parts.join(' • ')
                                  }}
                                  isOptionEqualToValue={(option, value) => option.id === value.id}
                                  getOptionKey={(option) => option.id}
                                  value={ligne.product || null}
                                  onChange={(_, newValue) => handleProductSelect(index, newValue)}
                                  renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Ref Fournisseur / Ref ERP / SKU / Nom / Fournisseur" />
                                  )}
                                  renderOption={(props, option) => {
                                    const selectedFournisseur = fournisseurs.find(f => f.id === Number(formData.fournisseurId))
                                    const isLinked = selectedFournisseur && option.linkedFournisseurNames?.includes(selectedFournisseur.nom)
                                    return (
                                      <li {...props} key={option.id}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body1">{option.name}</Typography>
                                            {isLinked && <Chip label="Fournisseur lié" size="small" color="primary" />}
                                          </Box>
                                          <Typography variant="caption" color="text.secondary">
                                            {option.fournisseurReference ? `Ref Fournisseur: ${option.fournisseurReference} • ` : ''}
                                            {option.reference ? `Ref ERP: ${option.reference} • ` : ''}
                                            SKU: {option.sku || 'N/A'}
                                          </Typography>
                                          {option.linkedFournisseurNames && option.linkedFournisseurNames.length > 0 && (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                              Fournisseurs: {option.linkedFournisseurNames.join(', ')}
                                            </Typography>
                                          )}
                                        </Box>
                                      </li>
                                    )
                                  }}
                                  sx={{ minWidth: 260 }}
                                  slotProps={{
                                    popper: {
                                      sx: { width: '600px !important' }
                                    }
                                  }}
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
                                  fullWidth
                                  value={ligne.fournisseurReference || ''}
                                  onChange={(e) => handleLigneChange(index, 'fournisseurReference', e.target.value)}
                                  placeholder="Réf. fournisseur"
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  fullWidth
                                  value={ligne.serialNumber || ''}
                                  onChange={(e) => handleLigneChange(index, 'serialNumber', e.target.value)}
                                  placeholder="N° série"
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
                        <Typography><strong>Timbre Fiscal:</strong> {totals.timbreFiscal.toFixed(3)} TND</Typography>
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
