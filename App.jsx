import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Scanner from './pages/Scanner';
import Reports from './pages/Reports';

// New pages wired to backend
import InventoryPage    from './pages/InventoryPage';
import StockPage        from './pages/StockPage';
import TransactionsPage from './pages/TransactionsPage';
import AllocationsPage  from './pages/AllocationsPage';
import QrPage           from './pages/QrPage';
import AuditPage        from './pages/AuditPage';
import RolesPage        from './pages/RolesPage';

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

        {/* Existing pages */}
        <Route path="/"           element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products"   element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
        <Route path="/scanner"    element={<PrivateRoute><Scanner /></PrivateRoute>} />
        <Route path="/reports"    element={<PrivateRoute><Reports /></PrivateRoute>} />

        {/* New pages */}
        <Route path="/inventory"    element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
        <Route path="/stock"        element={<PrivateRoute><StockPage /></PrivateRoute>} />
        <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
        <Route path="/allocations"  element={<PrivateRoute><AllocationsPage /></PrivateRoute>} />
        <Route path="/qr"           element={<PrivateRoute><QrPage /></PrivateRoute>} />
        <Route path="/audit"        element={<PrivateRoute><AuditPage /></PrivateRoute>} />
        <Route path="/roles"        element={<PrivateRoute><RolesPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

