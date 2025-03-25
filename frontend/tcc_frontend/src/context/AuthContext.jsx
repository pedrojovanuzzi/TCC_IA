import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Lê do localStorage se o usuário já está autenticado
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("isAuthenticated") === "true"
  );

  const login = async (username, password) => {
    try {
      const response = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }), // envia os dois
      });
  
      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem("isAuthenticated", "true");
        return true;
      } else {
        const data = await response.json();
        console.error("Erro:", data.message);
        return false;
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      return false;
    }
  };
  
  

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated"); // Remove do localStorage
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
