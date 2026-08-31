import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBase, setApiBase, setAuthToken, getDeviceFingerprint, company } from '../api';
import { Lock, User, Server, Eye, EyeOff, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [apiServer, setApiServer]       = useState(getApiBase());
  const [showConfig, setShowConfig]     = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [error, setError]               = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [loading, setLoading]           = useState(false);
  const [lockoutChecking, setLockoutChecking] = useState(false);
  const navigate = useNavigate();

  // Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [ans1, setAns1] = useState('');
  const [ans2, setAns2] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter user, 2 = answer qs, 3 = show password

  const lockoutRef = useRef(0);

  // ── Countdown tick ──────────────────────────────────────────────
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      lockoutRef.current = 0;
      return;
    }
    lockoutRef.current = lockoutSeconds;
    const id = setInterval(() => {
      lockoutRef.current -= 1;
      if (lockoutRef.current <= 0) {
        clearInterval(id);
        setLockoutSeconds(0);
        setError('');
      } else {
        setLockoutSeconds(lockoutRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutSeconds]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Server-side lockout check ──────────────────────────────────
  const checkLockoutFromServer = useCallback(async (uname = username) => {
    if (!uname.trim()) return;
    setLockoutChecking(true);
    const base = getApiBase().trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${base}/index.php?action=check_lockout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.locked && data.remaining_seconds > 0) {
          setLockoutSeconds(data.remaining_seconds);
          setError('Access temporarily blocked after 5 failed attempts.');
        }
      }
    } catch {
      // ignore
    } finally {
      setLockoutChecking(false);
    }
  }, [username]);

  // ── Login submit ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
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
          'X-Device-Fingerprint': fp,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.status === 429) {
        const secs = data.remaining_seconds || 60;
        setLockoutSeconds(secs);
        setError('Access temporarily blocked after 5 failed attempts.');
      } else if (res.ok && data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthToken(data.token);
        navigate('/');
      } else {
        setError(data.error || 'Invalid username or password.');
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

  // ── Forgot Password Handlers ────────────────────────────────────
  const handleForgotStep1 = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setError('');
    setLoading(true);
    setApiBase(apiServer);
    const base = apiServer.trim().replace(/\/+$/, '');

    try {
      const res = await fetch(`${base}/index.php?action=forgot_password_step1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setQ1(data.q1);
        setQ2(data.q2);
        setForgotStep(2);
      } else {
        setError(data.error || 'User not found or questions not set.');
      }
    } catch (err) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep2 = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setError('');
    setLoading(true);
    setApiBase(apiServer);
    const base = apiServer.trim().replace(/\/+$/, '');

    try {
      const res = await fetch(`${base}/index.php?action=forgot_password_step2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ans1, ans2 }),
      });
      const data = await res.json();
      
      if (res.status === 429) {
        const secs = data.remaining_seconds || 60;
        setLockoutSeconds(secs);
        setError('Access temporarily blocked after 5 failed attempts.');
      } else if (res.ok && data.success) {
        setRecoveredPassword(data.password);
        setForgotStep(3);
      } else {
        setError(data.error || 'Incorrect answers.');
      }
    } catch (err) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const resetForgotState = () => {
    setIsForgotMode(false);
    setForgotStep(1);
    setAns1('');
    setAns2('');
    setQ1('');
    setQ2('');
    setRecoveredPassword('');
    setError('');
  };


  const isLocked   = lockoutSeconds > 0;
  const isDisabled = loading || isLocked;

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
          <p className="text-slate-400 text-sm mt-1">Enterprise Inventory &amp; Asset Management</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200 relative overflow-hidden">
          
          {isForgotMode && (
             <button 
                onClick={resetForgotState}
                className="absolute top-6 left-6 text-slate-400 hover:text-slate-800 transition"
                title="Back to login"
             >
                <ArrowLeft size={20} />
             </button>
          )}

          <div className={`mb-6 ${isForgotMode ? 'pl-8' : ''}`}>
            <h2 className="text-lg font-bold text-slate-900">
              {isForgotMode ? 'Password Recovery' : 'Sign in to your account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isForgotMode 
                ? (forgotStep === 1 ? 'Enter your username to begin' : forgotStep === 2 ? 'Answer your security questions' : 'Recovery Successful') 
                : 'Enter your authenticated credentials to proceed'}
            </p>
          </div>

          {/* Error / Lockout Banner */}
          {error && (
            <div className={`flex flex-col gap-2 p-4 rounded-2xl mb-5 text-sm font-medium animate-in fade-in border ${
              isLocked
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
              {isLocked && (
                <div className="mt-1 flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-rose-200 text-xs">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    ⏱️ You can retry in:
                  </span>
                  <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg text-sm tracking-widest">
                    {formatTime(lockoutSeconds)}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isForgotMode ? (
            // ── Standard Login Form ────────────────────────────────
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              {/* Username */}
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
                    onChange={e => { setUsername(e.target.value); setError(''); setLockoutSeconds(0); }}
                    onBlur={() => checkLockoutFromServer(username)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition disabled:opacity-50"
                    placeholder="Enter username"
                    required
                    autoFocus
                    autoComplete="username"
                    disabled={isDisabled}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotMode(true); setError(''); }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition disabled:opacity-50"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={isDisabled}
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isDisabled || !username.trim() || !password}
                className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition shadow-soft mt-2 flex items-center justify-center gap-2 relative overflow-hidden ${
                  isLocked
                    ? 'bg-rose-600 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50'
                }`}
              >
                {isLocked ? (
                  <>
                    <span className="font-mono tracking-widest text-rose-200 font-bold text-base">
                      {formatTime(lockoutSeconds)}
                    </span>
                    <span className="text-rose-200 text-xs font-medium">— Try again later</span>
                  </>
                ) : loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}

                {isLocked && (
                  <span
                    className="absolute bottom-0 left-0 h-0.5 bg-rose-300/60 transition-all"
                    style={{ width: `${(lockoutSeconds / 60) * 100}%` }}
                  />
                )}
              </button>
            </form>

          ) : (
            // ── Forgot Password Flow ──────────────────────────────
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              
              {forgotStep === 1 && (
                <form onSubmit={handleForgotStep1} className="space-y-4">
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
                        onChange={e => { setUsername(e.target.value); setError(''); setLockoutSeconds(0); }}
                        onBlur={() => checkLockoutFromServer(username)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition disabled:opacity-50"
                        placeholder="Enter username"
                        required
                        autoFocus
                        disabled={isDisabled}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isDisabled || !username.trim()}
                    className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition shadow-soft mt-2 flex items-center justify-center gap-2 relative overflow-hidden ${
                      isLocked ? 'bg-rose-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50'
                    }`}
                  >
                    {loading ? 'Finding account...' : 'Next Step'}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotStep2} className="space-y-5">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Question 1:
                      </label>
                      <p className="text-sm font-medium text-indigo-900 mb-2">{q1}</p>
                      <input
                        type="password"
                        value={ans1}
                        onChange={e => setAns1(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        placeholder="Your answer"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Question 2:
                      </label>
                      <p className="text-sm font-medium text-indigo-900 mb-2">{q2}</p>
                      <input
                        type="password"
                        value={ans2}
                        onChange={e => setAns2(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        placeholder="Your answer"
                        required
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isDisabled || !ans1.trim() || !ans2.trim()}
                    className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition shadow-soft mt-2 flex items-center justify-center gap-2 relative overflow-hidden ${
                      isLocked ? 'bg-rose-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50'
                    }`}
                  >
                    {loading ? 'Verifying...' : 'Recover Password'}
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <div className="space-y-6">
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-emerald-900 font-bold text-lg mb-1">Identity Verified</h3>
                    <p className="text-emerald-700 text-sm mb-4">Your recovered password is below. Please store it securely.</p>
                    
                    <div className="bg-white border border-emerald-300 rounded-xl p-4 shadow-sm flex items-center justify-center gap-3">
                      <span className="font-mono font-bold text-slate-900 text-lg tracking-wider">
                        {recoveredPassword}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setPassword(recoveredPassword);
                      resetForgotState();
                    }}
                    className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.99] transition shadow-soft"
                  >
                    Return to Login
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-slate-500 text-xs">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Encrypted Session &amp; Hardware-Bound Authentication</span>
        </div>
      </div>
    </div>
  );
}
