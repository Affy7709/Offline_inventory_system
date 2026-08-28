import { useEffect, useState } from 'react'
import { getSession, login, logout, register } from './api'

function Icon({ name }) {
  const paths = {
    lock: 'M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Zm6 4v3',
    user: 'M20 21a8 8 0 0 0-16 0m12-11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    eyeOff: 'm3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.2 3.9M6.2 6.2C3.5 8.2 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3.4-.6',
    shield: 'M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Zm-3 9 2 2 4-4',
    server: 'M4 5h16v5H4V5Zm0 9h16v5H4v-5Zm3-6v.1M7 16v.1',
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

function Field({ label, icon, type = 'text', value, onChange, placeholder, showPassword, onToggle }) {
  return <label className="field"><span>{label}</span><div className="input-wrap"><Icon name={icon} /><input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={type === 'password' ? 'current-password' : 'username'} required />{onToggle && <button type="button" className="icon-button" onClick={onToggle} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button>}</div></label>
}

function Login({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      const result = mode === 'login' ? await login(username.trim(), password) : await register(username.trim(), password)
      if (mode === 'login') onAuthenticated(result.user)
      else { setMode('login'); setPassword(''); setMessage({ type: 'success', text: 'Account created. You can now sign in.' }) }
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setBusy(false) }
  }

  return <main className="login-shell"><section className="brand-panel"><div className="brand-mark"><Icon name="shield" /></div><p className="eyebrow">LAN ACCESS CONTROL</p><h1>Offline Secure Login</h1><p className="brand-copy">A private authentication gateway for teams working on the same local network.</p><div className="network-chip"><span className="pulse" /> Local network active</div></section><section className="form-panel"><div className="form-heading"><div><p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'New operator'}</p><h2>{mode === 'login' ? 'Sign in to continue' : 'Create an account'}</h2></div><div className="mini-lock"><Icon name="lock" /></div></div><p className="form-intro">{mode === 'login' ? 'Use your local credentials to access the operations console.' : 'Registration is stored only in the local MySQL database.'}</p><form onSubmit={submit}><Field label="Username" icon="user" value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter your username" /><Field label="Password" icon="lock" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" showPassword={showPassword} onToggle={() => setShowPassword(value => !value)} />{mode === 'login' && <label className="remember"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /><span>Remember this device</span></label>}{message && <div className={`message ${message.type}`}>{message.text}</div>}<button className="submit-button" disabled={busy}>{busy ? <><span className="spinner" /> Processing...</> : mode === 'login' ? 'Sign in securely' : 'Create local account'}</button></form><button className="mode-button" onClick={() => { setMode(value => value === 'login' ? 'register' : 'login'); setMessage(null) }}>{mode === 'login' ? 'Need a local account? Register' : 'Already registered? Sign in'}</button><p className="footer-note">Connected to Local Network <span>•</span> No Internet Required</p></section></main>
}

function Dashboard({ user, onLogout }) {
  return <main className="dashboard"><header className="dash-header"><div><p className="eyebrow">LOCAL OPERATIONS CONSOLE</p><h1>Welcome, {user.username}</h1><p className="form-intro">Your local authentication session is active.</p></div><button className="logout-button" onClick={onLogout}>Sign out</button></header><div className="status-grid"><StatusCard icon="shield" label="Authentication status" value="Authenticated" good /><StatusCard icon="server" label="Network status" value="Local / Offline" good /><StatusCard icon="server" label="Server" value="Local PC" /><StatusCard icon="server" label="Database" value="Connected" good /></div><section className="session-panel"><div className="session-icon"><Icon name="lock" /></div><div><p className="eyebrow">SESSION PROTECTED</p><h2>Private LAN session established</h2><p>No cloud services or internet connection are involved in this authentication flow.</p></div></section></main>
}

function StatusCard({ icon, label, value, good }) { return <article className="status-card"><div className="status-icon"><Icon name={icon} /></div><div><p>{label}</p><strong>{value}</strong></div>{good && <span className="status-dot" />}</article> }

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  useEffect(() => { getSession().then(result => setUser(result.user)).catch(() => {}).finally(() => setChecking(false)) }, [])
  if (checking) return <div className="loading-screen"><div className="spinner dark" /> Checking local session</div>
  if (!user) return <Login onAuthenticated={setUser} />
  return <Dashboard user={user} onLogout={() => logout().finally(() => setUser(null))} />
}
