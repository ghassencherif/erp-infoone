import React, { useEffect, useState } from 'react'
import DashboardLayout from '../components/layouts/DashboardLayout'
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Switch, Snackbar, Alert,
  Paper, Card, CardContent, Chip, Skeleton, Stack
} from '@mui/material'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PeopleIcon from '@mui/icons-material/People'
import SaveIcon from '@mui/icons-material/Save'
import api from '../services/apiClient'

const roles = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CASHIER', label: 'Caissier' },
  { value: 'ACCOUNTANT', label: 'Comptable' },
  { value: 'WAREHOUSE', label: 'Magasinier' }
]

const Users: React.FC = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'CASHIER', active: true
  })
  const [openDelete, setOpenDelete] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => { loadUsers() }, [])
  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data)
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement utilisateurs', severity: 'error' })
    } finally { setLoading(false) }
  }

  const handleOpenDialog = (user = null) => {
    setEditingUser(user)
    setFormData(user ? {
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role,
      active: user.active
    } : { name: '', email: '', password: '', role: 'CASHIER', active: true })
    setOpenDialog(true)
  }
  const handleCloseDialog = () => { setOpenDialog(false); setEditingUser(null) }

  const handleSave = async () => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData)
        setSnackbar({ open: true, message: 'Utilisateur modifié', severity: 'success' })
      } else {
        await api.post('/users', formData)
        setSnackbar({ open: true, message: 'Utilisateur ajouté', severity: 'success' })
      }
      setOpenDialog(false)
      loadUsers()
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur sauvegarde', severity: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteId}`)
      setSnackbar({ open: true, message: 'Utilisateur supprimé', severity: 'success' })
      setOpenDelete(false)
      loadUsers()
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur suppression', severity: 'error' })
    }
  }

  const columns = [
    { field: 'name', headerName: 'Nom', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'role', headerName: 'Rôle', flex: 1, renderCell: (params) => {
      const roleObj = roles.find(r => r.value === params.value);
      return roleObj ? roleObj.label : params.value;
    } },
    { field: 'active', headerName: 'Actif', flex: 0.5, renderCell: (params) => params.value ? 'Oui' : 'Non' },
    { field: 'createdAt', headerName: 'Créé le', flex: 1, valueGetter: (params) => new Date(params.value).toLocaleDateString('fr-FR') },
    { field: 'actions', type: 'actions', headerName: 'Actions', flex: 0.7,
      getActions: (params) => [
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenDialog(params.row)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => { setDeleteId(params.row.id); setOpenDelete(true); }} />
      ]
    }
  ]

  return (
    <DashboardLayout>
      {/* Hero Header */}
      <Paper elevation={0} sx={{ p: 3, background: 'linear-gradient(135deg, #201B18 0%, #2d2620 100%)', color: 'white', mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PeopleIcon sx={{ fontSize: 32 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Gestion des Utilisateurs</Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Gérez les accès et les rôles de vos utilisateurs</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#B90202', '&:hover': { bgcolor: '#8B0101' } }}
          >
            Ajouter Utilisateur
          </Button>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Total', count: users.length, color: 'primary' },
          { label: 'Actifs', count: users.filter((u: any) => u.active).length, color: 'success' },
          { label: 'Admins', count: users.filter((u: any) => u.role === 'ADMIN').length, color: 'warning' },
          { label: 'Caissiers', count: users.filter((u: any) => u.role === 'CASHIER').length, color: 'info' }
        ].map((stat) => (
          <Card key={stat.label} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {stat.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: `${stat.color}.main` }}>
                {stat.count}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Data Grid */}
      <Paper elevation={1}>
        {loading ? (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={60} />
            ))}
          </Box>
        ) : (
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={users}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.id}
              pageSizeOptions={[10, 25]}
              sx={{
                '& .MuiDataGrid-cell': { borderBottomColor: '#f0f0f0' },
                '& .MuiDataGrid-row:hover': { bgcolor: '#f9f9f9' }
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
          {editingUser ? '✏️ Modifier Utilisateur' : '➕ Ajouter Utilisateur'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Nom complet"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
            variant="outlined"
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            fullWidth
            required
            variant="outlined"
          />
          <TextField
            label="Mot de passe"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            fullWidth
            variant="outlined"
            helperText={editingUser ? "Laisser vide pour ne pas changer" : "Requis pour les nouveaux utilisateurs"}
          />
          <FormControl fullWidth>
            <InputLabel>Rôle</InputLabel>
            <Select
              value={formData.role}
              label="Rôle"
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              {roles.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Card sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Utilisateur Actif</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formData.active ? 'Peut accéder à la plateforme' : 'Accès désactivé'}
                </Typography>
              </Box>
              <Switch
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
            </Box>
          </Card>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ bgcolor: '#201B18', '&:hover': { bgcolor: '#0f0d0a' } }}
          >
            {editingUser ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>⚠️ Supprimer Utilisateur</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Voulez-vous vraiment supprimer cet utilisateur ? Cette action ne peut pas être annulée.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  )
}

export default Users
