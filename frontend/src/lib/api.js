// src/lib/api.js
// Central API helper. authFetch attaches the JWT and handles 401s
// (token missing/expired -> clear it and bounce to /login).

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "https://defirisk-ai-backend.onrender.com";

export const TOKEN_KEY = "defirisk_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function authFetch(input, options = {}) {
  const token = getToken();
  const url = input.startsWith("http") ? input : `${API_BASE}${input}`;

  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  return res;
}
