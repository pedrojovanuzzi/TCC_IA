import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const LogoutButton = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return <button className="font-medium text-gray-900 hover:text-gray-900 cursor-pointer" onClick={handleLogout}>Sair</button>;
};

export default LogoutButton;
