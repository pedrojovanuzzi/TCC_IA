import React from "react";
import img2 from "../assets/imgs/hero2.png";

export const Header = () => {
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
                alt=""
                src={img2}
                className="h-8 w-auto"
              />
            </a>
          </div>
        </nav>
      </header>
    </div>
  );
};
