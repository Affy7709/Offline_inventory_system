import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clearAuth, apiFetch, getApiBase } from '../api';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = async () => {
    try {
      const apiBase = getApiBase();
      await apiFetch(`${apiBase}/index.php?action=logout`, { method: 'POST' });
    } catch (e) {
      // Ignore network error on logout
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'space_dashboard' },
    { name: 'Products', path: '/products', icon: 'inventory_2' },
    { name: 'Categories', path: '/categories', icon: 'category' },
    { name: 'Scanner', path: '/scanner', icon: 'barcode_scanner' },
    { name: 'Reports', path: '/reports', icon: 'assessment' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{minWidth:'256px'}}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-xl" style={{fontVariationSettings: "'FILL' 1"}}>inventory</span>
          </div>
          <div>
            <span className="text-lg font-bold text-text-primary tracking-tight">Invendor</span>
            <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest -mt-0.5">Inventory</div>
          </div>
        </div>

        {/* User Card */}
        <div className="mx-4 mt-5 p-3 rounded-xl bg-gradient-to-br from-primary-light to-surface-raised border border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-lg">person</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary truncate">{user?.username}</div>
              <div className="text-xs text-text-secondary truncate">{user?.role_name} • {user?.dept_name}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-3 mb-3">Menu</div>
          <div className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                  isActive(item.path) 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${isActive(item.path) ? 'text-white' : 'text-text-tertiary group-hover:text-primary'}`}
                  style={isActive(item.path) ? {fontVariationSettings: "'FILL' 1"} : {}}
                >{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger-bg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top bar — mobile */}
        <header className="md:hidden h-14 bg-white border-b border-border px-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-1 rounded-lg hover:bg-surface-raised transition-colors flex items-center justify-center w-10 h-10">
            <span className="material-symbols-outlined text-text-secondary" style={{fontSize:'22px'}}>menu</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white" style={{fontSize:'16px', fontVariationSettings: "'FILL' 1"}}>inventory</span>
            </div>
            <span className="font-bold text-text-primary text-base">Invendor</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary" style={{fontSize:'18px'}}>person</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
