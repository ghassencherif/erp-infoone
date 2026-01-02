import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Typography,
  Alert,
  Chip
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

interface OrderTrackingDialogProps {
  open: boolean;
  orderId: number;
  orderNumber: string;
  onClose: () => void;
  onSubmit: (data: OrderTrackingData) => Promise<void>;
  onStartReturn?: (data: ReturnTrackingData) => Promise<void>;
  onCompleteReturn?: (data: { returnNote?: string }) => Promise<void>;
  tracking?: {
    transporter?: string;
    trackingNumber?: string;
    deliveryStatus?: string;
    deliveryDate?: string;
    deliveryNote?: string;
    bonLivraisonId?: number | null;
    bonLivraisonNumero?: string | null;
    returnStatus?: string;
    returnTrackingNumber?: string;
    returnDate?: string;
    returnNote?: string;
    returnCreatedAvoirId?: number | null;
    factureId?: number | null;
    factureNumero?: string | null;
  };
}

export interface OrderTrackingData {
  transporter: 'ARAMEX' | 'FIRST_DELIVERY' | 'OUR_COMPANY';
  trackingNumber?: string;
  deliveryNote?: string;
}

export interface ReturnTrackingData {
  transporter: 'ARAMEX' | 'FIRST_DELIVERY' | 'OUR_COMPANY';
  trackingNumber?: string;
  returnNote?: string;
}

const transporterColors: Record<string, string> = {
  ARAMEX: '#FF2B00',
  FIRST_DELIVERY: '#00AA00',
  OUR_COMPANY: '#000000'
};

const deliveryStatusLabels: Record<string, string> = {
  PENDING: 'En attente',
  PICKED_UP: 'Collecté',
  IN_TRANSIT: 'En transit',
  OUT_FOR_DELIVERY: 'En cours de livraison',
  DELIVERED: 'Livré',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé'
};

const returnStatusLabels: Record<string, string> = {
  PENDING: 'En attente retour',
  IN_TRANSIT: 'Retour en transit',
  STOCKED: 'Retourné en stock'
};

