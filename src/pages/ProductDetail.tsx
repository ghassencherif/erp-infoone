import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/layouts/DashboardLayout'
import {
  Box, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  IconButton, 
  Chip, 
  Avatar, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Alert,
  Button,
  TextField 
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ReceiptIcon from '@mui/icons-material/Receipt'
import DescriptionIcon from '@mui/icons-material/Description'
import api from '../services/apiClient'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editedProduct, setEditedProduct] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [relatedData, setRelatedData] = useState({
    commandes: [],
    commandesFournisseurs: [],
    facturesClients: [],
    facturesFournisseurs: []
  })
  // Dialog state removed; navigation to dedicated pages instead

  useEffect(() => {
    if (id) {
      fetchProductDetails()
      fetchRelatedDocuments()
    }
  }, [id])

  const fetchProductDetails = async () => {
    try {
      const response = await api.get(`/products/${id}`)
      setProduct(response.data)
      setEditedProduct(response.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement du produit')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedDocuments = async () => {
    try {
      // Fetch all related documents
      const [commandes, commandesFournisseurs, facturesClients, facturesFournisseurs] = await Promise.all([
        api.get(`/products/${id}/commandes-client`),
        api.get(`/products/${id}/commandes-fournisseur`),
        api.get(`/products/${id}/factures-client`),
        api.get(`/products/${id}/factures-fournisseur`)
      ])
      
      setRelatedData({
        commandes: commandes.data,
        commandesFournisseurs: commandesFournisseurs.data,
        facturesClients: facturesClients.data,
        facturesFournisseurs: facturesFournisseurs.data
      })
    } catch (err) {
      console.error('Erreur lors du chargement des documents connexes:', err)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put(`/products/${id}`, editedProduct)
      setProduct(editedProduct)
      setEditMode(false)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde du produit')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProduct(product)
    setEditMode(false)
  }

  const openDocumentDetail = (type: 'commande'|'commandeFournisseur'|'factureClient'|'factureFournisseur', docId: number) => {
    switch (type) {
      case 'commande':
        navigate(`/commandes-client/detail/${docId}`)
        return
      case 'commandeFournisseur':
        navigate(`/bons-commande/detail/${docId}`)
        return
      case 'factureClient':
        navigate(`/factures-client/detail/${docId}`)
        return
      case 'factureFournisseur':
        navigate(`/factures-fournisseur/detail/${docId}`)
        return
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    )
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error || 'Produit introuvable'}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/products')} sx={{ mt: 2 }}>
            Retour à la liste
          </Button>
        </Box>
      </DashboardLayout>
    )
  }

  const stock = product.stockAvailables?.[0]?.quantity || 0

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/products')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ flex: 1, fontWeight: 'bold' }}>
            Détails du produit
          </Typography>
          {!editMode ? (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
            >
              Modifier
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={saving}
              >
                Annuler
              </Button>
            </Box>
          )}
        </Box>

        {/* Product Info Card */}
        <Paper elevation={3} sx={{ mb: 3 }}>
          <Box sx={{ p: 3 }}>
            {!editMode ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={2} {...({} as any)}>
                  <Avatar
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: 'grey.300',
                      fontSize: '3rem'
                    }}
                  >
                    📦
                  </Avatar>
                </Grid>
                <Grid item xs={12} md={10} {...({} as any)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ShoppingCartIcon />}
                        size="large"
                      >
                        À vendre
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<LocalShippingIcon />}
                        size="large"
                      >
                        À acheter
                      </Button>
                    </Box>
                  </Box>
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {product.description || 'Aucune description'}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3} {...({} as any)}>
                      <Typography variant="caption" color="text.secondary">Référence</Typography>
                      <Typography variant="body1" fontWeight="bold">{product.reference || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3} {...({} as any)}>
                      <Typography variant="caption" color="text.secondary">SKU</Typography>
                      <Typography variant="body1" fontWeight="bold">{product.sku || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3} {...({} as any)}>
                      <Typography variant="caption" color="text.secondary">Prix TTC (TND)</Typography>
                      <Typography variant="body1" fontWeight="bold" color="primary">
                        {product.price.toFixed(3)} TND
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3} {...({} as any)}>
                      <Typography variant="caption" color="text.secondary">Prix HT (TND) - Calculé</Typography>
                      <Typography variant="body1" fontWeight="bold" color="textSecondary">
                        {(product.price / (1 + (product.tvaRate || 19) / 100)).toFixed(3)} TND
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3} {...({} as any)}>
                      <Typography variant="caption" color="text.secondary">Stock</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1" fontWeight="bold">
                          {stock} unités
                        </Typography>
                        {product.cost ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {(product.cost * (1 + (product.tvaRate || 19) / 100)).toFixed(2)} DT
                            </Typography>
                            <Typography variant="body2">=</Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {(stock * product.cost * (1 + (product.tvaRate || 19) / 100)).toFixed(2)} DT
                            </Typography>
                          </Box>
                        ) : null}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nom du produit"
                    value={editedProduct?.name || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={editedProduct?.description || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Référence"
                    value={editedProduct?.reference || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, reference: e.target.value })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="SKU"
                    value={editedProduct?.sku || ''}
                    onChange={(e) => setEditedProduct({ ...editedProduct, sku: e.target.value })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={3} {...({} as any)}>
                  <TextField
                    fullWidth
                    label="Prix TTC (TND)"
                    type="number"
                    value={editedProduct?.price || 0}
                    onChange={(e) => {
                      const ttc = parseFloat(e.target.value) || 0
                      setEditedProduct({ ...editedProduct, price: ttc })
                    }}
                    margin="normal"
                    inputProps={{ step: 0.001 }}
                  />
                </Grid>
                <Grid item xs={12} md={3} {...({} as any)}>
                  <TextField
                    fullWidth
                    label="Prix HT (TND) - Calculé automatiquement depuis TTC"
                    type="number"
                    disabled
                    value={(editedProduct?.price / (1 + (editedProduct?.tvaRate || 19) / 100)) || 0}
                    margin="normal"
                    inputProps={{ step: 0.001 }}
                  />
                </Grid>
                <Grid item xs={12} md={3} {...({} as any)}>
                  <TextField
                    fullWidth
                    label="Stock"
                    type="number"
                    value={editedProduct?.stockAvailables?.[0]?.quantity || 0}
                    onChange={(e) => setEditedProduct({ 
                      ...editedProduct, 
                      stockAvailables: [{ 
                        ...editedProduct?.stockAvailables?.[0], 
                        quantity: parseInt(e.target.value) || 0 
                      }] 
                    })}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </Paper>

        {/* Tabs for Related Documents */}
        <Paper elevation={3}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                fontSize: '1rem',
                fontWeight: 'bold',
                py: 2
              }
            }}
          >
            <Tab 
              icon={<ShoppingCartIcon />} 
              iconPosition="start"
              label={`Commandes (${relatedData.commandes.length})`}
            />
            <Tab 
              icon={<LocalShippingIcon />} 
              iconPosition="start"
              label={`Commandes fournisseurs (${relatedData.commandesFournisseurs.length})`}
            />
            <Tab 
              icon={<ReceiptIcon />} 
              iconPosition="start"
              label={`Factures clients (${relatedData.facturesClients.length})`}
            />
            <Tab 
              icon={<DescriptionIcon />} 
              iconPosition="start"
              label={`Factures fournisseurs (${relatedData.facturesFournisseurs.length})`}
            />
          </Tabs>

          {/* Commandes Client */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
              Commandes ({relatedData.commandes.length})
            </Typography>
            {relatedData.commandes.length === 0 ? (
              <Alert severity="info">Aucune commande client trouvée pour ce produit</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Réf</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Société</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Code client</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date de commande</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Qté</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Montant HT</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>État</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relatedData.commandes.map((cmd: any) => (
                      <TableRow key={cmd.id} hover>
                        <TableCell>
                          <Button variant="text" onClick={() => openDocumentDetail('commande', cmd.id)}>
                            {cmd.numero}
                          </Button>
                        </TableCell>
                        <TableCell>{cmd.client?.name || '-'}</TableCell>
                        <TableCell>{cmd.client?.code || '-'}</TableCell>
                        <TableCell>
                          {new Date(cmd.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>{cmd.quantite}</TableCell>
                        <TableCell>{cmd.montantHT?.toFixed(3)} TND</TableCell>
                        <TableCell>
                          <Chip 
                            label={cmd.statut} 
                            color={cmd.statut === 'LIVRE' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Commandes Fournisseur */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
              Commandes fournisseurs ({relatedData.commandesFournisseurs.length})
            </Typography>
            {relatedData.commandesFournisseurs.length === 0 ? (
              <Alert severity="info">Aucune commande fournisseur trouvée pour ce produit</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Réf</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Fournisseur</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Qté</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Montant HT</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>État</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relatedData.commandesFournisseurs.map((cmd: any) => (
                      <TableRow key={cmd.id} hover>
                        <TableCell>
                          <Button variant="text" onClick={() => openDocumentDetail('commandeFournisseur', cmd.id)}>
                            {cmd.numero}
                          </Button>
                        </TableCell>
                        <TableCell>{cmd.fournisseur?.name || '-'}</TableCell>
                        <TableCell>
                          {new Date(cmd.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>{cmd.quantite}</TableCell>
                        <TableCell>{cmd.montantHT?.toFixed(3)} TND</TableCell>
                        <TableCell>
                          <Chip 
                            label={cmd.statut} 
                            color={cmd.statut === 'VALIDE' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Factures Client */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
              Factures clients ({relatedData.facturesClients.length})
            </Typography>
            {relatedData.facturesClients.length === 0 ? (
              <Alert severity="info">Aucune facture client trouvée pour ce produit</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Réf</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Qté</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Montant HT</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>État</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relatedData.facturesClients.map((fac: any) => (
                      <TableRow key={fac.id} hover>
                        <TableCell>
                          <Button variant="text" onClick={() => openDocumentDetail('factureClient', fac.id)}>
                            {fac.numero}
                          </Button>
                        </TableCell>
                        <TableCell>{fac.client?.name || '-'}</TableCell>
                        <TableCell>
                          {new Date(fac.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>{fac.quantite}</TableCell>
                        <TableCell>{fac.montantHT?.toFixed(3)} TND</TableCell>
                        <TableCell>
                          <Chip 
                            label={fac.statut} 
                            color={fac.statut === 'PAYE' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Factures Fournisseur */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
              Factures fournisseurs ({relatedData.facturesFournisseurs.length})
            </Typography>
            {relatedData.facturesFournisseurs.length === 0 ? (
              <Alert severity="info">Aucune facture fournisseur trouvée pour ce produit</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Réf</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Fournisseur</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Qté</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Montant HT</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>État</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relatedData.facturesFournisseurs.map((fac: any) => (
                      <TableRow key={fac.id} hover>
                        <TableCell>
                          <Button variant="text" onClick={() => openDocumentDetail('factureFournisseur', fac.id)}>
                            {fac.numero}
                          </Button>
                        </TableCell>
                        <TableCell>{fac.fournisseur?.name || '-'}</TableCell>
                        <TableCell>
                          {new Date(fac.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>{fac.quantite}</TableCell>
                        <TableCell>{fac.montantHT?.toFixed(3)} TND</TableCell>
                        <TableCell>
                          <Chip 
                            label={fac.statut} 
                            color={fac.statut === 'VALIDE' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Paper>
      </Box>
      
    </DashboardLayout>
  )
}

export default ProductDetail
