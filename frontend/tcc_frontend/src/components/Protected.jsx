import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ element, minPermission = 1 }) => {
  const { isAuthenticated, nivel, isLoading } = useAuth();

  if (isLoading) return <div>Carregando...</div>;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (nivel < minPermission) return <Navigate to="/acesso-negado" replace />;

  return element;
};

export default ProtectedRoute;
