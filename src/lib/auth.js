const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: "The local server returned an invalid response.",
  }));

  if (!response.ok || !data.success) {
    throw new Error(data.message || "The request could not be completed.");
  }

  return data;
}

export function getSession() {
  return request("dashboard.php");
}

export function login(username, password) {
  return request("login.php", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request("logout.php", { method: "POST" });
}
