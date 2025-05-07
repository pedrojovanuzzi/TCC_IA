import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ element, minPermission = 1 }) => {
  const { nivel, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  // Se não houver nível extraído do token, considera usuário não autenticado
  if (nivel === null) {
    return <Navigate to="/login" replace />;
  }

  // Se o nível for inferior ao mínimo exigido
  if (nivel < minPermission) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return element;
};

export default ProtectedRoute;
