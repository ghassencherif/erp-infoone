import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import productsRoutes from './routes/products'
import usersRoutes from './routes/users'
import fournisseursRoutes from './routes/fournisseurs'
import bonsCommandeRoutes from './routes/bons-commande'
import bonsReceptionRoutes from './routes/bons-reception'
import facturesFournisseurRoutes from './routes/factures-fournisseur'
import facturesAvoirRoutes from './routes/factures-avoir'
import devisRoutes from './routes/devis'
import clientsRoutes from './routes/clients';
import facturesClientRoutes from './routes/factures-client';
import devisClientRoutes from './routes/devis-client';
import commandesClientRoutes from './routes/commandes-client';
import avoirsClientRoutes from './routes/avoirs-client';
import bonsCommandeClientRoutes from './routes/bons-commande-client';
import bonsLivraisonClientRoutes from './routes/bons-livraison-client';
import settingsRoutes from './routes/settings';
import posRoutes from './routes/pos';
import historiqueAchatsRoutes from './routes/historique-achats';
import orderTrackingRoutes from './routes/order-tracking';

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/fournisseurs', fournisseursRoutes)
app.use('/api/bons-commande', bonsCommandeRoutes)
app.use('/api/bons-reception', bonsReceptionRoutes)
app.use('/api/factures-fournisseur', facturesFournisseurRoutes)
app.use('/api/factures-avoir', facturesAvoirRoutes)
app.use('/api/devis', devisRoutes)
app.use('/api/clients', clientsRoutes);
app.use('/api/factures-client', facturesClientRoutes);
app.use('/api/devis-client', devisClientRoutes);
app.use('/api/commandes-client', commandesClientRoutes);
app.use('/api/avoirs-client', avoirsClientRoutes);
app.use('/api/bons-commande-client', bonsCommandeClientRoutes);
app.use('/api/bons-livraison-client', bonsLivraisonClientRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/historique-achats', historiqueAchatsRoutes);
app.use('/api/tracking', orderTrackingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
