import React from "react";
import img2 from "../assets/imgs/hero2.png";
import Logout from "./Logout";
import { useAuth } from "../context/AuthContext"; // 👈 importa o hook

export const Header = () => {
  const { isAuthenticated } = useAuth(); // 👈 pega info de login

  return (
    <div>
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          aria-label="Global"
          className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        >
          <div className="flex lg:flex-1">
            <a href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Faculdades Integradas de Bauru</span>
              <img
                alt="Logo"
                src={img2}
                className="h-8 w-auto"
              />
            </a>
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-center lg:space-x-6">
            <a href="/" className="font-medium text-gray-900 hover:text-gray-900">
              Home
            </a>
            <a href="/about" className="font-medium text-gray-900 hover:text-gray-900">
              Sobre-nós
            </a>

            {/* ✅ Condicional: só mostra se estiver logado */}
            {isAuthenticated && (
              <>
                <a href="/gallery" className="font-medium text-gray-900 hover:text-gray-900">
                  Galeria
                </a>
                <Logout />
              </>
            )}
          </div>
        </nav>
      </header>
    </div>
  );
};
