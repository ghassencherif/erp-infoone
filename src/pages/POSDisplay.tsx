import React, { useEffect, useState } from 'react'
import { Box, Typography, Paper, Divider } from '@mui/material'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'

interface CartLine {
  productId: number | null
  designation: string
  quantity: number
  prixUnitaireHT: number
  tauxTVA: number
}

interface Totals {
  ht: number
  tva: number
  timbreFiscal: number
  ttc: number
}

const POSDisplay: React.FC = () => {
  const [cart, setCart] = useState<CartLine[]>([])
  const [totals, setTotals] = useState<Totals>({ ht: 0, tva: 0, timbreFiscal: 0, ttc: 0 })

  useEffect(() => {
    if (!window.BroadcastChannel) {
      console.warn('BroadcastChannel not supported')
      return
    }

    const channel = new BroadcastChannel('pos-display')
    channel.onmessage = (event) => {
      if (event.data.type === 'UPDATE') {
        setCart(event.data.cart || [])
        setTotals(event.data.totals || { ht: 0, tva: 0, timbreFiscal: 0, ttc: 0 })
      } else if (event.data.type === 'CLEAR') {
        setCart([])
        setTotals({ ht: 0, tva: 0, timbreFiscal: 0, ttc: 0 })
      }
    }

    return () => channel.close()
  }, [])

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      bgcolor: '#1a1a2e', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        bgcolor: '#16213e', 
        borderBottom: '4px solid #0f3460',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1
      }}>
        <ShoppingCartIcon sx={{ fontSize: 40, color: '#00d4ff' }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#00d4ff' }}>
            Infoone
          </Typography>
          <Typography variant="h5" sx={{ color: '#e94560', mt: 1 }}>
            Votre Commande
          </Typography>
        </Box>
      </Box>

      {/* Cart Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
        {cart.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            opacity: 0.6
          }}>
            <ShoppingCartIcon sx={{ fontSize: 120, mb: 3, color: '#0f3460' }} />
            <Typography variant="h3" fontWeight="bold">Panier Vide</Typography>
            <Typography variant="h5" sx={{ mt: 2, color: '#aaa' }}>En attente d'articles...</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {cart.map((line, i) => (
              <Paper 
                key={i} 
                elevation={6}
                sx={{ 
                  p: 1, 
                  bgcolor: '#16213e', 
                  border: '2px solid #0f3460',
                  borderRadius: 2
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#00d4ff', mb: 1 }}>
                      {line.designation}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Typography variant="h6" sx={{ color: '#aaa' }}>
                        Qté: <span style={{ color: 'white', fontWeight: 'bold' }}>{line.quantity}</span>
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#aaa' }}>
                        Prix TTC: <span style={{ color: 'white', fontWeight: 'bold' }}>{(line.prixUnitaireHT * (1 + line.tauxTVA / 100)).toFixed(3)} TND</span>
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#aaa' }}>
                        TVA: <span style={{ color: 'white', fontWeight: 'bold' }}>{line.tauxTVA}%</span>
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: '#e94560', ml: 4 }}>
                    {(line.prixUnitaireHT * line.quantity * (1 + line.tauxTVA / 100)).toFixed(3)} TND
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Totals Footer */}
      {cart.length > 0 && (
        <Box sx={{ 
          p: 2, 
          bgcolor: '#16213e', 
          
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
           
            {totals.timbreFiscal > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ color: '#aaa' }}>Timbre Fiscal</Typography>
                <Typography variant="h4" fontWeight="bold">{totals.timbreFiscal.toFixed(3)} TND</Typography>
              </Box>
            )}
            <Divider sx={{ my: 2, bgcolor: '#0f3460', height: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h2" fontWeight="bold" sx={{ color: '#00d4ff' }}>TOTAL TTC</Typography>
              <Typography variant="h1" fontWeight="bold" sx={{ color: '#e94560' }}>
                {totals.ttc.toFixed(3)} TND
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default POSDisplay
