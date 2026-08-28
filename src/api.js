// ================================================================
//  src/api.js — Invendor API client
// ================================================================

let _cachedFingerprint = null;

export async function getDeviceFingerprint() {
  if (_cachedFingerprint) return _cachedFingerprint;

  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency ?? '',
    navigator.platform ?? '',
  ].join('|');

  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  _cachedFingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return _cachedFingerprint;
}

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

export const logoutUser = async () => {
  try {
    const apiBase = getApiBase();
    await apiFetch(`${apiBase}/index.php?action=logout`, { method: 'POST' });
  } catch {
    // ignore network errors if offline
  } finally {
    clearAuth();
  }
};

export const apiFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const fp    = await getDeviceFingerprint();

  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Device-Fingerprint': fp,
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
  }

  return res;
};

export const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    throw new Error('Invalid JSON response from server');
  }
};

export const company = {
  name: "Northstar AssetOps",
  short: "NAO",
};
