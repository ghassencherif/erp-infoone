import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import api from '../../services/apiClient';
import { numberToWordsFr } from '../../utils/numberToWords';

interface CompanySetting { 
  name: string; 
  logoUrl?: string; 
  address?: string; 
  matricule?: string; 
  phone?: string; 
  email?: string; 
  rib?: string;
  footerNote?: string;
}

interface Ligne { 
  designation: string; 
  quantite: number; 
  prixUnitaireHT: number; 
  tauxTVA: number; 
  montantHT?: number; 
  montantTVA?: number; 
  montantTTC?: number;
  serialNumberUsed?: string | null;
  product?: { reference?: string | null; name: string; }; 
}

interface DocBase { 
  numero: string; 
  date: string; 
  client?: { 
    code?: string;
    name: string; 
    address?: string; 
    matricule?: string;
    phone?: string;
  }; 
  montantHT: number; 
  montantTVA: number; 
  timbreFiscal?: number;
  deliveryFee?: number;
  deliveryTvaRate?: number;
  montantTTC: number; 
  notes?: string; 
  lignes?: Ligne[]; 
  trackingNumber?: string | null;
  transporter?: string | null;
}

export default function DocumentPrint() {
  const { type, id } = useParams();
  const [doc, setDoc] = useState<DocBase | null>(null);
  const [company, setCompany] = useState<CompanySetting | null>(null);
  const [loading, setLoading] = useState(true);

  const endpointMap: Record<string, string> = {
    facture: 'factures-client',
    devis: 'devis-client',
    commande: 'commandes-client',
    avoir: 'avoirs-client',
    'bon-livraison': 'bons-livraison-client',
    'bon-commande': 'bons-commande-client'
  };

  const titleMap: Record<string, string> = {
    facture: 'FACTURE',
    devis: 'DEVIS',
    commande: 'COMMANDE',
    avoir: 'AVOIR',
    'bon-livraison': 'BON DE LIVRAISON',
    'bon-commande': 'BON DE COMMANDE'
  };

  const fetchData = async () => {
    if (!type || !id) return;
    setLoading(true);
    try {
      const ep = endpointMap[type];
      const [companyRes, docRes] = await Promise.all([
        api.get('/settings/company'),
        api.get(`/${ep}/${id}`)
      ]);
      setCompany(companyRes.data);
      setDoc(docRes.data);
    } catch (e) {
      console.error(e);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [type, id]);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!doc) return <Box sx={{ p: 4 }}>Document introuvable</Box>;

  // Calculate TVA groups
  const tvaGroups: Record<number, { base: number; tva: number }> = {};
  doc.lignes?.forEach(ligne => {
    const rate = ligne.tauxTVA;
    const ht = ligne.quantite * ligne.prixUnitaireHT;
    const tva = ht * (rate / 100);
    if (!tvaGroups[rate]) {
      tvaGroups[rate] = { base: 0, tva: 0 };
    }
    tvaGroups[rate].base += ht;
    tvaGroups[rate].tva += tva;
  });

  // Include delivery fee in TVA breakdown (uses stored rate, default 7%)
  const deliveryRate = doc.deliveryTvaRate ?? 7;
  if (doc.deliveryFee && doc.deliveryFee > 0) {
    const tva = doc.deliveryFee * (deliveryRate / 100);
    if (!tvaGroups[deliveryRate]) {
      tvaGroups[deliveryRate] = { base: 0, tva: 0 };
    }
    tvaGroups[deliveryRate].base += doc.deliveryFee;
    tvaGroups[deliveryRate].tva += tva;
  }

  const deliveryFeeTTC = doc.deliveryFee && doc.deliveryFee > 0
    ? doc.deliveryFee * (1 + deliveryRate / 100)
    : 0;

  return (
    <div className="document-print-content" style={{ 
      padding: '20px', 
      maxWidth: '210mm', 
      margin: '0 auto', 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12pt',
      background: '#fff',
      minHeight: '297mm'
    }}>
      <style>{`
        * { visibility: hidden; }
        .document-print-content, .document-print-content * { visibility: visible; }
        .document-print-content { 
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        
        @media print {
          * { visibility: hidden; }
          .document-print-content, .document-print-content * { visibility: visible; }
          .document-print-content { 
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page { size: A4; margin: 10mm; }
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-button { display: none !important; }
        }
        @media screen {
          * { visibility: visible; }
          .document-print-content { 
            position: relative;
          }
          .print-button { 
            position: fixed; 
            top: 20px; 
            right: 20px; 
            z-index: 1000;
            padding: 10px 20px;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .print-button:hover {
            background: #1565c0;
          }
        }
        table { border-collapse: collapse; width: 100%; border-spacing: 0; }
        td, th { border: 2px solid #000; padding: 6px 8px; margin: 0; }
        thead th { padding: 6px 8px; }
        tbody tr td { padding: 0px 8px; height: 20px; }
        .items-table-container { 
          border: 2px solid #000; 
          min-height: 400px; 
          margin-bottom: 20px; 
          position: relative;
          background: linear-gradient(to right, transparent 15%, #000 15%, #000 calc(15% + 2px), transparent calc(15% + 2px), transparent 50%, #000 50%, #000 calc(50% + 2px), transparent calc(50% + 2px), transparent 60%, #000 60%, #000 calc(60% + 2px), transparent calc(60% + 2px), transparent 70%, #000 70%, #000 calc(70% + 2px), transparent calc(70% + 2px), transparent 85%, #000 85%, #000 calc(85% + 2px), transparent calc(85% + 2px));
        }
        .items-table { border: none; margin-bottom: 0; }
        .items-table td, .items-table th { border: none; padding: 0px 8px; }
        .items-table thead th { border-bottom: 2px solid #000; border-right: 2px solid #000; padding: 6px 8px; background-color: #d3d3d3; }
        .items-table thead th:last-child { border-right: none; }
        .items-table tbody td { padding: 0px 8px; height: 20px; }
        .bordered-box { border: 2px solid #000; padding: 12px; }
      `}</style>

      <button className="print-button" onClick={() => window.print()}>
        Imprimer
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* Logo */}
        <div style={{ width: '250px' }}>
          {company?.logoUrl && (
            <img src={company.logoUrl} alt="Logo" style={{ maxWidth: '220px', maxHeight: '100px', display: 'block' }} />
          )}
        </div>

        {/* Title and Date */}
        <div style={{ textAlign: 'right', minWidth: '260px' }}>
          <div style={{ fontSize: '14pt', fontStyle: 'italic', fontWeight: 'bold', marginBottom: '10px' }}>
            {titleMap[type || 'facture'] || 'DOCUMENT'} N°
            {type === 'facture' && company?.invoicePrefix ? ` ${company.invoicePrefix}${doc.numero.replace(/^FC/, '')}` : ` ${doc.numero}`}
          </div>
          <div style={{ fontSize: '11pt', marginBottom: doc.trackingNumber && type === 'bon-livraison' ? '6px' : '0' }}>
            <strong>Tunis le:</strong> {new Date(doc.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          {type === 'bon-livraison' && doc.trackingNumber && (
            <div style={{ textAlign: 'right', fontSize: '10pt', marginTop: '6px' }}>
              <div><strong>Tracking:</strong> {doc.trackingNumber}</div>
              {doc.transporter && <div style={{ fontSize: '9pt', color: '#555' }}>{doc.transporter}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Company and Client Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '20px' }}>
        {/* Company Info - Left Box */}
        <div className="bordered-box" style={{ flex: '0 0 47%', fontSize: '10pt', minHeight: '100px' }}>
          
          {company?.name && <div style={{ marginBottom: '2px' }}>{company.name}</div>}
          {company?.address && <div style={{ marginBottom: '2px' }}>Adresse: {company.address}</div>}
          {company?.matricule && <div style={{ marginBottom: '2px' }}>MF: {company.matricule}</div>}
          {company?.phone && <div style={{ marginBottom: '2px' }}>Tél: {company.phone}</div>}
          {company?.email && <div style={{ marginBottom: '2px' }}>Email: {company.email}</div>}
        </div>

        {/* Client Info - Right Box */}
        <div className="bordered-box" style={{ flex: '0 0 47%', fontSize: '11pt', minHeight: '100px', borderRadius: '10px' }}>
          {doc.client && (
            <>
              <div style={{ marginBottom: '2px' }}><strong>Code client:</strong> {doc.client.code || 'C00001'}</div>
              <div style={{ marginBottom: '2px' }}><strong>Client:</strong> {doc.client.name}</div>
              {doc.client.address && <div style={{ marginBottom: '2px' }}>Adresse: {doc.client.address}</div>}
              {doc.client.matricule && <div style={{ marginBottom: '2px' }}>MF: {doc.client.matricule}</div>}
              {doc.client.phone && <div style={{ marginBottom: '2px' }}>Tél: {doc.client.phone}</div>}
            </>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="items-table-container">
        <table className="items-table" style={{ marginBottom: '20px', fontSize: '11pt', width: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: '#fff' }}>
              <th style={{ width: '15%', textAlign: 'center' }}>Référence</th>
              <th style={{ width: '35%', textAlign: 'center' }}>DÉSIGNATION</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Qté</th>
              <th style={{ width: '10%', textAlign: 'center' }}>TVA</th>
              <th style={{ width: '15%', textAlign: 'center' }}>P.U.HT</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Montant H.T</th>
            </tr>
          </thead>
          <tbody>
            {doc.lignes?.map((ligne, idx) => {
              const montantHT = ligne.quantite * ligne.prixUnitaireHT;
              const reference = ligne.product?.reference || ligne.product?.sku || '';
              // Split designation by newline to show serial/barcode in smaller text
              const designationLines = ligne.designation?.split('\n') || [ligne.designation || ''];
              return (
                <tr key={idx}>
                  <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{reference}</td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div>{designationLines[0]}</div>
                    {designationLines.slice(1).map((line, i) => (
                      <div key={i} style={{ fontSize: '9pt', color: '#666', marginTop: '2px' }}>{line}</div>
                    ))}
                    {ligne.serialNumberUsed && (
                      <div style={{ fontSize: '9pt', color: '#666', marginTop: '3px', fontWeight: 'bold' }}>
                        SN: {ligne.serialNumberUsed}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{ligne.quantite}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{ligne.tauxTVA}%</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{ligne.prixUnitaireHT.toFixed(3)}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{montantHT.toFixed(3)}</td>
                </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* TVA Summary and Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
        {/* TVA Breakdown - Left */}
        <div style={{ flex: '0 0 48%' }}>
          <table style={{ fontSize: '11pt' }}>
            <tbody>
              {Object.entries(tvaGroups).map(([rate, values]) => (
                <tr key={rate}>
                  <td style={{ fontWeight: 'bold', width: '30%' }}>BASE {rate}%</td>
                  <td style={{ textAlign: 'right', width: '20%' }}>{values.base.toFixed(3)}</td>
                  <td style={{ fontWeight: 'bold', width: '30%' }}>TVA {rate}%</td>
                  <td style={{ textAlign: 'right', width: '20%' }}>{values.tva.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grand Totals - Right */}
        <div style={{ flex: '0 0 48%' }}>
          <table style={{ fontSize: '11pt' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '60%' }}>Total HTVA</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', width: '40%' }}>{doc.montantHT.toFixed(3)}</td>
              </tr>
              {doc.remise > 0 && (
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#d32f2f' }}>REMISE ({doc.remise}%)</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' }}>
                    -{(doc.montantHT * (doc.remise / (100 - doc.remise))).toFixed(3)}
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ fontWeight: 'bold' }}>TOTAL TVA</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{doc.montantTVA.toFixed(3)}</td>
              </tr>
              {type === 'facture' && (
                <tr>
                  <td style={{ fontWeight: 'bold' }}>TIMBRE</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{(doc.timbreFiscal || 1.0).toFixed(3)}</td>
                </tr>
              )}
              {type !== 'facture' && doc.timbreFiscal !== undefined && doc.timbreFiscal > 0 && (
                <tr>
                  <td style={{ fontWeight: 'bold' }}>TIMBRE</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{doc.timbreFiscal.toFixed(3)}</td>
                </tr>
              )}
              {doc.deliveryFee !== undefined && doc.deliveryFee > 0 && (
                <tr>
                  <td style={{ fontWeight: 'bold' }}>FRAIS DE LIVRAISON</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{deliveryFeeTTC.toFixed(3)}</td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#fff' }}>
                <td style={{ fontWeight: 'bold', fontSize: '13pt' }}>MONTANT TTC</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13pt' }}>{doc.montantTTC.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

        {type === 'facture' && (
          <div style={{ marginTop: '16px', fontStyle: 'italic', fontSize: '11pt', color: '#444', width: '50%' }}>
            Arrêté la présente facture à la somme de : {numberToWordsFr(doc.montantTTC)}
          </div>
        )}

      {/* Footer */}
      <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '10pt', color: '#666' }}>
        <div style={{ marginBottom: '8px' }}>
          {company?.footerNote || 'La marchandise reste la propriété de INFO-ONE PLUS jusqu\'à son paiement intégral'}
        </div>
        {(company?.matricule || company?.rib) && (
          <div>
            {company?.matricule && `MF: ${company.matricule}/A/M/000`}
            {company?.matricule && company?.rib && ' ** '}
            {company?.rib && `RIB Bancaire BTK: ${company.rib}`}
          </div>
        )}
      </div>
    </div>
  );
}