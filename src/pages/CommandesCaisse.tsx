import React, { useEffect, useState } from 'react'
import DashboardLayout from '../components/layouts/DashboardLayout'
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar, GridRowParams } from '@mui/x-data-grid'
import { 
  Box, Button, Snackbar, Alert, IconButton, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, Menu, MenuItem as MenuItemAction, Chip
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ReceiptIcon from '@mui/icons-material/Receipt'
import PrintIcon from '@mui/icons-material/Print'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import HistoryIcon from '@mui/icons-material/History'
import DescriptionIcon from '@mui/icons-material/Description'
import api from '../services/apiClient'

interface Client {
  id: number
  name: string
}

interface Ligne {
  id: number
  designation: string
  quantite: number
  prixUnitaireHT: number
  tauxTVA: number
  montantHT: number
  montantTVA: number
  montantTTC: number
}

interface Commande {
  id: number
  numero: string
  client: Client
  clientId: number
  date: string
  statut: string
  montantHT: number
  montantTVA: number
  timbreFiscal: number
  montantTTC: number
  notes: string | null
  printTicket?: boolean
  montantDonne?: number | null
  monnaieRendue?: number | null
  factureClientId: number | null
  factureNumero?: string | null
  hasFacture?: boolean
  bonCommandeClientId: number | null
  bonCommandeNumero?: string | null
  hasBonCommande?: boolean
  bonLivraisonClientId: number | null
  bonLivraisonNumero?: string | null
  hasBonLivraison?: boolean
  lignes?: Ligne[]
}

const CommandesCaisse: React.FC = () => {
  const [rows, setRows] = useState<Commande[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success'|'error'|'warning'}>({open:false,message:'',severity:'success'})
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [bulkInvoicing, setBulkInvoicing] = useState(false)
  const [openBulkPreview, setOpenBulkPreview] = useState(false)
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false)
  const [bulkPreviewLines, setBulkPreviewLines] = useState<any[]>([])
  const [bulkPreviewTotals, setBulkPreviewTotals] = useState<{ montantHT: number; montantTVA: number; timbreFiscal: number; montantTTC: number } | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null)
  const [openHistory, setOpenHistory] = useState(false)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [historyClient, setHistoryClient] = useState<Client | null>(null)
  const [openPrintDialog, setOpenPrintDialog] = useState(false)
  const [printTicketOrder, setPrintTicketOrder] = useState<Commande | null>(null)
  const [ticketAlreadyPrinted, setTicketAlreadyPrinted] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [commandesRes, clientsRes] = await Promise.all([
        api.get('/commandes-client'),
        api.get('/clients')
      ])
      // Filter POS orders: client is DIVERS or printTicket field exists
      const list = (commandesRes.data || []).filter((c: Commande) => 
        c.client?.name === 'DIVERS' || c.printTicket !== undefined
      )
      setRows(list)
      setClients(clientsRes.data)
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur chargement', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const convertToBC = async () => {
    if (!selectedCommande) return
    try {
      const res = await api.post(`/bons-commande-client/from-commande/${selectedCommande.id}`)
      setSnackbar({ open: true, message: `Bon de commande créé: ${res.data.numero}`, severity: 'success' })
      setAnchorEl(null)
      setSelectedCommande(null)
      fetchData()
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur conversion bon de commande', severity: 'error' })
    }
  }

  const convertToBL = async () => {
    if (!selectedCommande) return
    try {
      const res = await api.post(`/bons-livraison-client/from-commande/${selectedCommande.id}`)
      setSnackbar({ open: true, message: `BL créé: ${res.data.numero}`, severity: 'success' })
      setAnchorEl(null)
      setSelectedCommande(null)
      fetchData()
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur conversion', severity: 'error' })
    }
  }

  const convertToInvoice = async () => {
    if (!selectedCommande) return
    try {
      const res = await api.post(`/factures-client/from-commande/${selectedCommande.id}`)
      setSnackbar({ open: true, message: `Facture créée: ${res.data.numero}`, severity: 'success' })
      setAnchorEl(null)
      setSelectedCommande(null)
      fetchData()
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur conversion facture', severity: 'error' })
    }
  }

  const bulkInvoiceDivers = async () => {
    if (window.confirm('Créer une facture groupée pour toutes les commandes DIVERS non-facturées ?')) {
      setBulkInvoicing(true)
      try {
        const res = await api.post('/factures-client/bulk-invoice-pos')
        setSnackbar({ open: true, message: `Facture groupée créée: ${res.data.numero}`, severity: 'success' })
        fetchData()
      } catch (e: any) {
        setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur facture groupée', severity: 'error' })
      } finally {
        setBulkInvoicing(false)
      }
    }
  }

  const handleViewHistory = async (clientId: number, clientName: string) => {
    const client = clients.find(c => c.id === clientId)
    setHistoryClient(client || { id: clientId, name: clientName })
    setOpenHistory(true)
    try {
      const res = await api.get(`/clients/${clientId}/orders`)
      setOrderHistory(res.data)
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement historique', severity: 'error' })
      setOrderHistory([])
    }
  }

  const handleOpenPrintTicket = async (commande: Commande) => {
    try {
      // Get full order details to check if ticket was already printed
      const res = await api.get(`/commandes-client/${commande.id}`)
      setPrintTicketOrder(res.data)
      setTicketAlreadyPrinted(res.data.printTicket || false)
      setOpenPrintDialog(true)
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur récupération commande', severity: 'error' })
    }
  }

  const handlePrintTicket = () => {
    if (printTicketOrder) {
      window.open(`/print-ticket/${printTicketOrder.id}`, '_blank', 'width=400,height=600')
      setOpenPrintDialog(false)
    }
  }

  const handleBulkPreview = async () => {
    if (selectedRows.length === 0) {
      setSnackbar({ open: true, message: 'Sélectionnez des commandes pour prévisualiser', severity: 'error' })
      return
    }
    const selectedCommandes = rows.filter(c => selectedRows.includes(c.id))
    const uninvoiced = selectedCommandes.filter(c => !c.hasFacture)
    if (uninvoiced.length === 0) {
      setSnackbar({ open: true, message: 'Toutes les commandes sélectionnées ont déjà une facture', severity: 'error' })
      return
    }
    setOpenBulkPreview(true)
    setBulkPreviewLoading(true)
    try {
      // Fetch full commandes with product details to get cost
      const fullCommandes = await Promise.all(
        uninvoiced.map(c => api.get(`/commandes-client/${c.id}`))
      )
      
      // Aggregate all lines with cost + 7%
      const allLines: any[] = []
      let montantHT = 0, montantTVA = 0, timbreFiscal = 0
      
      for (const res of fullCommandes) {
        const cmd = res.data
        timbreFiscal = Math.max(timbreFiscal, cmd.timbreFiscal || 0)
        
        if (cmd.lignes) {
          for (const l of cmd.lignes) {
            // Calculate new price: cost + 7%
            const productCost = l.product?.cost || 0
            const newPrixUnitaireHT = parseFloat((productCost * 1.07).toFixed(3))
            
            // Recalculate amounts with new price
            const newMontantHT = parseFloat((newPrixUnitaireHT * l.quantite).toFixed(3))
            const newMontantTVA = parseFloat((newMontantHT * (l.tauxTVA / 100)).toFixed(3))
            const newMontantTTC = parseFloat((newMontantHT + newMontantTVA).toFixed(3))
            
            montantHT += newMontantHT
            montantTVA += newMontantTVA
            
            allLines.push({
              ...l,
              prixUnitaireHT: newPrixUnitaireHT,
              montantHT: newMontantHT,
              montantTVA: newMontantTVA,
              montantTTC: newMontantTTC
            })
          }
        }
      }
      
      montantHT = parseFloat(montantHT.toFixed(3))
      montantTVA = parseFloat(montantTVA.toFixed(3))
      const montantTTC = parseFloat((montantHT + montantTVA + timbreFiscal).toFixed(3))
      
      setBulkPreviewLines(allLines)
      setBulkPreviewTotals({ montantHT, montantTVA, timbreFiscal, montantTTC })
    } catch (e: any) {
      setSnackbar({ open: true, message: 'Erreur simulation facture', severity: 'error' })
      setOpenBulkPreview(false)
    } finally {
      setBulkPreviewLoading(false)
    }
  }

  const confirmBulkInvoiceSelected = async () => {
    if (selectedRows.length === 0) return
    setBulkInvoicing(true)
    try {
      // Since we're working with POS/DIVERS only, use bulk-invoice-pos
      const res = await api.post('/factures-client/bulk-invoice-pos')
      setSnackbar({ open: true, message: `Facture groupée créée: ${res.data.numero}`, severity: 'success' })
      setOpenBulkPreview(false)
      setSelectedRows([])
      fetchData()
    } catch (e: any) {
      setSnackbar({ open: true, message: e.response?.data?.error || 'Erreur création facture', severity: 'error' })
    } finally {
      setBulkInvoicing(false)
    }
  }

  const handleStatusChange = async (commandeId: number, newStatus: string) => {
    try {
      await api.patch(`/commandes-client/${commandeId}/status`, { statut: newStatus })
      setSnackbar({ open: true, message: 'Statut modifié', severity: 'success' })
      fetchData()
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur modification statut', severity: 'error' })
    }
  }

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_VALIDATION': return 'warning'
      case 'ANNULE': return 'error'
      case 'EN_COURS_PREPARATION': return 'info'
      case 'EN_COURS_LIVRAISON': return 'primary'
      case 'LIVRE': return 'success'
      default: return 'default'
    }
  }

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE_VALIDATION': return 'En attente'
      case 'ANNULE': return 'Annulé'
      case 'EN_COURS_PREPARATION': return 'En préparation'
      case 'EN_COURS_LIVRAISON': return 'En livraison'
      case 'LIVRE': return 'Livré'
      default: return statut
    }
  }

  const columns: GridColDef<Commande>[] = [
    { 
      field: 'numero', 
      headerName: 'Numéro', 
      flex: 0.8, 
      renderCell: (params) => <span style={{ fontWeight: 'bold' }}>{params.value}</span> 
    },
    { 
      field: 'clientName', 
      headerName: 'Client', 
      flex: 1, 
      valueGetter: (_value, row) => row?.client?.name || '' 
    },
    { 
      field: 'date', 
      headerName: 'Date', 
      flex: 0.9, 
      valueGetter: (_value, row) => row?.date ? new Date(row.date).toLocaleDateString('fr-FR') + ' ' + new Date(row.date).toLocaleTimeString('fr-FR') : '' 
    },
    { 
      field: 'statut', 
      headerName: 'Statut', 
      flex: 1,
      renderCell: (params) => (
        <Select
          value={params.value}
          onChange={(e) => handleStatusChange(params.row.id, e.target.value as string)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="EN_ATTENTE_VALIDATION">En attente validation</MenuItem>
          <MenuItem value="ANNULE">Annulé</MenuItem>
          <MenuItem value="EN_COURS_PREPARATION">En cours préparation</MenuItem>
          <MenuItem value="EN_COURS_LIVRAISON">En cours livraison</MenuItem>
          <MenuItem value="LIVRE">Livré</MenuItem>
        </Select>
      )
    },
    { 
      field: 'montantTTC', 
      headerName: 'Montant TTC', 
      flex: 0.8, 
      valueGetter: (_value, row) => `${row?.montantTTC?.toFixed(3)} TND`
    },
    { 
      field: 'hasBonCommande', 
      headerName: 'BC', 
      flex: 0.7,
      renderCell: (params: { row: Commande }) => {
        if (params.row.hasBonCommande && params.row.bonCommandeNumero) {
          return (
            <Chip 
              label={params.row.bonCommandeNumero} 
              color="info" 
              size="small"
              icon={<DescriptionIcon />}
            />
          )
        }
        return null
      }
    },
    { 
      field: 'hasBonLivraison', 
      headerName: 'BL', 
      flex: 0.7,
      renderCell: (params: { row: Commande }) => {
        if (params.row.hasBonLivraison && params.row.bonLivraisonNumero) {
          return (
            <Chip 
              label={params.row.bonLivraisonNumero} 
              color="primary" 
              size="small"
              icon={<LocalShippingIcon />}
            />
          )
        }
        return null
      }
    },
    { 
      field: 'hasFacture', 
      headerName: 'Facture', 
      flex: 0.8,
      renderCell: (params: { row: Commande }) => {
        if (params.row.hasFacture && params.row.factureNumero) {
          return (
            <Chip 
              label={params.row.factureNumero} 
              color="success" 
              size="small"
              icon={<ReceiptIcon />}
            />
          )
        }
        return null
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      flex: 1.2,
      getActions: (params: GridRowParams<Commande>) => [
        <GridActionsCellItem 
          icon={<HistoryIcon />} 
          label="Historique Client" 
          onClick={() => handleViewHistory(params.row.client.id, params.row.client.name)} 
        />,
        <GridActionsCellItem 
          icon={<ReceiptIcon />} 
          label="Imprimer Ticket" 
          onClick={() => handleOpenPrintTicket(params.row)} 
        />,
        <GridActionsCellItem 
          icon={<MoreVertIcon />} 
          label="Convertir" 
          onClick={(e) => { 
            setSelectedCommande(params.row)
            setAnchorEl(e.currentTarget as any)
          }} 
        />
      ]
    }
  ]

  return (
    <DashboardLayout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Commandes Caisse (POS)</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedRows.length > 0 && (
            <>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={handleBulkPreview}
                disabled={bulkInvoicing}
              >
                Prévisualiser ({selectedRows.length})
              </Button>
              <Button 
                variant="contained" 
                color="secondary"
                startIcon={<ReceiptIcon />} 
                onClick={confirmBulkInvoiceSelected}
                disabled={bulkInvoicing}
              >
                Facturer Sélection
              </Button>
            </>
          )}
          <Button 
            variant="contained" 
            color="success" 
            onClick={bulkInvoiceDivers}
            disabled={bulkInvoicing}
          >
            Facturer DIVERS en Bulk
          </Button>
          <Button variant="outlined" onClick={fetchData}>Rafraîchir</Button>
        </Box>
      </Box>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={rows} 
          columns={columns} 
          getRowId={(r) => r.id} 
          loading={loading} 
          pageSizeOptions={[10, 25, 50]}
          slots={{ toolbar: GridToolbar }}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectedRows}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection as number[])
          }}
          isRowSelectable={(params: GridRowParams) => !params.row.hasFacture}
        />
      </Box>

      {/* Bulk preview dialog */}
      <Dialog open={openBulkPreview} onClose={() => setOpenBulkPreview(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Prévisualisation Facture Groupée POS (Prix: Cost + 7%)</DialogTitle>
        <DialogContent>
          {bulkPreviewLoading ? (
            <Typography>Chargement...</Typography>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Les prix affichés sont calculés automatiquement: <strong>Coût d'achat + 7%</strong>
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell align="right">Qté</TableCell>
                    <TableCell align="right">Prix HT (cost+7%)</TableCell>
                    <TableCell align="right">Montant HT</TableCell>
                    <TableCell align="right">TVA</TableCell>
                    <TableCell align="right">TTC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bulkPreviewLines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{l.designation}</TableCell>
                      <TableCell align="right">{l.quantite}</TableCell>
                      <TableCell align="right">{Number(l.prixUnitaireHT).toFixed(3)} TND</TableCell>
                      <TableCell align="right">{Number(l.montantHT).toFixed(3)} TND</TableCell>
                      <TableCell align="right">{Number(l.montantTVA).toFixed(3)} TND</TableCell>
                      <TableCell align="right">{Number(l.montantTTC).toFixed(3)} TND</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {bulkPreviewTotals && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                  <Typography>HT: <strong>{bulkPreviewTotals.montantHT.toFixed(3)} TND</strong></Typography>
                  <Typography>TVA: <strong>{bulkPreviewTotals.montantTVA.toFixed(3)} TND</strong></Typography>
                  <Typography>Timbre: <strong>{bulkPreviewTotals.timbreFiscal.toFixed(3)} TND</strong></Typography>
                  <Typography>TTC: <strong>{bulkPreviewTotals.montantTTC.toFixed(3)} TND</strong></Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkPreview(false)}>Fermer</Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={confirmBulkInvoiceSelected} 
            disabled={bulkPreviewLoading || bulkInvoicing}
          >
            Créer la facture
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => { setAnchorEl(null); setSelectedCommande(null) }}
      >
        <MenuItemAction onClick={convertToBC} disabled={selectedCommande?.hasBonCommande}>
          <DescriptionIcon sx={{ mr: 1, fontSize: 20 }} />
          Convertir en Bon de Commande
        </MenuItemAction>
        <MenuItemAction onClick={convertToBL} disabled={selectedCommande?.hasBonLivraison}>
          <LocalShippingIcon sx={{ mr: 1, fontSize: 20 }} />
          Convertir en Bon de Livraison
        </MenuItemAction>
        <MenuItemAction onClick={convertToInvoice} disabled={selectedCommande?.hasFacture}>
          <ReceiptIcon sx={{ mr: 1, fontSize: 20 }} />
          Convertir en Facture
        </MenuItemAction>
      </Menu>

      {/* History dialog */}
      <Dialog open={openHistory} onClose={() => setOpenHistory(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Historique des Commandes - {historyClient?.name}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {orderHistory.length === 0 ? (
            <Typography variant="body1" sx={{ py: 3, textAlign: 'center' }}>
              Aucune commande pour ce client
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Numéro</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Montant TTC</strong></TableCell>
                  <TableCell><strong>Produits</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderHistory.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell><Typography fontWeight={600}>{order.numero}</Typography></TableCell>
                    <TableCell>{new Date(order.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatutLabel(order.statut)} 
                        size="small" 
                        color={getStatutColor(order.statut) as any}
                      />
                    </TableCell>
                    <TableCell><strong>{order.montantTTC?.toFixed(3)} TND</strong></TableCell>
                    <TableCell>
                      {order.lignes?.map((ligne: any, idx: number) => (
                        <Typography key={idx} variant="body2">
                          {ligne.designation} (x{ligne.quantite})
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(false)} variant="contained">Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPrintDialog} onClose={() => setOpenPrintDialog(false)}>
        <DialogTitle>Imprimer Ticket POS</DialogTitle>
        <DialogContent>
          <Typography>
            {ticketAlreadyPrinted 
              ? "Le ticket a déjà été imprimé. Voulez-vous l'imprimer à nouveau ?" 
              : "Voulez-vous imprimer le ticket ?"}
          </Typography>
          {printTicketOrder && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Commande: {printTicketOrder.numero}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Montant: {printTicketOrder.montantTTC.toFixed(3)} TND
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPrintDialog(false)}>Annuler</Button>
          <Button onClick={handlePrintTicket} variant="contained" color="primary">
            Imprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({...s, open:false}))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  )
}

export default CommandesCaisse
