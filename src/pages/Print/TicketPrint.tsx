import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import api from '../../services/apiClient';
import '../../styles/print-ticket.css';

interface CompanySetting {
  name: string;
  address?: string;
  matricule?: string;
  phone?: string;
  email?: string;
}

interface Ligne {
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
}

interface Commande {
  numero: string;
  date: string;
  montantHT: number;
  montantTVA: number;
  timbreFiscal?: number;
  montantTTC: number;
  montantDonne?: number;
  monnaieRendue?: number;
  remise?: number;  // Discount percentage
  lignes?: Ligne[];
  deliveryFee?: number;
  deliveryTvaRate?: number;
}

export default function TicketPrint() {
  const { id } = useParams();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [company, setCompany] = useState<CompanySetting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [companyRes, commandeRes] = await Promise.all([
          api.get('/settings/company'),
          api.get(`/commandes-client/${id}`)
        ]);
        setCompany(companyRes.data);
        setCommande(commandeRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && commande) {
      // Auto print after load
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, commande]);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!commande) {
    return <Box sx={{ p: 4 }}>Commande introuvable</Box>;
  }

  const deliveryRate = commande.deliveryTvaRate ?? 7;
  const deliveryFeeTTC = (commande.deliveryFee ?? 0) * (1 + deliveryRate / 100);

  return (
    <div className="print-ticket-content">
      {/* Header */}
      <div className="ticket-header">
        <h1>{company?.name || 'INFOONE'}</h1>
        {company?.address && <div>{company.address}</div>}
        {company?.phone && <div>Tél: {company.phone}</div>}
        {company?.matricule && <div>MF: {company.matricule}</div>}
      </div>

      {/* Info */}
      <div className="ticket-info">
        <div><strong>Ticket N°:</strong> {commande.numero}</div>
        <div><strong>Date:</strong> {new Date(commande.date).toLocaleString('fr-FR')}</div>
      </div>

      {/* Items */}
      <table className="ticket-table" style={{ marginBottom: '12px' }}>
        <thead>
          <tr>
            <th style={{ width: '60%' }}>Article</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Qté</th>
            <th style={{ width: '25%', textAlign: 'right' }}>Prix</th>
          </tr>
        </thead>
        <tbody>
          {commande.lignes?.map((ligne, idx) => {
            // Calculate TTC prices
            const puTTC = ligne.prixUnitaireHT * (1 + ligne.tauxTVA / 100);
            // Split designation by newline to show serial/barcode in smaller text
            const designationLines = ligne.designation?.split('\n') || [ligne.designation || ''];
            return (
              <tr key={idx}>
                <td>
                  <div>{designationLines[0]}</div>
                  {designationLines.slice(1).map((line, i) => (
                    <div key={i} style={{ fontSize: '7pt', color: '#666' }}>{line}</div>
                  ))}
                </td>
                <td style={{ textAlign: 'center' }}>{ligne.quantite}</td>
                <td style={{ textAlign: 'right' }}>{puTTC.toFixed(3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="ticket-total">
        {commande.remise > 0 && (
          <div className="ticket-total-line">
            <span>Remise ({commande.remise}%):</span>
            <span style={{ color: '#d32f2f' }}>
              -{(commande.montantHT * (commande.remise / (100 - commande.remise))).toFixed(3)} TND
            </span>
          </div>
        )}
        {(commande.timbreFiscal ?? 0) > 0 && (
          <div className="ticket-total-line">
            <span>Timbre Fiscal:</span>
            <span>{commande.timbreFiscal.toFixed(3)} TND</span>
          </div>
        )}
        <div className="ticket-total-line grand-total">
          <span>TOTAL TTC:</span>
          <span>{commande.montantTTC.toFixed(3)} TND</span>
        </div>
      </div>

      {/* Payment info */}
      {(commande.montantDonne || commande.monnaieRendue) && (
        <div className="ticket-payment">
          {commande.montantDonne && (
            <div className="ticket-payment-line">
              <span>Montant reçu:</span>
              <span>{commande.montantDonne.toFixed(3)} TND</span>
            </div>
          )}
          {commande.monnaieRendue && commande.monnaieRendue > 0 && (
            <div className="ticket-payment-line">
              <span>Monnaie rendue:</span>
              <span>{commande.monnaieRendue.toFixed(3)} TND</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="ticket-footer">
        <div>Merci de votre visite</div>
        <div>À bientôt!</div>
      </div>
    </div>
  );
}
