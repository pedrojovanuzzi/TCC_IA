import React, { useState, useEffect } from "react";
import axios from "axios";
import getHostName from "../../../utils/getUrl";
import { useAuth } from "../../context/AuthContext";

export const CronJob = () => {
  const [tempo, setTempo] = useState("");
  const [ativo, setAtivo] = useState(false);
  const token = localStorage.getItem("access_token") || ""
  
  const API_URL = getHostName();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/cronjob`,
        { time: tempo, active: ativo },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      alert("Erro ao salvar configuração!");
    }
  };

  const carregarConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/cronjob`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTempo(response.data.time || "");
      setAtivo(response.data.active || false);
    } catch (error) {
      console.error("Erro ao buscar configuração:", error);
    }
  };

  useEffect(() => {
    if (token) carregarConfig();
  }, [token]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-96">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Definir Tempo para Limpar Galeria
        </h1>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <label className="text-gray-600 font-medium mb-1">
              Repetir a cada:
            </label>
            <input
              placeholder="Ex: 30D"
              type="text"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-gray-600 font-medium">Ativo:</label>
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-500 transition-all duration-300"
          >
            Salvar Configuração
          </button>
        </form>
      </div>
    </div>
  );
};
