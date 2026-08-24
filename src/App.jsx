import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import QrPage from './pages/QrPage'
import TransactionsPage from './pages/TransactionsPage'
import StockPage from './pages/StockPage'
import AllocationsPage from './pages/AllocationsPage'
import ReportsPage from './pages/ReportsPage'
import RolesPage from './pages/RolesPage'
import AuditPage from './pages/AuditPage'

function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 relative">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/qr" element={<QrPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/allocations" element={<AllocationsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
