import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/layouts/DashboardLayout'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import {
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Switch,
  FormControlLabel,
  Snackbar,
  Chip,
  Tooltip,
  Paper,
  Card,
  Skeleton,
  Grid
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import SaveIcon from '@mui/icons-material/Save'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/apiClient'
import { useAuth } from '../contexts/AuthContext'
import { Product } from '../types'

const Products: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    sku: '',
    barcode: '',
    serialNumber: '',
    description: '',
    price: '',
    priceTTC: '',
    promoPrice: '',
    promoPriceTTC: '',
    cost: '',
    costTTC: '',
    tvaRate: '19',
    quantity: '',
    invoiceableQuantity: '',
    lowStockThreshold: '0',
    isService: false,
    isOnline: false
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products')
      setProducts(response.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const syncProducts = async () => {
    setSyncing(true)
    try {
      await api.post('/products/sync')
      await fetchProducts()
      showSnackbar('Products synced successfully from PrestaShop', 'success')
    } catch (err: any) {
      showSnackbar(err.response?.data?.error || 'Sync failed', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      const tvaRate = product.tvaRate || 19
      const priceTTC = product.price // price is stored TTC
      const priceHT = priceTTC / (1 + tvaRate / 100)
      const costTTC = product.cost ? product.cost * (1 + tvaRate / 100) : 0
      const promoPriceTTC = product.promoPrice || 0
      const promoPriceHT = promoPriceTTC ? promoPriceTTC / (1 + tvaRate / 100) : 0
      setFormData({
        name: product.name,
        reference: product.reference || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        serialNumber: product.serialNumber || '',
        description: product.description || '',
        price: priceHT.toFixed(3),
        priceTTC: priceTTC.toFixed(3),
        promoPrice: promoPriceHT ? promoPriceHT.toFixed(3) : '',
        promoPriceTTC: promoPriceTTC ? promoPriceTTC.toFixed(3) : '',
        cost: product.cost?.toString() || '',
        costTTC: product.cost ? costTTC.toFixed(3) : '',
        tvaRate: tvaRate.toString(),
        quantity: product.stockAvailables[0]?.quantity.toString() || '0',
        invoiceableQuantity: product.invoiceableQuantity?.toString() || '0',
        lowStockThreshold: product.lowStockThreshold?.toString() || '0',
        isService: product.isService || false,
        isOnline: product.isOnline || false
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        reference: '',
        sku: '',
        barcode: '',
        serialNumber: '',
        description: '',
        price: '',
        priceTTC: '',
        promoPrice: '',
        promoPriceTTC: '',
        cost: '',
        costTTC: '',
        tvaRate: '19',
        quantity: '0',
        invoiceableQuantity: '0',
        lowStockThreshold: '0',
        isService: false,
        isOnline: false
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingProduct(null)
  }

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.price) {
        showSnackbar('Name and price are required', 'error')
        return
      }

      const data = {
        ...formData,
        // price is stored TTC in DB
        price: formData.priceTTC ? parseFloat(formData.priceTTC) : parseFloat(formData.price),
        promoPrice: formData.promoPriceTTC ? parseFloat(formData.promoPriceTTC) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        tvaRate: formData.tvaRate ? parseFloat(formData.tvaRate) : 19,
        quantity: parseInt(formData.quantity),
        lowStockThreshold: parseInt(formData.lowStockThreshold)
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data)
        showSnackbar('Product updated successfully', 'success')
      } else {
        await api.post('/products', data)
        showSnackbar('Product created successfully', 'success')
      }

      handleCloseDialog()
      fetchProducts()
    } catch (err: any) {
      showSnackbar(err.response?.data?.error || 'Failed to save product', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`)
        showSnackbar('Product deleted successfully', 'success')
        fetchProducts()
      } catch (err: any) {
        showSnackbar(err.response?.data?.error || 'Failed to delete product', 'error')
      }
    }
  }

  const handleToggleOnline = async (id: number) => {
    try {
      await api.patch(`/products/${id}/toggle-online`)
      showSnackbar('Product online status updated', 'success')
      fetchProducts()
    } catch (err: any) {
      showSnackbar(err.response?.data?.error || 'Failed to update online status', 'error')
    }
  }

  const { user } = useAuth()

  const baseColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'reference', headerName: 'Reference ERP', width: 140 },
    { field: 'sku', headerName: 'SKU PrestaShop', width: 140 },
    {
      field: 'price',
      headerName: 'Prix TTC (TND)',
      width: 140,
      valueFormatter: (value: any) => value != null ? `${Number(value).toFixed(3)} TND` : '0.000 TND'
    },
    { 
      field: 'stock', 
      headerName: 'Stock', 
      width: 100,
      renderCell: (params) => {
        const qty = params.value
        const threshold = params.row.lowStockThreshold || 0
        return (
          <Chip 
            label={qty} 
            color={qty <= threshold ? 'error' : 'success'}
            size="small"
          />
        )
      }
    },
    {
      field: 'isOnline',
      headerName: 'Online',
      width: 100,
      renderCell: (params) => (
        <Switch
          checked={params.row.isOnline}
          onChange={() => handleToggleOnline(params.row.id)}
          color="primary"
        />
      )
    },
    {
      field: 'prestashopId',
      headerName: 'PrestaShop ID',
      width: 120,
      renderCell: (params) => params.value || (
        <Chip label="Not synced" size="small" variant="outlined" />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Voir détails">
            <IconButton onClick={() => navigate(`/products/${params.row.id}`)} size="small" color="info">
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Modifier">
            <IconButton onClick={() => handleOpenDialog(params.row)} size="small" color="primary">
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton onClick={() => handleDelete(params.row.id)} size="small" color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      )
    }
  ]

  const adminOnlyColumns: GridColDef[] = [
    { 
      field: 'invoiceableQuantity', 
      headerName: 'Invoiceable', 
      width: 120,
      renderCell: (params) => {
        const qty = params.value || 0
        return (
          <Chip 
            label={qty} 
            color={qty > 0 ? 'info' : 'warning'}
            size="small"
          />
        )
      }
    }
  ]

  // Insert admin-only column after Stock when role is ADMIN
  const columns: GridColDef[] = (() => {
    if (user?.role === 'ADMIN') {
      const idxAfterStock = baseColumns.findIndex(c => c.field === 'stock') + 1
      const clone = [...baseColumns]
      clone.splice(idxAfterStock, 0, ...adminOnlyColumns)
      return clone
    }
    return baseColumns
  })()

  const rows = products.map((product) => ({
    ...product,
    stock: product.stockAvailables[0]?.quantity ?? 0,
    isOnline: product.isOnline || false
  }))

  // Filter rows based on search text
  const filteredRows = rows.filter((row) => {
    if (!searchText) return true
    const search = searchText.toLowerCase()
    return (
      row.name.toLowerCase().includes(search) ||
      (row.reference && row.reference.toLowerCase().includes(search)) ||
      (row.sku && row.sku.toLowerCase().includes(search)) ||
      (row.prestashopId && row.prestashopId.toLowerCase().includes(search))
    )
  })

  return (
    <DashboardLayout>
      {/* Hero Header */}
      <Paper elevation={0} sx={{ p: 3, background: 'linear-gradient(135deg, #201B18 0%, #2d2620 100%)', color: 'white', mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Inventory2Icon sx={{ fontSize: 32 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Gestion des Produits</Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Gérez votre catalogue de produits, prix et stocks</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={syncProducts}
              disabled={syncing}
              sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ bgcolor: '#B90202', '&:hover': { bgcolor: '#8B0101' } }}
            >
              Nouveau Produit
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Produits', count: products.length, color: 'primary' },
          { label: 'En Stock', count: products.filter(p => (p.stockAvailables[0]?.quantity ?? 0) > 0).length, color: 'success' },
          { label: 'Stock Faible', count: products.filter(p => (p.stockAvailables[0]?.quantity ?? 0) <= (p.lowStockThreshold || 0)).length, color: 'warning' },
          { label: 'En Ligne', count: products.filter(p => p.isOnline).length, color: 'info' }
        ].map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                {stat.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: `${stat.color}.main` }}>
                {stat.count}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SearchIcon color="action" />
        <TextField
          placeholder="Rechercher par nom, référence, SKU ou ID PrestaShop..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          fullWidth
          variant="standard"
          InputProps={{ disableUnderline: true }}
          sx={{ '& input': { p: 1 } }}
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Data Grid */}
      <Paper elevation={1}>
        {loading ? (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} />
            ))}
          </Box>
        ) : (
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10, page: 0 },
                },
              }}
              pageSizeOptions={[10, 20, 50]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': { borderBottomColor: '#f0f0f0' },
                '& .MuiDataGrid-row:hover': { bgcolor: '#f9f9f9' }
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            fontWeight: 700, 
            p: 3,
            fontSize: '1.5rem',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          {editingProduct ? '✏️ Modifier Produit' : '➕ Nouveau Produit'}
        </DialogTitle>
        <DialogContent 
          sx={{ 
            px: 3, 
            py: 3,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Nom du Produit *"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            variant="outlined"
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Référence ERP"
                fullWidth
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                helperText="Référence interne (partageable)"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="SKU PrestaShop"
                fullWidth
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                helperText="SKU PrestaShop (unique)"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Code à Barre"
                fullWidth
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Numéro de Série"
                fullWidth
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                helperText="Séparés par des virgules"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Prix TTC (TND) *"
                type="number"
                fullWidth
                value={formData.priceTTC}
                onChange={(e) => {
                  const ttc = e.target.value
                  const tvaRate = parseFloat(formData.tvaRate) || 0
                  const ht = ttc ? (parseFloat(ttc) / (1 + tvaRate / 100)).toFixed(3) : ''
                  setFormData({ ...formData, priceTTC: ttc, price: ht })
                }}
                inputProps={{ min: 0, step: 0.001 }}
                helperText="Prix de vente TTC"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Prix HT (TND)"
                type="number"
                fullWidth
                value={formData.price}
                onChange={(e) => {
                  const ht = e.target.value
                  const tvaRate = parseFloat(formData.tvaRate) || 0
                  const ttc = ht ? (parseFloat(ht) * (1 + tvaRate / 100)).toFixed(3) : ''
                  setFormData({ ...formData, price: ht, priceTTC: ttc })
                }}
                inputProps={{ min: 0, step: 0.001 }}
                helperText="Calculé automatiquement"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Prix Promo TTC (TND)"
                type="number"
                fullWidth
                value={formData.promoPriceTTC}
                onChange={(e) => {
                  const ttc = e.target.value
                  const tvaRate = parseFloat(formData.tvaRate) || 0
                  const ht = ttc ? (parseFloat(ttc) / (1 + tvaRate / 100)).toFixed(3) : ''
                  setFormData({ ...formData, promoPriceTTC: ttc, promoPrice: ht })
                }}
                inputProps={{ min: 0, step: 0.001 }}
                helperText="Optionnel"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Prix Promo HT (TND)"
                type="number"
                fullWidth
                value={formData.promoPrice}
                onChange={(e) => {
                  const ht = e.target.value
                  const tvaRate = parseFloat(formData.tvaRate) || 0
                  const ttc = ht ? (parseFloat(ht) * (1 + tvaRate / 100)).toFixed(3) : ''
                  setFormData({ ...formData, promoPrice: ht, promoPriceTTC: ttc })
                }}
                inputProps={{ min: 0, step: 0.001 }}
                helperText="Calculé automatiquement"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Coût Moyen TTC (TND)"
                type="number"
                fullWidth
                value={formData.costTTC}
                onChange={(e) => {
                  const ttc = e.target.value
                  const tvaRate = parseFloat(formData.tvaRate) || 0
                  const ht = ttc ? (parseFloat(ttc) / (1 + tvaRate / 100)).toFixed(3) : ''
                  setFormData({ ...formData, costTTC: ttc, cost: ht })
                }}
                inputProps={{ min: 0, step: 0.001 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Coût Moyen HT (TND)"
                type="number"
                fullWidth
                value={formData.cost}
                onChange={(e) => {
                  const ht = e.target.value
                  const tvaRate = parseFloat(formData.tvaRate) || 0
                  const ttc = ht ? (parseFloat(ht) * (1 + tvaRate / 100)).toFixed(3) : ''
                  setFormData({ ...formData, cost: ht, costTTC: ttc })
                }}
                inputProps={{ min: 0, step: 0.001 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="TVA (%)"
                type="number"
                fullWidth
                value={formData.tvaRate}
                onChange={(e) => {
                  const newTvaRate = e.target.value
                  const tvaRate = parseFloat(newTvaRate) || 0
                  let updates: any = { tvaRate: newTvaRate }
                  if (formData.priceTTC) {
                    const ttc = parseFloat(formData.priceTTC)
                    const ht = (ttc / (1 + tvaRate / 100)).toFixed(3)
                    updates.price = ht
                  } else if (formData.price) {
                    const ht = parseFloat(formData.price)
                    const ttc = (ht * (1 + tvaRate / 100)).toFixed(3)
                    updates.priceTTC = ttc
                  }
                  if (formData.costTTC) {
                    const ttc = parseFloat(formData.costTTC)
                    const ht = (ttc / (1 + tvaRate / 100)).toFixed(3)
                    updates.cost = ht
                  } else if (formData.cost) {
                    const ht = parseFloat(formData.cost)
                    const ttc = (ht * (1 + tvaRate / 100)).toFixed(3)
                    updates.costTTC = ttc
                  }
                  setFormData({ ...formData, ...updates })
                }}
                inputProps={{ min: 0, step: 1 }}
                helperText="Ex: 0, 7, 13, 19"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Stock"
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                inputProps={{ min: 0, step: 1 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantité Facturée"
                type="number"
                fullWidth
                value={formData.invoiceableQuantity}
                onChange={(e) => setFormData({ ...formData, invoiceableQuantity: e.target.value })}
                inputProps={{ min: 0, step: 1 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Seuil Stock Faible"
                type="number"
                fullWidth
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                inputProps={{ min: 0, step: 1 }}
                variant="outlined"
              />
            </Grid>
          </Grid>

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            variant="outlined"
          />

          <Card sx={{ p: 2.5, bgcolor: '#f5f5f5', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Options</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Service</Typography>
                  <Typography variant="caption" color="text.secondary">Produit ou service</Typography>
                </Box>
                <Switch
                  checked={formData.isService}
                  onChange={(e) => setFormData({ ...formData, isService: e.target.checked })}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>En Ligne</Typography>
                  <Typography variant="caption" color="text.secondary">Publier sur PrestaShop</Typography>
                </Box>
                <Switch
                  checked={formData.isOnline}
                  onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })}
                  color="success"
                />
              </Box>
            </Box>
          </Card>

          {formData.isOnline && !editingProduct?.prestashopId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              ℹ️ Ce produit sera synchronisé automatiquement sur PrestaShop
            </Alert>
          )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1.5, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0', flexShrink: 0 }}>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{ 
              borderColor: '#d0d0d0', 
              color: '#555',
              px: 3,
              '&:hover': { 
                borderColor: '#999',
                bgcolor: '#f5f5f5'
              }
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            startIcon={<SaveIcon />} 
            sx={{ 
              bgcolor: '#201B18', 
              px: 3,
              boxShadow: '0 4px 12px rgba(32,27,24,0.3)',
              '&:hover': { 
                bgcolor: '#0f0d0a',
                boxShadow: '0 6px 16px rgba(32,27,24,0.4)'
              } 
            }}
          >
            {editingProduct ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  )
}

export default Products
