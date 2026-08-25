const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await response.json().catch(() => ({ success: false, message: 'Invalid local server response.' }))
  if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.')
  return data
}

export const getSession = () => request('dashboard.php')
export const login = (username, password) => request('login.php', { method: 'POST', body: JSON.stringify({ username, password }) })
export const register = (username, password) => request('register.php', { method: 'POST', body: JSON.stringify({ username, password }) })
export const logout = () => request('logout.php', { method: 'POST' })
