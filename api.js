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
