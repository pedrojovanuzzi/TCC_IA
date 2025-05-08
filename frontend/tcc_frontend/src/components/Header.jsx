import React from "react";
import img2 from "../assets/imgs/hero2.png";
import Logout from "./Logout";
import { useAuth } from "../context/AuthContext";
import { Disclosure } from "@headlessui/react";
import { MenuIcon, XIcon } from "@heroicons/react/outline";

export const Header = () => {
  const { nivel, isLoading, logout } = useAuth();

  // while loading auth info, render nothing or a spinner
  if (isLoading) return null;

  return (
    <Disclosure as="nav" className="bg-white fixed w-full z-50 shadow">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center">
                <a href="/">
                  <img className="h-8 w-auto" src={img2} alt="Logo" />
                </a>
              </div>
              <div className="hidden md:flex space-x-6 items-center">
                <a href="/" className="text-gray-900 font-medium">
                  Home
                </a>
                <a href="/about" className="text-gray-900 font-medium">
                  Sobre-nós
                </a>
                {nivel >= 2 && (
                  <>
                    <a href="/logs" className="text-gray-900 font-medium">
                      Logs
                    </a>
                  </>
                )}
                {/* apenas usuários com nível >=3 */}
                {nivel >= 3 && (
                  <>
                    <a href="/gallery" className="text-gray-900 font-medium">
                      Galeria
                    </a>
                    <a href="/users" className="text-gray-900 font-medium">
                      Usuários
                    </a>
                  </>
                )}
                {/* mostra botão de logout se autenticado */}
                {nivel !== null && (
                  <button
                    onClick={logout}
                    className="text-gray-900 font-medium hover:underline"
                  >
                    Sair
                  </button>
                )}
              </div>
              <div className="md:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center p-2 text-gray-900">
                  {open ? (
                    <XIcon className="h-6 w-6" />
                  ) : (
                    <MenuIcon className="h-6 w-6" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>
          <Disclosure.Panel className="md:hidden px-4 pb-3 space-y-1">
            <a href="/" className="block text-gray-900 font-medium">
              Home
            </a>
            <a href="/about" className="block text-gray-900 font-medium">
              Sobre-nós
            </a>
            {nivel >= 2 && (
              <>
                <a href="/logs" className="block text-gray-900 font-medium">
                  Logs
                </a>
              </>
            )}
            {nivel >= 3 && (
              <>
                <a href="/gallery" className="block text-gray-900 font-medium">
                  Galeria
                </a>
                <a href="/users" className="block text-gray-900 font-medium">
                  Usuários
                </a>
              </>
            )}
            {nivel !== null && <Logout />}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Header;