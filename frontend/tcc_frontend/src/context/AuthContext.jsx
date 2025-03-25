import React, { createContext, useContext, useState, useEffect } from "react";


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nivel, setNivel] = useState(1);

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated") === "true";
    const nivelSalvo = parseInt(localStorage.getItem("nivel") || "1");
    setIsAuthenticated(auth);
    setNivel(nivelSalvo);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setNivel(data.nivel);
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("nivel", data.nivel);
        return true;
      }

      return false;
    } catch (err) {
      console.error("Erro ao logar:", err);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setNivel(1);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("nivel");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, nivel, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
