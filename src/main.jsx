import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import QrPage from './pages/QrPage'
import TransactionsPage from './pages/TransactionsPage'
import StockPage from './pages/StockPage'
import AllocationsPage from './pages/AllocationsPage'
import ReportsPage from './pages/ReportsPage'
import RolesPage from './pages/RolesPage'
import AuditPage from './pages/AuditPage'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="qr" element={<QrPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="allocations" element={<AllocationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="scanner-terminal" element={<App />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
