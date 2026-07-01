// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE, TOKEN_KEY, setToken as persist, clearToken } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setTok] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) throw new Error("invalid");
        const data = await res.json();
        if (!cancelled) {
          setUser({ email: data.email });
          setTok(t);
        }
      } catch {
        clearToken();
        if (!cancelled) {
          setTok(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
  }

  async function login(email, password) {
    const data = await post("/auth/login", { email, password });
    persist(data.access_token);
    setTok(data.access_token);
    setUser({ email: data.email });
    return data;
  }

  async function signup(email, password) {
    const data = await post("/auth/signup", { email, password });
    persist(data.access_token);
    setTok(data.access_token);
    setUser({ email: data.email });
    return data;
  }

  function logout() {
    clearToken();
    setTok(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, loading, isAuthed: !!token, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
