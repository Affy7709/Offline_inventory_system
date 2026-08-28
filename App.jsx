import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';

// Pages from inventory
import DashboardPage    from './pages/DashboardPage';
import InventoryPage    from './pages/InventoryPage';
import StockPage        from './pages/StockPage';
import TransactionsPage from './pages/TransactionsPage';
import AllocationsPage  from './pages/AllocationsPage';
import QrPage           from './pages/QrPage';
import ReportsPage      from './pages/ReportsPage';
import AuditPage        from './pages/AuditPage';
import Categories       from './pages/Categories';

import './App.css';
import { getAuthToken } from './api';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('user');
  const token = getAuthToken();
  if (!user || !token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* All 10 Pages from Inventory */}
        <Route path="/"             element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/inventory"    element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
        <Route path="/categories"   element={<PrivateRoute><Categories /></PrivateRoute>} />
        <Route path="/qr"           element={<PrivateRoute><QrPage /></PrivateRoute>} />
        <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
        <Route path="/stock"        element={<PrivateRoute><StockPage /></PrivateRoute>} />
        <Route path="/allocations"  element={<PrivateRoute><AllocationsPage /></PrivateRoute>} />
        <Route path="/reports"      element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
        <Route path="/audit"        element={<PrivateRoute><AuditPage /></PrivateRoute>} />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
