import React from "react";
import { useNavigate } from "react-router-dom";

const AcessoNegado = () => {

  const navigate = useNavigate();

  return (
    <div className="text-center mt-10">
      <h1 className="text-3xl font-bold text-red-600">Acesso Negado</h1>
      <p className="mt-4 text-gray-700">Você não tem permissão para acessar esta página.</p>
      <p className="mt-4 text-gray-300 cursor-pointer text-xl p-5 bg-gray-900" onClick={() => {
        navigate("/options");
      }}>Voltar para Options</p>
    </div>
  );
};

export default AcessoNegado;
