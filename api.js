// ================================================================
//  api.js — Invendor API client
//
//  Attaches:
//    Authorization: Bearer <token>
//    X-Device-Fingerprint: <sha256 of browser fingerprint>
//
//  getDeviceFingerprint() is computed once per session from stable
//  browser attributes — works 100% offline (no external service).
// ================================================================

// ── Device fingerprint (offline, no library needed) ──────────
let _cachedFingerprint = null;

export async function getDeviceFingerprint() {
  if (_cachedFingerprint) return _cachedFingerprint;

  // Collect stable, non-PII browser attributes
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency ?? '',
    navigator.platform ?? '',
  ].join('|');

  // SHA-256 via Web Crypto API (built into every modern browser, works offline)
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  _cachedFingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return _cachedFingerprint;
}

// ── API base URL (auto-detects local IP, works offline) ──────
export const getApiBase = () => {
  const saved = localStorage.getItem('apiBase');
  if (saved) return saved.trim().replace(/\/+$/, '');
  const host = window.location.hostname || 'localhost';
  return `http://${host}:8000`;
};

export const setApiBase = (url) => {
  if (!url) return;
  localStorage.setItem('apiBase', url.trim().replace(/\/+$/, ''));
};

// ── Token management ─────────────────────────────────────────
export const getAuthToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token') || '';

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

export const clearAuth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

// ── Fetch wrapper: attaches auth + device fingerprint ────────
export const apiFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const fp    = await getDeviceFingerprint();

  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Device-Fingerprint': fp,
  };

  const res = await fetch(url, { ...options, headers });

  // On 401: clear auth so PrivateRoute redirects cleanly via React Router
  // Do NOT use window.location.href — that causes blank screen
  if (res.status === 401) {
    clearAuth();
  }

  return res;
};
