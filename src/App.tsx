import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import FactureClientDetail from './pages/Detail/FactureClientDetail'
import FactureFournisseurDetail from './pages/Detail/FactureFournisseurDetail'
import CommandeClientDetail from './pages/Detail/CommandeClientDetail'
import BonCommandeFournisseurDetail from './pages/Detail/BonCommandeFournisseurDetail'
import Users from './pages/Users'
import Fournisseurs from './pages/Fournisseurs'
import HistoriqueAchats from './pages/HistoriqueAchats'
import BonsCommande from './pages/BonsCommande'
import BonsReception from './pages/BonsReception'
import FacturesFournisseur from './pages/FacturesFournisseur'
import FacturesAvoir from './pages/FacturesAvoir'
import Devis from './pages/Devis'
import Clients from './pages/Clients'
import FacturesClient from './pages/FacturesClient'
import DevisClient from './pages/DevisClient'
import CommandesClient from './pages/CommandesClient'
import AvoirsClient from './pages/AvoirsClient'
import BonsCommandeClient from './pages/BonsCommandeClient'
import BonsLivraisonClient from './pages/BonsLivraisonClient'
import SettingsInvoice from './pages/SettingsInvoice'
import DocumentPrint from './pages/Print/DocumentPrint'
import TicketPrint from './pages/Print/TicketPrint'
import PointOfSale from './pages/PointOfSale'
import CommandesCaisse from './pages/CommandesCaisse'
import POSDisplay from './pages/POSDisplay'
import TrackingDashboard from './pages/TrackingDashboard'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/products/:id" element={
          <ProtectedRoute>
            <ProductDetail />
          </ProtectedRoute>
        } />
        <Route path="/factures-client/:id" element={
          <ProtectedRoute>
            <FactureClientDetail />
          </ProtectedRoute>
        } />
        <Route path="/factures-client/detail/:id" element={
          <ProtectedRoute>
            <FactureClientDetail />
          </ProtectedRoute>
        } />
        <Route path="/factures-fournisseur/detail/:id" element={
          <ProtectedRoute>
            <FactureFournisseurDetail />
          </ProtectedRoute>
        } />
        <Route path="/commandes-client/detail/:id" element={
          <ProtectedRoute>
            <CommandeClientDetail />
          </ProtectedRoute>
        } />
        <Route path="/bons-commande/detail/:id" element={
          <ProtectedRoute>
            <BonCommandeFournisseurDetail />
          </ProtectedRoute>
        } />
        <Route path="/factures-fournisseur/:id" element={
          <ProtectedRoute>
            <FactureFournisseurDetail />
          </ProtectedRoute>
        } />
        <Route path="/commandes-client/:id" element={
          <ProtectedRoute>
            <CommandeClientDetail />
          </ProtectedRoute>
        } />
        <Route path="/bons-commande/:id" element={
          <ProtectedRoute>
            <BonCommandeFournisseurDetail />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute requiredRole="ADMIN">
            <Users />
          </ProtectedRoute>
        } />
        <Route path="/fournisseurs" element={
          <ProtectedRoute>
            <Fournisseurs />
          </ProtectedRoute>
        } />
        <Route path="/historique-achats" element={
          <ProtectedRoute>
            <HistoriqueAchats />
          </ProtectedRoute>
        } />
        <Route path="/bons-commande" element={
          <ProtectedRoute>
            <BonsCommande />
          </ProtectedRoute>
        } />
        <Route path="/bons-reception" element={
          <ProtectedRoute>
            <BonsReception />
          </ProtectedRoute>
        } />
        <Route path="/factures-fournisseur" element={
          <ProtectedRoute>
            <FacturesFournisseur />
          </ProtectedRoute>
        } />
        <Route path="/factures-avoir" element={
          <ProtectedRoute>
            <FacturesAvoir />
          </ProtectedRoute>
        } />
        <Route path="/devis" element={
          <ProtectedRoute>
            <Devis />
          </ProtectedRoute>
        } />
        <Route path="/clients" element={
          <ProtectedRoute requiredRole="ADMIN">
            <Clients />
          </ProtectedRoute>
        } />
        <Route path="/devis-client" element={
          <ProtectedRoute>
            <DevisClient />
          </ProtectedRoute>
        } />
        <Route path="/commandes-client" element={
          <ProtectedRoute>
            <CommandesClient />
          </ProtectedRoute>
        } />
        <Route path="/commandes-client/tracking" element={
          <ProtectedRoute>
            <TrackingDashboard />
          </ProtectedRoute>
        } />
        <Route path="/commandes-caisse" element={
          <ProtectedRoute>
            <CommandesCaisse />
          </ProtectedRoute>
        } />
        <Route path="/bons-commande-client" element={
          <ProtectedRoute>
            <BonsCommandeClient />
          </ProtectedRoute>
        } />
        <Route path="/bons-livraison-client" element={
          <ProtectedRoute>
            <BonsLivraisonClient />
          </ProtectedRoute>
        } />
        <Route path="/factures-client" element={
          <ProtectedRoute>
            <FacturesClient />
          </ProtectedRoute>
        } />
        <Route path="/avoirs-client" element={
          <ProtectedRoute>
            <AvoirsClient />
          </ProtectedRoute>
        } />
        <Route path="/pos" element={
          <ProtectedRoute>
            <PointOfSale />
          </ProtectedRoute>
        } />
        <Route path="/pos-display" element={<POSDisplay />} />
        <Route path="/settings/invoice" element={
          <ProtectedRoute requiredRole="ADMIN">
            <SettingsInvoice />
          </ProtectedRoute>
        } />
        <Route path="/print/:type/:id" element={
          <ProtectedRoute>
            <DocumentPrint />
          </ProtectedRoute>
        } />
        <Route path="/print-ticket/:id" element={
          <ProtectedRoute>
            <TicketPrint />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
