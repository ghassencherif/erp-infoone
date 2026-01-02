-- Check total records
SELECT COUNT(*) as total_records FROM HistoriqueAchatFournisseur WHERE documentType = 'IMPORT_DOLIBARR';

-- Show sample records
SELECT h.id, p.reference, p.name, f.nom as supplier, h.fournisseurReference, h.prixUnitaireHT, h.date
FROM HistoriqueAchatFournisseur h
JOIN Product p ON h.productId = p.id
JOIN Fournisseur f ON h.fournisseurId = f.id
WHERE h.documentType = 'IMPORT_DOLIBARR'
LIMIT 10;
