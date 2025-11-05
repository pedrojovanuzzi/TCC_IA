import React, { useState, useEffect } from "react";
import axios from "axios";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export const CronJob = () => {
  const [tempo, setTempo] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [email, setEmail] = useState(""); // ✅ novo campo
  const [erro, setErro] = useState("");
  const API_URL = getHostName();
  const token = localStorage.getItem("access_token") || "";

  // Expressão regular que valida entradas como "10D 2H 30M 5S"
  const regex = /^(?:(\d+\s*D))?(?:\s*(\d+\s*H))?(?:\s*(\d+\s*M))?(?:\s*(\d+\s*S))?$/i;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ⚠️ Validação básica
    if (!regex.test(tempo.trim()) || tempo.trim() === "") {
      setErro("Formato inválido. Exemplo: 1D 2H 30M ou 10M 5S.");
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErro("E-mail inválido.");
      return;
    }

    setErro("");
    try {
      await axios.post(
        `${API_URL}/cronjob`,
        { time: tempo.trim(), active: ativo, email: email.trim() },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("✅ Configuração salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      alert("❌ Erro ao salvar configuração!");
    }
  };

  const carregarConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/cronjob`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTempo(response.data.time || "");
      setAtivo(response.data.active || false);
      setEmail(response.data.email || ""); // ✅ preenche e-mail salvo
    } catch (error) {
      console.error("Erro ao buscar configuração:", error);
    }
  };

  useEffect(() => {
    if (token) carregarConfig();
  }, [token]);

  return (
    <>
      <Header />
      <div className="flex justify-center mt-10">
        <div className="bg-white shadow-2xl rounded-2xl p-8 w-96">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Definir Tempo para Limpar Galeria
          </h1>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* CAMPO TEMPO */}
            <div className="flex flex-col">
              <label className="text-gray-600 font-medium mb-1">Repetir a cada:</label>
              <input
                placeholder="Ex: 30D, 2H 30M, 10M 5S"
                type="text"
                value={tempo}
                onChange={(e) => {
                  setTempo(e.target.value);
                  if (regex.test(e.target.value.trim())) setErro("");
                }}
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                  erro ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                }`}
              />
            </div>

            {/* CAMPO EMAIL */}
            <div className="flex flex-col">
              <label className="text-gray-600 font-medium mb-1">
                E-mail para notificações:
              </label>
              <input
                type="email"
                placeholder="exemplo@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* CHECKBOX */}
            <div className="flex items-center justify-between">
              <label className="text-gray-600 font-medium">Ativo:</label>
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>

            {/* BOTÃO */}
            <button
              type="submit"
              disabled={!!erro || tempo.trim() === ""}
              className={`${
                erro
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
              } text-white font-semibold py-2 rounded-lg shadow-md transition-all duration-300`}
            >
              Salvar Configuração
            </button>

            {/* MENSAGEM DE ERRO */}
            {erro && <p className="text-sm text-red-600 mt-1 font-medium">{erro}</p>}
          </form>
        </div>
      </div>
    </>
  );
};