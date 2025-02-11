import { useState, useEffect } from "react";
import Authentication from "../pages/Authentication/Authentication";

export default function ProtectedPage({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("auth") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Authentication onLogin={() => setIsAuthenticated(true)} />
  );
}
