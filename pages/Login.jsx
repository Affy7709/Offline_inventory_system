import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBase, setApiBase, setAuthToken, getDeviceFingerprint, company } from '../api';
import { Lock, User, Server, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiServer, setApiServer] = useState(getApiBase());
  const [showConfig, setShowConfig] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setApiBase(apiServer);

    const base = apiServer.trim().replace(/\/+$/, '');

    try {
      const fp = await getDeviceFingerprint();

      const res = await fetch(`${base}/index.php?action=login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': fp
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthToken(data.token);
        navigate('/');
      } else if (res.status === 429) {
        setError(data.error || 'Account temporarily locked due to multiple failed attempts. Try again later.');
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      if (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
        setError('Cannot connect to server. Check backend URL in Server settings.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-950/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 font-bold text-xl mb-4 border border-indigo-500/30 shadow-soft">
            {company.short}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{company.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Enterprise Inventory & Asset Management</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your authenticated credentials to proceed</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 mb-5 text-sm text-rose-700 font-medium animate-in fade-in">
              <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Server Config Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
              >
                <Server size={13} />
                <span>{showConfig ? 'Hide server settings' : 'Server settings'}</span>
              </button>

              {showConfig && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Backend API URL
                  </label>
                  <input
                    type="text"
                    value={apiServer}
                    onChange={e => setApiServer(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-900"
                    placeholder="http://localhost:8000"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.99] transition shadow-soft disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-slate-500 text-xs">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Encrypted Session & Hardware-Bound Authentication</span>
        </div>
      </div>
    </div>
  );
}
