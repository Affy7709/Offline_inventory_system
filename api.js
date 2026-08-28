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

  if (window.crypto && window.crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(raw);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      _cachedFingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return _cachedFingerprint;
    } catch (e) {
      console.warn("Crypto API failed, falling back to basic hash.");
    }
  }

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  _cachedFingerprint = 'fallback-' + Math.abs(hash).toString(16);
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

// ── Helper: Safe JSON parser that strips stray HTML/PHP notices ──
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

// ── Application config & navigation ─────────────────────────
export const company = {
  name: "Northstar AssetOps",
  short: "NAO",
};

export const navigation = [
  { name: "Dashboard", icon: "LayoutDashboard", path: "/" },
  { name: "Inventory & Stock", icon: "Package2", path: "/inventory" },
  { name: "Categories", icon: "Tags", path: "/categories" },
  { name: "Barcode Scanner", icon: "ScanLine", path: "/qr" },
  { name: "Issues & Returns", icon: "ArrowLeftRight", path: "/transactions" },
  { name: "Allocations", icon: "Users", path: "/allocations" },
  { name: "Reports", icon: "FileBarChart2", path: "/reports" },
  { name: "Audit Logs", icon: "ClipboardList", path: "/audit" },
];

