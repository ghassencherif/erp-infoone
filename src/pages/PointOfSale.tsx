import React, { useMemo, useState, useEffect, useCallback } from 'react'
import DashboardLayout from '../components/layouts/DashboardLayout'
import { 
  Box, Button, TextField, Typography, Snackbar, Alert, IconButton, Checkbox, FormControlLabel, 
  Card, Chip, Paper, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Badge 
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import ReceiptIcon from '@mui/icons-material/Receipt'
import ClearIcon from '@mui/icons-material/Clear'
import CategoryIcon from '@mui/icons-material/Category'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import api from '../services/apiClient'
import { Product } from '../types'

interface CartLine {
  productId: number | null
  designation: string
  quantity: number
  prixUnitaireHT: number
  tauxTVA: number
  costPrice: number
  serialNumber?: string
}

// Memoized product card component to prevent unnecessary re-renders
interface ProductCardProps {
  product: Product
  onAddToCart: (p: Product, matchedSerial?: string) => void
  matchedSerial?: string
}

const ProductCard = React.memo(({ product: p, onAddToCart, matchedSerial }: ProductCardProps) => {
  const isAvailable = p.isService || p.stockAvailables[0]?.quantity > 0
  return (
  <Box key={p.id}>
    <Card 
      elevation={3}
      onClick={() => onAddToCart(p, matchedSerial)}
      sx={{
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        opacity: isAvailable ? 1 : 0.5,
        transition: 'all 0.2s',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'white',
        borderRadius: 2,
        border: p.isService ? 2 : 'none',
        borderColor: p.isService ? 'info.main' : 'transparent',
        '&:hover': isAvailable ? { 
          transform: 'translateY(-6px)',
          boxShadow: 8,
          bgcolor: 'primary.main',
          color: 'white',
          '& .product-price': { color: 'white' },
          '& .product-stock': { 
            bgcolor: 'white', 
            color: 'primary.main',
            borderColor: 'white'
          }
        } : {},
        '&:active': isAvailable ? {
          transform: 'translateY(-3px)'
        } : {}
      }}
    >
      <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body1" fontWeight="bold" sx={{ mb: 1, minHeight: 48, lineHeight: 1.3 }}>
          {p.name}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ mt: 2 }}>
        <Typography 
            className="product-price"
            variant="h5" 
            fontWeight="bold" 
            color="primary.main"
            sx={{ mb: 1 }}
          >
            {p.price.toFixed(3)} TND
          </Typography>
          <Chip 
            className="product-stock"
            label={p.isService ? 'Service' : `Stock: ${p.stockAvailables[0]?.quantity ?? 0}`} 
            size="small" 
            sx={{ 
              fontWeight: 'bold',
              bgcolor: p.isService ? 'info.light' : (p.stockAvailables[0]?.quantity > 0 ? 'success.light' : 'error.light'),
              color: p.isService ? 'info.dark' : (p.stockAvailables[0]?.quantity > 0 ? 'success.dark' : 'error.dark'),
              border: 1,
              borderColor: p.isService ? 'info.main' : (p.stockAvailables[0]?.quantity > 0 ? 'success.main' : 'error.main')
            }}
          />
        </Box>
        {p.barcode && (
          <Typography variant="caption" sx={{ mt: 1, opacity: 0.6, fontSize: '0.7rem' }}>
            {p.barcode}
          </Typography>
        )}
      </Box>
    </Card>
  </Box>
  )
})

