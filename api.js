export const getApiBase = () => {
  const saved = localStorage.getItem("apiBase");
  if (saved) return saved.trim().replace(/\/+$/, '');
  const host = window.location.hostname || "localhost";
  return `http://${host}:8000`;
};

export const setApiBase = (url) => {
  if (!url) return;
  localStorage.setItem("apiBase", url.trim().replace(/\/+$/, ''));
};

export const getAuthToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
};

export const setAuthToken = (token, remember = true) => {
  if (remember) {
    localStorage.setItem("token", token);
  } else {
    sessionStorage.setItem("token", token);
  }
};

export const clearAuth = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
};

export const apiFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401) {
    clearAuth();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return res;
};
