import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Button,
  Alert,
  Card,
  Grid,
  Skeleton,
  InputAdornment
} from '@mui/material'
import { createFilterOptions } from '@mui/material/Autocomplete'
import { Refresh as RefreshIcon, History as HistoryIcon } from '@mui/icons-material'
import SearchIcon from '@mui/icons-material/Search'
import api from '../services/apiClient'
import DashboardLayout from '../components/layouts/DashboardLayout'

interface Product {
  id: number
  name: string
  sku: string | null
  reference?: string | null
}

interface HistoriqueAchat {
  id: number
  date: string
  quantite: number
  fournisseurReference: string | null
  prixUnitaire: number
  montantTotal: number
  fournisseur: {
    id: number
    nom: string
    email: string | null
    telephone: string | null
  }
  product: {
    id: number
    name: string
    sku: string | null
  }
}

export default function HistoriqueAchats() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [historique, setHistorique] = useState<HistoriqueAchat[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoadingProducts(true)
    setErrorMessage('')
    try {
      console.log('Chargement des produits...')
      const response = await api.get('/products')
      console.log('Réponse API products:', response)
      console.log('Nombre de produits:', response.data?.length)
      console.log('Premier produit:', response.data?.[0])
      setProducts(response.data || [])
      if (!response.data || response.data.length === 0) {
        setErrorMessage('Aucun produit trouvé dans la base de données. Veuillez synchroniser avec PrestaShop.')
      }
    } catch (error: any) {
      console.error('Erreur chargement produits:', error)
      setErrorMessage(`Erreur: ${error.response?.data?.error || error.message || 'Impossible de charger les produits'}`)
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadHistorique = async (productId: number) => {
    setLoading(true)
    try {
      const response = await api.get(`/fournisseurs/historique/${productId}`)
      setHistorique(response.data)
    } catch (error) {
      console.error('Erreur chargement historique:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOptions = createFilterOptions<Product>({
    stringify: (option) => `${option.name} ${option.sku || ''} ${option.reference || ''}`
  })

  const handleProductChange = (_event: any, newValue: Product | null) => {
    setSelectedProduct(newValue)
    if (newValue) {
      loadHistorique(newValue.id)
    } else {
      setHistorique([])
    }
  }

  // Calculer les statistiques par fournisseur
  const getStats = () => {
    if (historique.length === 0) return []

    const statsByFournisseur = new Map<number, {
      fournisseur: string
      nbAchats: number
      prixMin: number
      prixMax: number
      prixMoyen: number
      totalQuantite: number
      derniereDate: string
    }>()

    historique.forEach(achat => {
      const existing = statsByFournisseur.get(achat.fournisseur.id)
      
      if (existing) {
        existing.nbAchats++
        existing.prixMin = Math.min(existing.prixMin, achat.prixUnitaire)
        existing.prixMax = Math.max(existing.prixMax, achat.prixUnitaire)
        existing.totalQuantite += achat.quantite
        if (new Date(achat.date) > new Date(existing.derniereDate)) {
          existing.derniereDate = achat.date
        }
      } else {
        statsByFournisseur.set(achat.fournisseur.id, {
          fournisseur: achat.fournisseur.nom,
          nbAchats: 1,
          prixMin: achat.prixUnitaire,
          prixMax: achat.prixUnitaire,
          prixMoyen: achat.prixUnitaire,
          totalQuantite: achat.quantite,
          derniereDate: achat.date
        })
      }
    })

    // Calculer prix moyen pondéré (weighted average)
    statsByFournisseur.forEach((stats, fournisseurId) => {
      const achatsOfFournisseur = historique.filter(h => h.fournisseur.id === fournisseurId)
      const totalCost = achatsOfFournisseur.reduce((sum, a) => sum + (a.prixUnitaire * a.quantite), 0)
      const totalQty = achatsOfFournisseur.reduce((sum, a) => sum + a.quantite, 0)
      stats.prixMoyen = totalQty > 0 ? totalCost / totalQty : 0
    })

    return Array.from(statsByFournisseur.values()).sort((a, b) => a.prixMoyen - b.prixMoyen)
  }

  const stats = getStats()

  // Trouver le meilleur prix
  const meilleurPrix = historique.length > 0 
    ? Math.min(...historique.map(h => h.prixUnitaire))
    : 0

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
            <HistoryIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Historique des Achats</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Suivi de l'historique d'achat par produit</Typography>
            </Box>
          </Box>
          <Button 
            startIcon={<RefreshIcon />}
            onClick={() => loadProducts()}
            sx={{ color: 'white', border: '1px solid white' }}
          >
            Actualiser
          </Button>
        </Paper>

        <Box sx={{ mb: 4 }}>
          <Autocomplete
            options={products}
            filterOptions={filterOptions}
            getOptionLabel={(option) => {
              const parts = [option.name]
              if (option.sku) parts.push(`SKU: ${option.sku}`)
              if (option.reference) parts.push(`REF ERP: ${option.reference}`)
              return parts.join(' • ')
            }}
            getOptionKey={(option) => option.id}
            value={selectedProduct}
            onChange={handleProductChange}
            loading={loadingProducts}
            noOptionsText={products.length === 0 ? "Aucun produit disponible" : "Aucun résultat"}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Sélectionner un produit"
                placeholder="Rechercher par nom, REF ERP ou SKU PrestaShop"
                helperText={`${products.length} produits disponibles`}
              />
            )}
            sx={{ maxWidth: 600 }}
          />
        </Box>

        {selectedProduct && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{historique.length}</Typography>}
                <Typography variant="caption" color="text.secondary">Nombre d'achats</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#B90202' }}>{meilleurPrix.toFixed(3)}</Typography>}
                <Typography variant="caption" color="text.secondary">Meilleur Prix (TND)</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{(historique.reduce((sum, h) => sum + h.montantTotal, 0)).toFixed(3)}</Typography>}
                <Typography variant="caption" color="text.secondary">Montant Total (TND)</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                {loading ? <Skeleton height={40} /> : <Typography variant="h5" sx={{ fontWeight: 700, color: '#201B18' }}>{historique.reduce((sum, h) => sum + h.quantite, 0)}</Typography>}
                <Typography variant="caption" color="text.secondary">Total Quantité</Typography>
              </Card>
            </Grid>
          </Grid>
        )}

        {loadingProducts && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Chargement des produits...</Typography>
          </Box>
        )}

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && selectedProduct && historique.length === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">
              Aucun historique d'achat trouvé pour ce produit.
            </Typography>
          </Paper>
        )}

        {!loading && selectedProduct && historique.length > 0 && (
        <>
          {/* En-tête du produit avec meilleur prix */}
          <Paper sx={{ p: 3, mb: 3, border: '2px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedProduct.name}
                </Typography>
                {selectedProduct.sku && (
                  <Typography variant="body2" color="text.secondary">
                    SKU: {selectedProduct.sku}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" color="success">
                  A vendre
                </Button>
                <Button variant="contained" color="primary">
                  A acheter
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Meilleur prix d'achat
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {meilleurPrix.toFixed(3)} HT
              </Typography>
              {historique.length > 0 && (() => {
                const bestAchat = historique.find(h => h.prixUnitaire === meilleurPrix)
                return bestAchat ? (
                  <Typography variant="body2" color="text.secondary">
                    (Fournisseur: {bestAchat.fournisseur.nom} / Réf. produit fournisseur: {bestAchat.fournisseurReference || '-'})
                  </Typography>
                ) : null
              })()}
            </Box>
          </Paper>

          {/* Tableau des prix fournisseurs */}
          <Paper sx={{ mb: 4 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 24, height: 24, bgcolor: 'white', color: 'primary.main', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                ≡
              </Box>
              <Typography variant="h6" fontWeight="bold">
                Prix fournisseurs ({stats.length})
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>Pratiqués à partir de</strong></TableCell>
                    <TableCell><strong>Fournisseurs</strong></TableCell>
                    <TableCell><strong>Réf. produit four.</strong></TableCell>
                    <TableCell align="center"><strong>Qté achat minim.</strong></TableCell>
                    <TableCell align="center"><strong>Taux TPS/TVH</strong></TableCell>
                    <TableCell align="right"><strong>Prix quantité min.</strong></TableCell>
                    <TableCell align="right"><strong>Prix unitaire HT</strong></TableCell>
                    <TableCell align="center"><strong>Remise par défaut</strong></TableCell>
                    <TableCell align="center"><strong>Délai de livraison</strong></TableCell>
                    <TableCell align="center"><strong>Réputation</strong></TableCell>
                    <TableCell align="center"><strong>Date modification</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.map((stat) => {
                    const latestAchat = historique
                      .filter(h => h.fournisseur.nom === stat.fournisseur)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                    
                    return (
                      <TableRow
                        key={stat.fournisseur}
                        sx={{
                          bgcolor: stat.prixMoyen === meilleurPrix ? 'success.light' : 'inherit',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <TableCell>
                          {new Date(stat.derniereDate).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="medium">{stat.fournisseur}</Typography>
                            {stat.prixMoyen === meilleurPrix && (
                              <Chip 
                                label="Meilleur" 
                                color="success" 
                                size="small"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {latestAchat?.fournisseurReference ? (
                            <Chip 
                              label={latestAchat.fournisseurReference} 
                              size="small" 
                              variant="outlined"
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center">1</TableCell>
                        <TableCell align="center">19%</TableCell>
                        <TableCell align="right">{stat.prixMin.toFixed(3)}</TableCell>
                        <TableCell align="right">
                          <strong>{stat.prixMoyen.toFixed(3)}</strong>
                        </TableCell>
                        <TableCell align="center">0%</TableCell>
                        <TableCell align="center">-</TableCell>
                        <TableCell align="center">-</TableCell>
                        <TableCell align="center">
                          {new Date(stat.derniereDate).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Tableau détaillé de tous les achats */}
          <Paper>
            <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              Historique Détaillé
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Fournisseur</strong></TableCell>
                    <TableCell><strong>Réf. Fournisseur</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell align="right"><strong>Quantité</strong></TableCell>
                    <TableCell align="right"><strong>Prix Unitaire HT</strong></TableCell>
                    <TableCell align="right"><strong>Montant Total HT</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historique.map((achat) => (
                    <TableRow key={achat.id}>
                      <TableCell>
                        {new Date(achat.date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>{achat.fournisseur.nom}</TableCell>
                      <TableCell>
                        {achat.fournisseurReference ? (
                          <Chip label={achat.fournisseurReference} size="small" color="primary" variant="outlined" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {achat.fournisseur.email && (
                          <Box sx={{ fontSize: '0.875rem' }}>
                            📧 {achat.fournisseur.email}
                          </Box>
                        )}
                        {achat.fournisseur.telephone && (
                          <Box sx={{ fontSize: '0.875rem' }}>
                            📞 {achat.fournisseur.telephone}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">{achat.quantite}</TableCell>
                      <TableCell align="right">
                        {achat.prixUnitaire.toFixed(3)} TND
                      </TableCell>
                      <TableCell align="right">
                        <strong>{achat.montantTotal.toFixed(3)} TND</strong>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
      </Box>
    </DashboardLayout>
  )
}
