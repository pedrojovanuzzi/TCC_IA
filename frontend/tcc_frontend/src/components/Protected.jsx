import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ element, minPermission = 2 }) => {
  const { isAuthenticated, permissionLevel } = useAuth();

  const hasPermission = isAuthenticated && permissionLevel >= minPermission;

  return hasPermission ? element : <Navigate to="/login" />;
};

export default ProtectedRoute;
