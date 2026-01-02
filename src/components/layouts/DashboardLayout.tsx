import React, { useEffect, useState } from 'react'
import {
  Avatar,
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  ExitToApp as LogoutIcon,
  Business as BusinessIcon,
  ShoppingCart as ShoppingCartIcon,
  ExpandLess,
  ExpandMore,
  PointOfSale as PointOfSaleIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/apiClient'

const drawerWidth = 260

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [fournisseursOpen, setFournisseursOpen] = useState(false)
  const [clientsOpen, setClientsOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/settings/company')
        setLogoUrl(res.data?.logoUrl || null)
      } catch (e) {
        setLogoUrl(null)
      }
    }
    loadSettings()
  }, [])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleFournisseursClick = () => {
    setFournisseursOpen(!fournisseursOpen)
  }

  const handleClientsClick = () => {
    setClientsOpen(!clientsOpen)
  }

  const menuItems = [
    { text: 'Tableau de Bord', icon: <DashboardIcon />, path: '/dashboard', roles: ['ADMIN', 'CASHIER', 'ACCOUNTANT', 'WAREHOUSE'] },
    { text: 'Point de Vente', icon: <PointOfSaleIcon />, path: '/pos', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Produits', icon: <InventoryIcon />, path: '/products', roles: ['ADMIN', 'CASHIER', 'WAREHOUSE'] },
    { text: 'Utilisateurs', icon: <PeopleIcon />, path: '/users', roles: ['ADMIN'] },
    { text: 'Paramètres Facture', icon: <ShoppingCartIcon />, path: '/settings/invoice', roles: ['ADMIN'] },
  ];

  const clientsMenuItems = [
    { text: 'Liste Clients', path: '/clients', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Devis Client', path: '/devis-client', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Commandes Client', path: '/commandes-client', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Commandes Caisse', path: '/commandes-caisse', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Bons Commande Client', path: '/bons-commande-client', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Bons Livraison Client', path: '/bons-livraison-client', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Factures Client', path: '/factures-client', roles: ['ADMIN', 'CASHIER'] },
    { text: 'Avoirs Client', path: '/avoirs-client', roles: ['ADMIN', 'CASHIER'] },
  ]

  const fournisseursMenuItems = [
    { text: 'Liste Fournisseurs', path: '/fournisseurs', roles: ['ADMIN', 'ACCOUNTANT'] },
    { text: 'Bons de Commande', path: '/bons-commande', roles: ['ADMIN', 'ACCOUNTANT'] },
    { text: 'Bons de Réception', path: '/bons-reception', roles: ['ADMIN', 'ACCOUNTANT'] },
    { text: 'Factures Fournisseur', path: '/factures-fournisseur', roles: ['ADMIN', 'ACCOUNTANT'] },
    { text: 'Factures d\'Avoir', path: '/factures-avoir', roles: ['ADMIN', 'ACCOUNTANT'] },
    { text: 'Devis', path: '/devis', roles: ['ADMIN', 'ACCOUNTANT'] },
    { text: 'Historique Achats', path: '/historique-achats', roles: ['ADMIN', 'ACCOUNTANT'] },
  ]

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  )

  const filteredClientsItems = clientsMenuItems.filter(item =>
    !item.roles || item.roles.includes(user?.role || '')
  )

  const filteredFournisseursItems = fournisseursMenuItems.filter(item =>
    !item.roles || item.roles.includes(user?.role || '')
  )

  const showClients = filteredClientsItems.length > 0
  const showFournisseurs = filteredFournisseursItems.length > 0

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}>
      <Toolbar sx={{ px: 2, py: 2, gap: 1, alignItems: 'center' }}>
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            p: 2.5,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="Logo" sx={{ height: 56, maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: '#B90202', width: 48, height: 48 }}>I</Avatar>
              <Typography variant="h6" fontWeight={800}>Infoone ERP</Typography>
            </Box>
          )}
        </Box>
      </Toolbar>

      <Divider sx={{ opacity: 0.12 }} />

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.35) transparent',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.28))',
            borderRadius: 999,
            border: '2px solid rgba(32,27,24,0.6)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.42))',
          },
        }}
      >
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 0.6, px: 1 }}>Navigation</Typography>
        <List sx={{ mt: 0.5 }}>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => navigate(item.path)}
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    color: isActive ? 'white' : 'rgba(255,255,255,0.9)',
                    bgcolor: isActive ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.02)',
                    boxShadow: isActive ? '0 12px 30px rgba(0,0,0,0.3)' : 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid rgba(185,2,2,0.35)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.08)',
                      boxShadow: isActive ? '0 14px 32px rgba(0,0,0,0.35)' : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                    },
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      left: 10,
                      top: '18%',
                      width: 6,
                      height: '64%',
                      borderRadius: 999,
                      backgroundColor: '#B90202',
                      opacity: isActive ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#B90202' : 'rgba(255,255,255,0.75)' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }} />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>

        {/* Menu Clients avec sous-menu */}
        {showClients && (
          <Box sx={{ mt: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={handleClientsClick}
                sx={{
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                  color: 'rgba(255,255,255,0.85)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Clients / Ventes" />
                {clientsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={clientsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {filteredClientsItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemButton
                        sx={{
                          pl: 5,
                          pr: 2,
                          py: 0.75,
                          borderRadius: 1.5,
                          position: 'relative',
                          color: isActive ? 'white' : 'rgba(255,255,255,0.85)',
                          bgcolor: isActive ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.03)',
                          boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.25)' : 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                          border: isActive ? '1px solid rgba(185,2,2,0.3)' : '1px solid transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': { bgcolor: isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.08)' },
                          '&:before': {
                            content: '""',
                            position: 'absolute',
                            left: 20,
                            top: '24%',
                            width: 4,
                            height: '52%',
                            borderRadius: 999,
                            backgroundColor: '#B90202',
                            opacity: isActive ? 1 : 0,
                            transition: 'opacity 0.2s ease',
                          },
                        }}
                        selected={isActive}
                        onClick={() => navigate(item.path)}
                      >
                        <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }} />
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            </Collapse>
          </Box>
        )}

        {/* Menu Fournisseurs avec sous-menu */}
        {showFournisseurs && (
          <Box sx={{ mt: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={handleFournisseursClick}
                sx={{
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                  color: 'rgba(255,255,255,0.85)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText primary="Fournisseurs" />
                {fournisseursOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={fournisseursOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {filteredFournisseursItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemButton
                        sx={{
                          pl: 5,
                          pr: 2,
                          py: 0.75,
                          borderRadius: 1.5,
                          position: 'relative',
                          color: isActive ? 'white' : 'rgba(255,255,255,0.85)',
                          bgcolor: isActive ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.03)',
                          boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.25)' : 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                          border: isActive ? '1px solid rgba(185,2,2,0.3)' : '1px solid transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': { bgcolor: isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.08)' },
                          '&:before': {
                            content: '""',
                            position: 'absolute',
                            left: 20,
                            top: '24%',
                            width: 4,
                            height: '52%',
                            borderRadius: 999,
                            backgroundColor: '#B90202',
                            opacity: isActive ? 1 : 0,
                            transition: 'opacity 0.2s ease',
                          },
                        }}
                        selected={isActive}
                        onClick={() => navigate(item.path)}
                      >
                        <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }} />
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            </Collapse>
          </Box>
        )}
      </Box>

      <Divider sx={{ opacity: 0.12, mt: 'auto' }} />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: '#B90202', width: 40, height: 40 }}>
          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>{user?.name || 'Utilisateur'}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }} noWrap>{user?.email}</Typography>
        </Box>
        <IconButton size="small" onClick={logout} sx={{ color: 'rgba(255,255,255,0.9)' }}>
          <LogoutIcon />
        </IconButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'linear-gradient(180deg, #201B18 0%, #2d2620 100%)',
              color: 'white',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'linear-gradient(180deg, #201B18 0%, #2d2620 100%)',
              color: 'white',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export default DashboardLayout
