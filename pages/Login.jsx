import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sha256Hex, getApiBase, setApiBase, setAuthToken } from '../api';

// ================================================================
//  Login.jsx — Method 3 secure login
//
//  Flow:
//   1. Fetch per-user salt  GET /index.php?action=get_salt&username=X
//   2. Compute sha256( salt + plaintext_password ) in browser
//   3. POST { username, password_hash: sha256hex } — plaintext NEVER sent
//   4. Server verifies bcrypt(sha256hex) against stored hash
// ================================================================

export default function Login() {
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [apiServer,  setApiServer]  = useState(getApiBase());
  const [showConfig, setShowConfig] = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setApiBase(apiServer);

    const base = apiServer.trim().replace(/\/+$/, '');

    try {
      // ── Step 1: fetch the per-user salt ──────────────────────
      const saltRes  = await fetch(`${base}/index.php?action=get_salt&username=${encodeURIComponent(username)}`);
      const saltData = await saltRes.json();
      if (!saltData.salt) throw new Error('Could not retrieve security parameters');

      // ── Step 2: hash client-side — plaintext never leaves browser ──
      const clientHash = await sha256Hex(saltData.salt + password);

      // ── Step 3: send hashed credential ───────────────────────
      const res  = await fetch(`${base}/index.php?action=login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password_hash: clientHash }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthToken(data.token);
        navigate('/');
      } else if (res.status === 429) {
        setError(data.error || 'Account temporarily locked. Try again later.');
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('NetworkError')) {
        setError('Cannot connect to server. Check the backend URL in Server settings.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30 mb-4">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>inventory</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Invendor</h1>
          <p className="text-indigo-300/70 text-sm mt-1">Warehouse Inventory Management</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 border border-white/20">
          <h2 className="text-xl font-bold text-text-primary mb-1">Welcome back</h2>
          <p className="text-sm text-text-secondary mb-6">Sign in with your secure credentials</p>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-danger-bg border border-danger/20 mb-5 animate-fade-in">
              <span className="material-symbols-outlined text-danger text-lg flex-shrink-0 mt-0.5">error</span>
              <span className="text-sm text-danger-text font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            {/* Username */}
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
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary text-xl">lock</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field input-with-icon pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
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
                    placeholder="http://192.168.x.x:8000"
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
                  Authenticating…
                </span>
              ) : 'Sign In Securely'}
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="material-symbols-outlined text-indigo-400/50 text-sm">shield</span>
          <p className="text-center text-indigo-400/40 text-xs">
            SHA-256 + bcrypt · End-to-end secure · Offline-ready
          </p>
        </div>
      </div>
    </div>
  );
}
