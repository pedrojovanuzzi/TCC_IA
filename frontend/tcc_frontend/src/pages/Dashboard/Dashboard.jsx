// Importa bibliotecas e componentes necessários
import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import axios from "axios";
import Header from "../../components/Header";
import getHostName from "../../../utils/getUrl";

export const Dashboard = () => {
  // Estados principais
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState("Todos");
  const [tipoGrafico, setTipoGrafico] = useState("classe"); // 🔹 "classe" | "camera" | "usuario"
  
  const API_URL = getHostName();
  const token = localStorage.getItem("access_token") || "";

  useEffect(() => {
    buscarDeteccoes();
  }, []);

  async function buscarDeteccoes() {
    try {
      const res = await axios.get(`${API_URL}/detections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDados(res.data);
    } catch (err) {
      console.error("Erro ao buscar detecções:", err);
    } finally {
      setLoading(false);
    }
  }

  const meses = [
    "Todos",
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // 🔹 Filtro por mês
  const dadosFiltrados =
    mesSelecionado === "Todos"
      ? dados
      : dados.filter((item) => {
          const data = new Date(item.created_at);
          const mes = data.toLocaleString("pt-BR", { month: "long" });
          return mes.toLowerCase() === mesSelecionado.toLowerCase();
        });

  // 🔹 Paleta de cores
  const coresPorClasse = {
    glasses: "#800080",
    helmet: "#00FF00",
    glove: "#00FFFF",
    hands: "#FFFF00",
    head: "#0000FF",
    belt: "#FFA500",
    no_glasses: "#FF00FF",
    no_belt: "#FF0000",
    boots: "#0080FF",
  };
  const getCorClasse = (nome, index) => {
    const cores = Object.values(coresPorClasse);
    return coresPorClasse[nome] || cores[index % cores.length];
  };

  // 🔹 Agrupa por classe
  const agruparPorClasse = () =>
    Object.values(
      dadosFiltrados.reduce((acc, item) => {
        acc[item.class_name] = acc[item.class_name] || { nome: item.class_name, valor: 0 };
        acc[item.class_name].valor++;
        return acc;
      }, {})
    );

  // 🔹 Agrupa por câmera
  const agruparPorCamera = () =>
    Object.values(
      dadosFiltrados.reduce((acc, item) => {
        acc[item.camera_name] = acc[item.camera_name] || { nome: item.camera_name, valor: 0 };
        acc[item.camera_name].valor++;
        return acc;
      }, {})
    );

  // 🔹 Agrupa por usuário
  const agruparPorUsuario = () =>
    Object.values(
      dadosFiltrados.reduce((acc, item) => {
        const nome = item.user_id ? `Usuário ${item.user_id}` : "Desconhecido";
        acc[nome] = acc[nome] || { nome, valor: 0 };
        acc[nome].valor++;
        return acc;
      }, {})
    );

  // Escolhe qual agrupamento mostrar
  let dadosGrafico = [];
  if (tipoGrafico === "classe") dadosGrafico = agruparPorClasse();
  else if (tipoGrafico === "camera") dadosGrafico = agruparPorCamera();
  else if (tipoGrafico === "usuario") dadosGrafico = agruparPorUsuario();

  // 🔹 Cores dinâmicas
  const getCor = (i) => Object.values(coresPorClasse)[i % 9];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-200 text-gray-900 p-6 flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-center text-cyan-600">Painel de Detecções YOLO</h1>

        {/* 🔽 Filtros */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {/* Filtro de Mês */}
          <select
            className="bg-gray-800 text-white border border-cyan-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
          >
            {meses.map((mes) => (
              <option key={mes} value={mes}>
                {mes}
              </option>
            ))}
          </select>

          {/* Tipo de gráfico */}
          <select
            className="bg-gray-800 text-white border border-green-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
            value={tipoGrafico}
            onChange={(e) => setTipoGrafico(e.target.value)}
          >
            <option value="classe">Por Classe Detectada</option>
            <option value="camera">Por Câmera</option>
            <option value="usuario">Por Funcionário</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Carregando dados...</p>
        ) : (
          <>
            {/* 🧩 Gráfico Dinâmico */}
            <div className="bg-gray-800 text-white rounded-2xl shadow-md p-6 mx-auto w-full lg:w-2/3">
              <h3 className="text-lg font-semibold mb-4 text-cyan-400 text-center">
                {tipoGrafico === "classe"
                  ? "Detecções por Classe"
                  : tipoGrafico === "camera"
                  ? "Detecções por Câmera"
                  : "Detecções por Funcionário"}
              </h3>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGrafico === "camera" ? (
                    // 🎥 Câmeras → gráfico de pizza
                    <PieChart>
                      <Pie
                        data={dadosGrafico}
                        dataKey="valor"
                        nameKey="nome"
                        outerRadius={130}
                        label
                      >
                        {dadosGrafico.map((entry, index) => (
                          <Cell key={index}  fill={getCor(index)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#e4e4e4", borderRadius: "10px" }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Legend />
                    </PieChart>
                  ) : (
                    // 📊 Classe ou Usuário → gráfico de barras
                    <BarChart
                      data={dadosGrafico}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                      <XAxis dataKey="nome" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", borderRadius: "10px" }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Legend />
                      <Bar dataKey="valor" fill="#00FFFF" name="Quantidade">
                        {dadosGrafico.map((obj, i) => (
                          <Cell key={i} fill={getCorClasse(obj.nome, i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-white rounded-2xl shadow p-6 text-center mt-8 w-full lg:w-2/3 mx-auto">
              <h2 className="text-2xl font-bold text-cyan-600 mb-4">Resumo</h2>
              <p className="text-lg">
                Total de detecções:{" "}
                <span className="font-bold text-cyan-700">{dadosFiltrados.length}</span>
              </p>
              <p className="text-gray-600">
                Agrupado por: {tipoGrafico} | Última atualização:{" "}
                {new Date().toLocaleString("pt-BR")}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
};