export const OrderTrackingDialog: React.FC<OrderTrackingDialogProps> = ({
  open,
  orderId: _orderId,
  orderNumber,
  onClose,
  onSubmit,
  tracking
}) => {
  const [transporter, setTransporter] = useState<'ARAMEX' | 'FIRST_DELIVERY' | 'OUR_COMPANY'>(
    (tracking?.transporter as any) || 'OUR_COMPANY'
  );
  const [trackingNumber, setTrackingNumber] = useState(tracking?.trackingNumber || '');
  const [deliveryNote, setDeliveryNote] = useState(tracking?.deliveryNote || '');
  const [returnTrackingNumber, setReturnTrackingNumber] = useState(tracking?.returnTrackingNumber || '');
  const [returnNote, setReturnNote] = useState(tracking?.returnNote || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      setError('');
      setLoading(true);

      if ((transporter !== 'OUR_COMPANY') && !trackingNumber.trim()) {
        setError('Tracking number required for Aramex and First Delivery');
        return;
      }

      await onSubmit({
        transporter,
        trackingNumber: trackingNumber.trim() || undefined,
        deliveryNote: deliveryNote.trim() || undefined
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating order');
    } finally {
      setLoading(false);
    }
  };

  const handleStartReturn = async () => {
    if (!onStartReturn) return;
    try {
      setError('');
      setLoading(true);

      if (transporter !== 'OUR_COMPANY' && !returnTrackingNumber.trim()) {
        setError('Tracking retour requis pour le transporteur');
        return;
      }

      await onStartReturn({
        transporter,
        trackingNumber: returnTrackingNumber.trim() || undefined,
        returnNote: returnNote.trim() || undefined
      });
    } catch (err: any) {
      setError(err.message || 'Erreur retour');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReturn = async () => {
    if (!onCompleteReturn) return;
    try {
      setError('');
      setLoading(true);
      await onCompleteReturn({ returnNote: returnNote.trim() || undefined });
    } catch (err: any) {
      setError(err.message || 'Erreur validation retour');
    } finally {
      setLoading(false);
    }
  };

  const isDelivered = tracking?.deliveryStatus === 'DELIVERED';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShippingIcon sx={{ color: '#1976d2' }} />
          <div>
            <div>Suivi de commande</div>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Commande #{orderNumber}
            </Typography>
          </div>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {isDelivered && (
          <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              ✅ Livré le {new Date(tracking.deliveryDate!).toLocaleDateString('fr-FR')}
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {tracking?.deliveryStatus && !isDelivered && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              STATUT ACTUEL
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <Chip
                label={deliveryStatusLabels[tracking.deliveryStatus] || tracking.deliveryStatus}
                size="small"
                sx={{ mr: 1 }}
              />
              {tracking.transporter && (
                <Chip
                  label={tracking.transporter}
                  size="small"
                  sx={{
                    bgcolor: transporterColors[tracking.transporter],
                    color: '#fff'
                  }}
                />
              )}
            </Typography>
            {tracking.trackingNumber && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
                Numéro de suivi: {tracking.trackingNumber}
              </Typography>
            )}
          </Box>
        )}

        {tracking?.bonLivraisonNumero && (
          <Box sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#666' }}>Bon de Livraison lié</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                {tracking.bonLivraisonNumero}
              </Typography>
            </Box>
            {tracking.bonLivraisonId && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.open(`/print/bon-livraison/${tracking.bonLivraisonId}`, '_blank')}
              >
                Voir / Imprimer
              </Button>
            )}
          </Box>
        )}

        {/* Retour section */}
        <Box sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Suivi Retour</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              Statut: {tracking?.returnStatus ? (returnStatusLabels[tracking.returnStatus] || tracking.returnStatus) : 'Non démarré'}
            </Typography>
            {tracking?.returnTrackingNumber && (
              <Typography variant="body2">Tracking retour: {tracking.returnTrackingNumber}</Typography>
            )}
            {tracking?.returnDate && (
              <Typography variant="body2">Date retour: {new Date(tracking.returnDate).toLocaleString('fr-FR')}</Typography>
            )}
            {tracking?.returnCreatedAvoirId && tracking.factureNumero && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Avoir généré pour facture {tracking.factureNumero} (ID {tracking.returnCreatedAvoirId})
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            <TextField
              label="Tracking retour"
              value={returnTrackingNumber}
              onChange={(e) => setReturnTrackingNumber(e.target.value)}
              size="small"
              fullWidth
              disabled={tracking?.returnStatus === 'STOCKED'}
            />
            <TextField
              label="Note retour"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
              disabled={tracking?.returnStatus === 'STOCKED'}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleStartReturn}
                disabled={loading || tracking?.returnStatus === 'IN_TRANSIT' || tracking?.returnStatus === 'STOCKED'}
              >
                Démarrer retour
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleCompleteReturn}
                disabled={loading || tracking?.returnStatus === 'STOCKED'}
              >
                Valider retour en stock
              </Button>
            </Box>
          </Box>
        </Box>

        {!isDelivered && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Transporteur</InputLabel>
              <Select
                value={transporter}
                onChange={(e) => setTransporter(e.target.value as any)}
                label="Transporteur"
              >
                <MenuItem value="OUR_COMPANY">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: transporterColors.OUR_COMPANY
                      }}
                    />
                    Notre entreprise
                  </Box>
                </MenuItem>
                <MenuItem value="ARAMEX">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: transporterColors.ARAMEX
                      }}
                    />
                    Aramex
                  </Box>
                </MenuItem>
                <MenuItem value="FIRST_DELIVERY">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: transporterColors.FIRST_DELIVERY
                      }}
                    />
                    First Delivery
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {transporter !== 'OUR_COMPANY' && (
              <>
                <TextField
                  label="Numéro de suivi"
                  placeholder="Ex: ARAMEX123456789"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  fullWidth
                  size="small"
                  helperText={`Obligatoire pour ${transporter === 'ARAMEX' ? 'Aramex' : 'First Delivery'}`}
                />

                <Alert icon={<InfoIcon />} severity="info" sx={{ p: 1.5 }}>
                  <Typography variant="caption">
                    Le statut sera automatiquement synchronisé via l'API de {transporter === 'ARAMEX' ? 'Aramex' : 'First Delivery'}
                  </Typography>
                </Alert>
              </>
            )}

            <TextField
              label="Note de livraison (optionnel)"
              placeholder="Ex: Livrer entre 9h-17h, pas le weekend..."
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
            />

            {transporter === 'OUR_COMPANY' && (
              <Alert severity="warning" sx={{ p: 1.5 }}>
                <Typography variant="caption">
                  ⚠️ Vous pourrez marquer comme livré manuellement une fois la livraison effectuée
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        {!isDelivered && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour le statut'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
