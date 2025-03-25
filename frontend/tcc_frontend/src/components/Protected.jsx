import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ element, minPermission = 1 }) => {
  const { isAuthenticated, nivel } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (nivel < minPermission) return <Navigate to="/acesso-negado" />;

  return element;
};

export default ProtectedRoute;
