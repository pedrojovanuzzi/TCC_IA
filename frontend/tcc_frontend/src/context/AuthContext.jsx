import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

// Função para decodificar JWT sem bibliotecas externas
const parseJwt = (token) => {
  try {
    const base64 = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [nivel, setNivel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const storedNivel = localStorage.getItem("nivel");
    if (token && storedNivel === null) {
  const payload = parseJwt(token);
  if (payload && Date.now() < payload.exp * 1000) {
    setNivel(payload.nivel);
    setUsername(payload.username);
    localStorage.setItem("nivel", String(payload.nivel));
    localStorage.setItem("username", payload.username);
  } else {
    localStorage.removeItem("access_token");
    localStorage.removeItem("nivel");
    localStorage.removeItem("username");
  }
} else if (storedNivel) {
  setNivel(Number(storedNivel));
  const storedUsername = localStorage.getItem("username");
  if (storedUsername) setUsername(storedUsername);
}

    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch("http://localhost:3001/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;

      const { access_token } = await res.json();
      localStorage.setItem("access_token", access_token);
      const payload = parseJwt(access_token);
      if (payload) {
        setNivel(payload.nivel);
        setUsername(payload.username);
        localStorage.setItem("nivel", String(payload.nivel));
        localStorage.setItem("username", payload.username);
      }
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setNivel(null);
    setUsername(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("nivel");
    localStorage.removeItem("username");
  };

  return (
    <AuthContext.Provider value={{ nivel, username, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
