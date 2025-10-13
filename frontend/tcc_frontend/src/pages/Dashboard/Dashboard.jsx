// Importa bibliotecas e componentes necessários
import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"; // Importa componentes do Recharts (incluindo Cell, usado para colorir barras)
import axios from "axios";
import Header from "../../components/Header";
import getHostName from "../../../utils/getUrl";

// Componente principal do Dashboard
export const Dashboard = () => {
  // Define estados do componente
  const [dados, setDados] = useState([]); // Armazena todos os dados vindos da API
  const [loading, setLoading] = useState(true); // Indica se está carregando
  const [mesSelecionado, setMesSelecionado] = useState("Todos"); // Armazena o mês escolhido no filtro

  // Obtém URL base da API e token JWT
  const API_URL = getHostName();
  const token = localStorage.getItem("access_token") || "";

  // Executa automaticamente ao carregar a página
  useEffect(() => {
    buscarDeteccoes(); // Busca os dados da API
  }, []);

  // Função assíncrona para buscar as detecções do backend
  async function buscarDeteccoes() {
    try {
      const res = await axios.get(`${API_URL}/detections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDados(res.data); // Salva os dados recebidos
    } catch (err) {
      console.error("Erro ao buscar detecções:", err);
    } finally {
      setLoading(false); // Finaliza o carregamento
    }
  }

  // Lista de meses para o filtro
  const meses = [
    "Todos",
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // 🔹 Filtra os dados de acordo com o mês selecionado
  const dadosFiltrados =
    mesSelecionado === "Todos"
      ? dados // Se for “Todos”, retorna tudo
      : dados.filter((item) => {
          const data = new Date(item.created_at); // Converte a data de string para objeto Date
          const mes = data.toLocaleString("pt-BR", { month: "long" }); // Pega o mês por extenso
          return mes.toLowerCase() === mesSelecionado.toLowerCase(); // Compara o mês atual com o selecionado
        });

  // 🔹 Agrupa os dados por classe detectada
  const dadosPorClasse = Object.values(
    dadosFiltrados.reduce((acc, item) => {
      // Se a classe ainda não existe no acumulador, cria
      acc[item.class_name] = acc[item.class_name] || { nome: item.class_name, valor: 0 };
      acc[item.class_name].valor++; // Incrementa o contador dessa classe
      return acc;
    }, {})
  );

  // 🔹 Mapeia cores fixas para cada classe
  const coresPorClasse = {
    helmet: "#3b82f6", // azul
    glove: "#10b981", // verde
    glasses: "#facc15", // amarelo
    belt: "#ef4444", // vermelho
    boots: "#8b5cf6", // roxo
    vest: "#14b8a6", // ciano
    jacket: "#f97316", // laranja
  };

  // Função que retorna a cor da classe ou uma cor padrão se não existir
  const getCorClasse = (nome, index) => {
    const cores = Object.values(coresPorClasse);
    return coresPorClasse[nome] || cores[index % cores.length];
  };

  // Renderização principal do Dashboard
  return (
    <>
      <Header /> {/* Cabeçalho da página */}
      <div className="min-h-screen bg-gray-200 text-gray-900 p-6 flex flex-col gap-8">
        {/* Título principal */}
        <h1 className="text-3xl font-bold text-center text-cyan-600">
          Painel de Detecções YOLO
        </h1>

        {/* 🔽 Filtro de mês */}
        <div className="flex justify-center mb-6">
          <select
            className="bg-gray-800 text-white border border-cyan-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)} // Atualiza o estado ao trocar o mês
          >
            {meses.map((mes) => (
              <option key={mes} value={mes}>
                {mes}
              </option>
            ))}
          </select>
        </div>

        {/* Mostra "carregando" até a API responder */}
        {loading ? (
          <p className="text-center text-gray-600">Carregando dados...</p>
        ) : (
          <>
            {/* 🧩 Gráfico de Barras (por Classe) */}
            <div className="bg-gray-800 text-white rounded-2xl shadow-md p-6 mx-auto w-full lg:w-2/3">
              <h3 className="text-lg font-semibold mb-4 text-cyan-400 text-center">
                Objetos Detectados
              </h3>

              {/* Container do gráfico */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosPorClasse} // Dados para o gráfico
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    {/* Grade de fundo */}
                    <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                    {/* Eixo X com o nome da classe */}
                    <XAxis dataKey="nome" stroke="#fff" />
                    {/* Eixo Y com contagem */}
                    <YAxis stroke="#fff" />
                    {/* Tooltip mostra detalhes ao passar o mouse */}
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", borderRadius: "10px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    {/* Legenda com identificação das barras */}
                    <Legend />
                    {/* Define a barra principal */}
                    <Bar dataKey="valor" fill='white' name="Quantidade">
                      {/* Cada barra recebe uma cor diferente conforme a classe */}
                      {dadosPorClasse.map((obj, i) => (
                        <Cell key={i} fill={getCorClasse(obj.nome, i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lista de objetos e quantidades com as mesmas cores */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {dadosPorClasse.length > 0 ? (
                  dadosPorClasse.map((obj, i) => (
                    <div
                      key={i}
                      className="bg-gray-700 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
                    >
                      <span
                        className="inline-block w-4 h-4 rounded-full"
                        style={{ backgroundColor: getCorClasse(obj.nome, i) }}
                      ></span>
                      <p className="font-semibold">
                        {obj.nome}: {obj.valor}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center w-full">
                    Nenhum objeto detectado neste mês.
                  </p>
                )}
              </div>
            </div>

            {/* 🔹 Resumo geral */}
            <div className="bg-white rounded-2xl shadow p-6 text-center mt-8 w-full lg:w-2/3 mx-auto">
              <h2 className="text-2xl font-bold text-cyan-600 mb-4">Resumo</h2>
              <p className="text-lg">
                Total de detecções:{" "}
                <span className="font-bold text-cyan-700">{dadosFiltrados.length}</span>
              </p>
              <p className="text-gray-600">
                Objetos detectados: {dadosPorClasse.length} | Última atualização:{" "}
                {new Date().toLocaleString("pt-BR")}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
};
