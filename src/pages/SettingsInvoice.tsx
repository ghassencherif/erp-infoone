import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import {
  Box, TextField, Typography, Button, Snackbar, Alert, Grid,
  Card, CardContent, Tabs, Tab, Paper, Skeleton, Divider, Chip
} from '@mui/material';
import {
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  LocalShipping as ShippingIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import api from '../services/apiClient';

interface CompanySetting {
  id: number;
  name: string;
  logoUrl?: string;
  address?: string;
  matricule?: string;
  phone?: string;
  email?: string;
  website?: string;
  rib?: string;
  footerNote?: string;
  invoicePrefix?: string;
  invoiceStartNumber?: number;
  devisPrefix?: string;
  devisStartNumber?: number;
  commandePrefix?: string;
  commandeStartNumber?: number;
  avoirPrefix?: string;
  avoirStartNumber?: number;
  deliveryFeeDefault?: number;
  deliveryTvaRate?: number;
}

export default function SettingsInvoice() {
  const [settings, setSettings] = useState<CompanySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });
  const [activeTab, setActiveTab] = useState<'company' | 'numbering' | 'delivery'>('company');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/company');
      setSettings(res.data);
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur chargement paramètres', severity: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateField = (field: keyof CompanySetting, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      const { name, logoUrl, address, matricule, phone, email, website, rib, footerNote,
              invoicePrefix, invoiceStartNumber, devisPrefix, devisStartNumber,
              commandePrefix, commandeStartNumber, avoirPrefix, avoirStartNumber,
              deliveryFeeDefault, deliveryTvaRate } = settings;
      const res = await api.put('/settings/company', { 
        name, logoUrl, address, matricule, phone, email, website, rib, footerNote,
        invoicePrefix, invoiceStartNumber, devisPrefix, devisStartNumber,
        commandePrefix, commandeStartNumber, avoirPrefix, avoirStartNumber,
        deliveryFeeDefault, deliveryTvaRate
      });
      setSettings(res.data);
      setSnackbar({ open: true, message: 'Paramètres sauvegardés', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Erreur sauvegarde', severity: 'error' });
    }
  };

  return (
    <DashboardLayout>
      <Paper elevation={0} sx={{ p: 3, background: 'linear-gradient(135deg, #201B18 0%, #2d2620 100%)', color: 'white', mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Paramètres Facture</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Gérez les informations de votre entreprise, la numérotation et les frais de livraison</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading || !settings}
            sx={{ bgcolor: '#B90202', '&:hover': { bgcolor: '#8B0101' } }}
          >
            Enregistrer
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Card key={i} sx={{ p: 2 }}>
              <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={300} />
            </Card>
          ))}
        </Box>
      ) : !settings ? (
        <Typography color="error">Erreur chargement des paramètres</Typography>
      ) : (
        <Paper elevation={1}>
          <Tabs
            value={activeTab}
            onChange={(_e, v) => setActiveTab(v)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<BusinessIcon />} iconPosition="start" value="company" label="Informations Entreprise" />
            <Tab icon={<ReceiptIcon />} iconPosition="start" value="numbering" label="Numérotation Documents" />
            <Tab icon={<ShippingIcon />} iconPosition="start" value="delivery" label="Frais de Livraison" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Onglet Informations Entreprise */}
            {activeTab === 'company' && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Informations de base</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nom Société"
                      value={settings.name}
                      onChange={e => updateField('name', e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Matricule Fiscale"
                      value={settings.matricule || ''}
                      onChange={e => updateField('matricule', e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Adresse"
                      value={settings.address || ''}
                      onChange={e => updateField('address', e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Téléphone"
                      value={settings.phone || ''}
                      onChange={e => updateField('phone', e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      type="email"
                      value={settings.email || ''}
                      onChange={e => updateField('email', e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Site Web"
                      value={settings.website || ''}
                      onChange={e => updateField('website', e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="RIB Bancaire"
                      value={settings.rib || ''}
                      onChange={e => updateField('rib', e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>

                  <Divider sx={{ width: '100%', my: 2 }} />

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Logo & Branding</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="URL du Logo"
                      value={settings.logoUrl || ''}
                      onChange={e => updateField('logoUrl', e.target.value)}
                      fullWidth
                      variant="outlined"
                      helperText="URL complète du fichier image (PNG, JPG, SVG)"
                    />
                  </Grid>
                  {settings.logoUrl && (
                    <Grid item xs={12}>
                      <Card sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 2 }}>Aperçu du logo:</Typography>
                        <Box component="img" src={settings.logoUrl} alt="Logo" sx={{ maxHeight: 100, maxWidth: 250, objectFit: 'contain' }} />
                      </Card>
                    </Grid>
                  )}

                  <Divider sx={{ width: '100%', my: 2 }} />

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Pied de Page</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Note Pied de Page"
                      value={settings.footerNote || ''}
                      onChange={e => updateField('footerNote', e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      helperText="Texte affiché en bas de vos documents (factures, devis, etc.)"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Onglet Numérotation Documents */}
            {activeTab === 'numbering' && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Configuration de numérotation</Typography>
                <Grid container spacing={3}>
                  {[
                    { label: 'Factures', prefix: 'invoicePrefix', startNum: 'invoiceStartNumber' },
                    { label: 'Devis', prefix: 'devisPrefix', startNum: 'devisStartNumber' },
                    { label: 'Commandes', prefix: 'commandePrefix', startNum: 'commandeStartNumber' },
                    { label: 'Avoirs', prefix: 'avoirPrefix', startNum: 'avoirStartNumber' }
                  ].map((doc) => (
                    <Grid item xs={12} key={doc.label}>
                      <Card sx={{ p: 2, bgcolor: '#fafafa' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <ReceiptIcon color="primary" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{doc.label}</Typography>
                          <Chip label={`${(settings as any)[doc.prefix]}${String((settings as any)[doc.startNum] || 1).padStart(6, '0')}`} size="small" />
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              label="Préfixe"
                              value={(settings as any)[doc.prefix] || ''}
                              onChange={e => updateField(doc.prefix as any, e.target.value)}
                              fullWidth
                              size="small"
                              variant="outlined"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              label="Numéro de départ"
                              type="number"
                              value={(settings as any)[doc.startNum] || 1}
                              onChange={e => updateField(doc.startNum as any, Number(e.target.value))}
                              fullWidth
                              size="small"
                              variant="outlined"
                              inputProps={{ min: 1 }}
                            />
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Onglet Livraison */}
            {activeTab === 'delivery' && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Paramètres de livraison</Typography>
                <Card sx={{ p: 3, bgcolor: '#fafafa' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Configurez les frais de livraison par défaut appliqués aux commandes. Le montant saisi est <strong>TTC</strong>, la TVA est automatiquement séparée et calculée.
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Frais de livraison par défaut (TTC)"
                        type="number"
                        value={settings.deliveryFeeDefault ?? ''}
                        onChange={e => updateField('deliveryFeeDefault', e.target.value === '' ? null : Number(e.target.value))}
                        fullWidth
                        inputProps={{ min: 0, step: 0.001 }}
                        helperText="Montant total TTC en DT"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="TVA livraison (%)"
                        type="number"
                        value={settings.deliveryTvaRate ?? ''}
                        onChange={e => updateField('deliveryTvaRate', e.target.value === '' ? null : Number(e.target.value))}
                        fullWidth
                        inputProps={{ min: 0, step: 0.1 }}
                        helperText="Taux de TVA en %"
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>

                  {settings.deliveryFeeDefault && settings.deliveryTvaRate !== undefined && (
                    <Card sx={{ mt: 3, p: 2, bgcolor: '#e8f5e9', borderLeft: 4, borderColor: '#4caf50' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Calcul exemple</Typography>
                      {(() => {
                        const ttc = settings.deliveryFeeDefault;
                        const rate = settings.deliveryTvaRate || 0;
                        const ht = ttc / (1 + rate / 100);
                        const tva = ttc - ht;
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.875rem' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Montant HT :</span>
                              <strong>{ht.toFixed(3)} DT</strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>TVA ({rate}%) :</span>
                              <strong>{tva.toFixed(3)} DT</strong>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Montant TTC :</span>
                              <strong>{ttc.toFixed(3)} DT</strong>
                            </Box>
                          </Box>
                        );
                      })()}
                    </Card>
                  )}
                </Card>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