const PointOfSale: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [searchText, setSearchText] = useState('')
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success'|'error'}>({open:false,message:'',severity:'success'})
  const [cart, setCart] = useState<CartLine[]>([])
  const [printTicket, setPrintTicket] = useState(false)
  const [montantDonne, setMontantDonne] = useState<string>('')
  const [monnaieARendreVisible, setMonnaieARendreVisible] = useState(false)
  const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false)
  const [remise, setRemise] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Erreur chargement produits', severity: 'error' })
    }
  }

  const addProductToCart = useCallback((p: Product, matchedSerial?: string) => {
    // Check stock for regular products
    if (!p.isService) {
      const stock = p.stockAvailables[0]?.quantity ?? 0
      if (stock <= 0) {
        setSnackbar({ open: true, message: 'Produit en rupture de stock', severity: 'error' })
        return
      }
      
      setCart(prev => {
        const idx = prev.findIndex(l => l.productId === p.id && (!matchedSerial || l.serialNumber === matchedSerial))
        if (idx >= 0) {
          const currentQty = prev[idx].quantity
          // Check if adding one more would exceed stock
          if (currentQty >= stock) {
            setSnackbar({ open: true, message: `Stock insuffisant (max: ${stock})`, severity: 'error' })
            return prev
          }
          const copy = [...prev]
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 }
          return copy
        }
        const tvaRate = (typeof p.tvaRate === 'number' ? p.tvaRate : 19)
        const prixHT = p.price / (1 + tvaRate / 100) // price stored TTC
        
        // Only show serial number if it was scanned/typed (matchedSerial provided)
        let designation = p.name
        
        if (matchedSerial) {
          // Serial was scanned/typed - show it
          designation += `\nSN: ${matchedSerial}`
        }
        
        return [...prev, { 
          productId: p.id, 
          designation, 
          quantity: 1, 
          prixUnitaireHT: prixHT, 
          tauxTVA: tvaRate,
          costPrice: p.cost || 0,
          serialNumber: matchedSerial || undefined
        }]
      })
    } else {
      // For services, add directly without stock check
      setCart(prev => {
        const idx = prev.findIndex(l => l.productId === p.id && (!matchedSerial || l.serialNumber === matchedSerial))
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 }
          return copy
        }
        const tvaRate = (typeof p.tvaRate === 'number' ? p.tvaRate : 19)
        const prixHT = p.price / (1 + tvaRate / 100) // price stored TTC
        
        let designation = p.name
        if (matchedSerial) {
          designation += `\nSN: ${matchedSerial}`
        }
        
        return [...prev, { 
          productId: p.id, 
          designation, 
          quantity: 1, 
          prixUnitaireHT: prixHT, 
          tauxTVA: tvaRate,
          costPrice: p.cost || 0,
          serialNumber: matchedSerial || undefined
        }]
      })
    }
  }, [])

  const removeLine = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const totals = useMemo(() => {
    let ht = 0, tva = 0
    for (const l of cart) {
      const lht = l.prixUnitaireHT * l.quantity
      const ltva = lht * (l.tauxTVA/100)
      ht += lht; tva += ltva
    }
    ht = parseFloat(ht.toFixed(3))
    tva = parseFloat(tva.toFixed(3))
    const sousTotal = parseFloat((ht + tva).toFixed(3))
    const montantRemise = parseFloat((sousTotal * (remise / 100)).toFixed(3))
    const ttc = parseFloat((sousTotal - montantRemise).toFixed(3))
    return { ht, tva, sousTotal, montantRemise, ttc }
  }, [cart, remise])

  const monnaieARendre = useMemo(() => {
    const montant = parseFloat(montantDonne)
    if (isNaN(montant) || montant <= 0) return 0
    const rendu = montant - totals.ttc
    return parseFloat(rendu.toFixed(3))
  }, [montantDonne, totals.ttc])

  // Broadcast cart to customer display
  useEffect(() => {
    if (window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('pos-display')
        channel.postMessage({ type: 'UPDATE', cart, totals })
        channel.close()
      } catch (e) { /* ignore */ }
    }
  }, [cart, totals])

  const checkout = async () => {
    if (cart.length === 0) return
    try {
      const payload = { 
        items: cart.map(l => ({ productId: l.productId, quantity: l.quantity, prixUnitaireHT: l.prixUnitaireHT, tauxTVA: l.tauxTVA, serialNumber: l.serialNumber })),
        includeTimbreFiscal: false,
        printTicket: printTicket,
        montantDonne: montantDonne ? parseFloat(montantDonne) : null,
        monnaieRendue: monnaieARendre > 0 ? monnaieARendre : null,
        remise: remise  // Send discount percentage
      }
      const res = await api.post('/pos/sale', payload)
      setSnackbar({ open: true, message: `Commande créée: ${res.data.numero}`, severity: 'success' })
      
      // Print ticket if requested
      if (printTicket) {
        const printWindow = window.open(`/print-ticket/${res.data.id}`, '_blank', 'width=400,height=600')
        if (printWindow) {
          printWindow.focus()
        }
      }
      
      // Broadcast to customer display
      if (window.BroadcastChannel) {
        try {
          const channel = new BroadcastChannel('pos-display')
          channel.postMessage({ type: 'CLEAR' })
          channel.close()
        } catch (e) { /* ignore */ }
      }
      setCart([])
      setPrintTicket(false)
      setMontantDonne('')
      setMonnaieARendreVisible(false)
      setOpenCheckoutDialog(false)
      setRemise(0)
      
      // Reload page to refresh stock levels
      window.location.reload()
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Echec de la vente', severity: 'error' })
    }
  }

  const handleOpenCheckout = () => {
    if (cart.length === 0) return
    setOpenCheckoutDialog(true)
  }

  const handleCancelCheckout = () => {
    setOpenCheckoutDialog(false)
  }

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [products])

  // Count products per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1
      }
    })
    return counts
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Filter by category
      if (selectedCategory && p.category !== selectedCategory) return false
      
      // Filter by search text
      if (!searchText) return true
      const s = searchText.toLowerCase()
      return p.name.toLowerCase().includes(s) || 
             (p.reference && p.reference.toLowerCase().includes(s)) ||
             (p.barcode && p.barcode.toLowerCase().includes(s)) ||
             (p.serialNumber && p.serialNumber.toLowerCase().includes(s)) ||
             (p.sku && p.sku.toLowerCase().includes(s))
    })
  }, [products, searchText, selectedCategory])

  return (
    <DashboardLayout>
      <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa', p: 2, gap: 2 }}>

        <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0 }}>
          
          {/* Left: Categories + Products */}
          <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Search Bar */}
            <Paper elevation={3} sx={{ p: 2, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 2, bgcolor: 'white', borderRadius: 2 }}>
              <TextField 
                fullWidth
                placeholder="Rechercher un produit..."
                value={searchText} 
                onChange={(e)=>setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchText && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={()=>setSearchText('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'grey.50',
                    fontSize: '1.1rem',
                    borderRadius: 2
                  }
                }}
              />
              <TextField
                placeholder="Scanner code barre..."
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const code = (e.target as HTMLInputElement).value.trim();
                    if (!code) return;
                    try {
                      let res;
                      try {
                        res = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
                      } catch {
                        res = await api.get(`/products/serial/${encodeURIComponent(code)}`);
                      }
                      
                      const stock = res.data.stockAvailables[0]?.quantity ?? 0;
                      if (stock <= 0) {
                        setSnackbar({ open: true, message: 'Produit en rupture de stock', severity: 'error' });
                        (e.target as HTMLInputElement).value = '';
                        return;
                      }
                      
                      const matchedSerial = res.data.serialNumber && res.data.serialNumber.toLowerCase().includes(code.toLowerCase()) ? code : undefined;
                      addProductToCart(res.data, matchedSerial);
                      (e.target as HTMLInputElement).value = '';
                      setSnackbar({ open: true, message: `${res.data.name} ajouté`, severity: 'success' });
                    } catch (err: any) {
                      // Fallback: try local products by reference/barcode/serial contains
                      const localMatch = products.find(p => {
                        const c = code.toLowerCase();
                        return (p.reference && p.reference.toLowerCase() === c) ||
                               (p.barcode && p.barcode.toLowerCase() === c) ||
                               (p.serialNumber && p.serialNumber.toLowerCase().includes(c));
                      });
                      if (localMatch) {
                        const stock = localMatch.stockAvailables[0]?.quantity ?? 0;
                        if (stock <= 0) {
                          setSnackbar({ open: true, message: 'Produit en rupture de stock', severity: 'error' });
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        const matchedSerial = localMatch.serialNumber && localMatch.serialNumber.toLowerCase().includes(code.toLowerCase()) ? code : undefined;
                        addProductToCart(localMatch, matchedSerial);
                        (e.target as HTMLInputElement).value = '';
                        setSnackbar({ open: true, message: `${localMatch.name} ajouté`, severity: 'success' });
                        return;
                      }
                      setSnackbar({ open: true, message: 'Produit introuvable', severity: 'error' });
                    }
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'grey.50',
                    fontSize: '1.1rem',
                    borderRadius: 2
                  }
                }}
              />
            </Paper>

            {/* Categories Section */}
            <Paper elevation={3} sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CategoryIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">Catégories</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                {/* All Products Card */}
                <Card
                  elevation={selectedCategory === null ? 6 : 2}
                  onClick={() => setSelectedCategory(null)}
                  sx={{
                    minWidth: 140,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    bgcolor: selectedCategory === null ? 'primary.main' : 'grey.50',
                    color: selectedCategory === null ? 'white' : 'text.primary',
                    border: 2,
                    borderColor: selectedCategory === null ? 'primary.dark' : 'transparent',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                      bgcolor: selectedCategory === null ? 'primary.dark' : 'grey.100'
                    }
                  }}
                >
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <AllInclusiveIcon sx={{ fontSize: 36, mb: 1 }} />
                    <Typography variant="body1" fontWeight="bold">
                      Tous
                    </Typography>
                    <Badge 
                      badgeContent={products.length} 
                      color="secondary"
                      sx={{ 
                        '& .MuiBadge-badge': { 
                          position: 'static', 
                          transform: 'none',
                          mt: 1,
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        } 
                      }}
                    />
                  </Box>
                </Card>

                {/* Category Cards */}
                {categories.map((cat) => (
                  <Card
                    key={cat}
                    elevation={selectedCategory === cat ? 6 : 2}
                    onClick={() => setSelectedCategory(cat)}
                    sx={{
                      minWidth: 140,
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      bgcolor: selectedCategory === cat ? 'primary.main' : 'grey.50',
                      color: selectedCategory === cat ? 'white' : 'text.primary',
                      border: 2,
                      borderColor: selectedCategory === cat ? 'primary.dark' : 'transparent',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                        bgcolor: selectedCategory === cat ? 'primary.dark' : 'grey.100'
                      }
                    }}
                  >
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <CategoryIcon sx={{ fontSize: 36, mb: 1 }} />
                      <Typography variant="body1" fontWeight="bold" noWrap title={cat}>
                        {cat}
                      </Typography>
                      <Badge 
                        badgeContent={categoryCounts[cat] || 0} 
                        color="secondary"
                        sx={{ 
                          '& .MuiBadge-badge': { 
                            position: 'static', 
                            transform: 'none',
                            mt: 1,
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          } 
                        }}
                      />
                    </Box>
                  </Card>
                ))}
              </Box>
            </Paper>

            {/* Products Grid */}
            <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
                {filteredProducts.map((p) => {
                  const trimmedSearch = searchText.trim()
                  const matchesSerial = trimmedSearch && p.serialNumber && p.serialNumber.toLowerCase().includes(trimmedSearch.toLowerCase()) ? trimmedSearch : undefined
                  return (
                    <ProductCard key={p.id} product={p} matchedSerial={matchesSerial} onAddToCart={addProductToCart} />
                  )
                })}
              </Box>
              {filteredProducts.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">Aucun produit trouvé</Typography>
                </Paper>
              )}
            </Box>
          </Box>

          {/* Right: Cart & Checkout */}
          <Paper elevation={6} sx={{ flex: 1.2, display: 'flex', flexDirection: 'column', minWidth: 520, maxWidth: 640, borderRadius: 2, bgcolor: 'white' }}>
            <Box sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCartIcon sx={{ fontSize: 24 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold">Panier</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                    {cart.length} article{cart.length > 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              {cart.length > 0 && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setCart([])}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    fontSize: '0.8rem',
                    py: 0.5,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      borderColor: 'white'
                    }
                  }}
                  startIcon={<ClearIcon fontSize="small" />}
                >
                  Vider
                </Button>
              )}
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#fafafa' }}>
              {cart.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                  <ShoppingCartIcon sx={{ fontSize: 80, opacity: 0.2, mb: 2 }} />
                  <Typography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>Panier vide</Typography>
                  <Typography variant="body2">Cliquez sur un produit pour commencer</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {cart.map((l, i) => (
                    <Paper key={i} elevation={2} sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: 1, borderColor: 'grey.200' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ flex: 1 }}>
                          {l.designation}
                        </Typography>
                        <IconButton size="small" onClick={() => removeLine(i)} sx={{ color: 'error.main', p: 0.5 }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <TextField
                          type="number"
                          size="small"
                          label="Qté"
                          value={l.quantity}
                          onChange={(e) => {
                            const q = Math.max(1, parseInt(e.target.value || '1'))
                            // Check stock (skip for services)
                            const product = products.find(p => p.id === l.productId)
                            if (product && !product.isService) {
                              const availableStock = product?.stockAvailables[0]?.quantity ?? 0
                              if (q > availableStock) {
                                setSnackbar({ 
                                  open: true, 
                                  message: `Stock insuffisant (disponible: ${availableStock})`, 
                                  severity: 'error' 
                                })
                                return
                              }
                            }
                            setCart(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: q } : x))
                          }}
                          inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 'bold' } }}
                          sx={{ width: 70 }}
                        />
                        <Typography variant="body2" color="text.secondary" fontWeight="bold">×</Typography>
                        <TextField
                          key={`price-${i}-${l.prixUnitaireHT}`}
                          type="number"
                          size="small"
                          label="Prix Unit. TTC"
                          defaultValue={(l.prixUnitaireHT * (1 + l.tauxTVA / 100)).toFixed(3)}
                          onBlur={(e) => {
                            const prixTTC = parseFloat(e.target.value)
                            if (isNaN(prixTTC) || prixTTC <= 0) {
                              return
                            }
                            
                            const prixHT = prixTTC / (1 + l.tauxTVA / 100)
                            const minPrice = l.costPrice * 1.07
                            if (prixHT < minPrice) {
                              setSnackbar({ 
                                open: true, 
                                message: `Le prix ne peut pas être inférieur à ${(minPrice * (1 + l.tauxTVA / 100)).toFixed(3)} TND`, 
                                severity: 'error' 
                              })
                              return
                            }
                            
                            setCart(prev => prev.map((x, idx) => idx === i ? { ...x, prixUnitaireHT: prixHT } : x))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur()
                            }
                          }}
                          inputProps={{ min: 0, step: 0.001, style: { textAlign: 'center' } }}
                          sx={{ width: 130 }}
                        />
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="body1" fontWeight="bold" color="primary.dark">
                          {(l.prixUnitaireHT * l.quantity * (1 + l.tauxTVA / 100)).toFixed(3)} TND
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            {/* Totals & Checkout */}
            <Box sx={{ p: 2, bgcolor: 'white', borderTop: '2px solid', borderColor: 'primary.light' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight="medium" color="text.secondary">Sous-total</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {totals.sousTotal.toFixed(3)} TND
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    type="number"
                    size="small"
                    label="Remise %"
                    value={remise}
                    onChange={(e) => {
                      let v = parseFloat(e.target.value)
                      if (isNaN(v)) v = 0
                      v = Math.max(0, Math.min(100, v))
                      setRemise(v)
                    }}
                    inputProps={{ min: 0, max: 100, step: 1, style: { textAlign: 'center' } }}
                    sx={{ width: 120 }}
                  />
                  <Typography variant="body2" color="error.main" fontWeight="bold">
                    -{totals.montantRemise.toFixed(3)} TND
                  </Typography>
                </Box>
               
                <Box sx={{ 
                  borderTop: '2px solid', 
                  borderColor: 'primary.main', 
                  pt: 1.5, 
                  mt: 0.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight="bold" color="primary.dark">TOTAL</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.dark">
                      {totals.ttc.toFixed(3)} TND
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={handleOpenCheckout}
                    disabled={cart.length === 0}
                    sx={{
                      py: 1.2,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      bgcolor: 'success.main',
                      borderRadius: 1.5,
                      boxShadow: 3,
                      '&:hover': { 
                        bgcolor: 'success.dark',
                        boxShadow: 4
                      },
                      '&:disabled': { bgcolor: 'grey.300' }
                    }}
                    startIcon={<ReceiptIcon />}
                  >
                    ENCAISSER
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Checkout Modal */}
      <Dialog open={openCheckoutDialog} onClose={handleCancelCheckout} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontSize: '1.5rem', py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ReceiptIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold">Encaissement</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 3, p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Total */}
            <Box sx={{ p: 3, bgcolor: 'primary.light', borderRadius: 2, boxShadow: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="primary.dark">TOTAL TTC</Typography>
                <Typography variant="h3" fontWeight="bold" color="primary.dark">
                  {totals.ttc.toFixed(3)} TND
                </Typography>
              </Box>
            </Box>

            {/* Print ticket checkbox */}
            <FormControlLabel
              control={
                <Checkbox 
                  checked={printTicket} 
                  onChange={(e) => setPrintTicket(e.target.checked)}
                  sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }}
                />
              }
              label={
                <Typography variant="body1" fontWeight="medium" fontSize="1.05rem">
                  Imprimer le ticket après encaissement
                </Typography>
              }
            />

            {/* Montant donné */}
            <TextField
              label="Montant donné par le client"
              type="number"
              fullWidth
              size="medium"
              value={montantDonne}
              onChange={(e) => {
                setMontantDonne(e.target.value)
                setMonnaieARendreVisible(true)
              }}
              inputProps={{ min: 0, step: 0.001 }}
              InputProps={{
                endAdornment: <InputAdornment position="end"><Typography fontWeight="bold">TND</Typography></InputAdornment>,
                style: { fontSize: '1.3rem', fontWeight: 'bold' }
              }}
              autoFocus
            />

            {/* Monnaie à rendre */}
            {monnaieARendreVisible && montantDonne && (
              <Box 
                sx={{ 
                  p: 3, 
                  bgcolor: monnaieARendre >= 0 ? 'success.light' : 'error.light', 
                  borderRadius: 2,
                  border: '3px solid',
                  borderColor: monnaieARendre >= 0 ? 'success.main' : 'error.main',
                  boxShadow: 3
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color={monnaieARendre >= 0 ? 'success.dark' : 'error.dark'}>
                    {monnaieARendre >= 0 ? 'Monnaie à rendre' : 'Montant insuffisant'}
                  </Typography>
                  <Typography 
                    variant="h3" 
                    fontWeight="bold" 
                    color={monnaieARendre >= 0 ? 'success.dark' : 'error.dark'}
                  >
                    {monnaieARendre >= 0 ? monnaieARendre.toFixed(3) : Math.abs(monnaieARendre).toFixed(3)} TND
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2, bgcolor: 'grey.50' }}>
          <Button 
            onClick={handleCancelCheckout} 
            variant="outlined" 
            size="large"
            sx={{ minWidth: 140, py: 1.5, fontSize: '1.1rem' }}
          >
            Annuler
          </Button>
          <Button 
            onClick={checkout} 
            variant="contained" 
            color="success"
            size="large"
            disabled={!montantDonne || monnaieARendre < 0}
            sx={{ 
              minWidth: 140, 
              py: 1.5, 
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: 3,
              '&:hover': { boxShadow: 6 }
            }}
            startIcon={<ReceiptIcon sx={{ fontSize: 24 }} />}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontSize: '1.1rem' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  )
}

export default PointOfSale
