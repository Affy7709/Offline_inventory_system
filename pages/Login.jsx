import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBase, setApiBase, setAuthToken } from '../api';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [apiServer, setApiServer] = useState(getApiBase());
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setApiBase(apiServer);

    try {
      const endpoint = `${apiServer.trim().replace(/\/+$/, '')}/index.php?action=login`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthToken(data.token);
        navigate('/');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Cannot connect to server. Please check the backend URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30 mb-4">
            <span className="material-symbols-outlined text-white text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>inventory</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Invendor</h1>
          <p className="text-indigo-300/70 text-sm mt-1">Warehouse Inventory Management</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 border border-white/20">
          <h2 className="text-xl font-bold text-text-primary mb-1">Welcome back</h2>
          <p className="text-sm text-text-secondary mb-6">Sign in to your account to continue</p>
          
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-danger-bg border border-danger/20 mb-5 animate-fade-in">
              <span className="material-symbols-outlined text-danger text-lg flex-shrink-0 mt-0.5">error</span>
              <span className="text-sm text-danger-text font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary text-xl">person</span>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="input-field input-with-icon"
                  placeholder="Enter username"
                  required 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary text-xl">lock</span>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="input-field input-with-icon"
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            {/* Server Config Toggle */}
            <div>
              <button 
                type="button" 
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">dns</span>
                {showConfig ? 'Hide server settings' : 'Server settings'}
                <span className="material-symbols-outlined text-sm">{showConfig ? 'expand_less' : 'expand_more'}</span>
              </button>

              {showConfig && (
                <div className="mt-3 p-3 bg-surface-raised rounded-xl border border-border animate-fade-in">
                  <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">Backend API URL</label>
                  <input 
                    type="text" 
                    value={apiServer} 
                    onChange={e => setApiServer(e.target.value)} 
                    className="input-field text-xs"
                  />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-indigo-400/40 text-xs mt-6">Invendor v1.0 — Offline Inventory System</p>
      </div>
    </div>
  );
}
