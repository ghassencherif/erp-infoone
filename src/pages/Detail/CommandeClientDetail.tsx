import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import { Box, Typography, Paper, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PrintIcon from '@mui/icons-material/Print'
import api from '../../services/apiClient'

const CommandeClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        console.log('Fetching commande client with ID:', id)
        const res = await api.get(`/commandes-client/${id}`)
        console.log('Commande client response:', res.data)
        setDoc(res.data)
      } catch (e: any) {
        console.error('Error fetching commande client:', e)
        setError(e.response?.data?.error || 'Erreur chargement commande client')
      } finally {
        setLoading(false)
      }
    }
    fetchDoc()
  }, [id])

  if (loading) return (
    <DashboardLayout>
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
    </DashboardLayout>
  )

  if (error || !doc) return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Document introuvable'}</Alert>
        <Button startIcon={<ArrowBackIcon />} sx={{ mt: 2 }} onClick={() => navigate(-1)}>Retour</Button>
      </Box>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">Commande Client {doc.numero}</Typography>
            <Typography variant="body2" color="text.secondary">Client: {doc.client?.name}</Typography>
          </Box>
          <Box>
            <IconButton onClick={() => window.print() }>
              <PrintIcon />
            </IconButton>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
          </Box>
        </Box>
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="body2">Date: {new Date(doc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Typography>
            <TableContainer sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Désignation</TableCell>
                    <TableCell>Qté</TableCell>
                    <TableCell>Prix HT</TableCell>
                    <TableCell>TVA</TableCell>
                    <TableCell>Montant HT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {doc.lignes.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.designation}</TableCell>
                      <TableCell>{l.quantite}</TableCell>
                      <TableCell>{l.prixUnitaireHT.toFixed(3)}</TableCell>
                      <TableCell>{l.tauxTVA}%</TableCell>
                      <TableCell>{l.montantHT.toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, mt: 2 }}>
              <Typography>HT: <b>{doc.montantHT.toFixed(3)} TND</b></Typography>
              <Typography>TVA: <b>{doc.montantTVA.toFixed(3)} TND</b></Typography>
              <Typography>TTC: <b>{doc.montantTTC.toFixed(3)} TND</b></Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>
  )
}

export default CommandeClientDetail