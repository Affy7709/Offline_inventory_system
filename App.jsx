import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Scanner from './pages/Scanner';
import Reports from './pages/Reports';
import './App.css';

import { getAuthToken } from './api';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('user');
  const token = getAuthToken();
  return (user && token) ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
        <Route path="/scanner" element={<PrivateRoute><Scanner /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
