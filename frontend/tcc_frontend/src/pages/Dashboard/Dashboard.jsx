import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import axios from "axios";
import Header from "../../components/Header";
import getHostName from "../../../utils/getUrl";

export const Dashboard = () => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState("Todos");
  const [tipoGrafico, setTipoGrafico] = useState("classe");
  const [filtroAno, setFiltroAno] = useState("Todos");
  const [filtroMes, setFiltroMes] = useState("Todos");
  const [filtroDia, setFiltroDia] = useState("Todos");
  const [filtroHora, setFiltroHora] = useState("Todos");

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
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const CLASSES_SEGURO = ["helmet", "glove", "glasses", "belt", "boots"];

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

  // 🔹 Filtro por mês (gráfico principal)
  const dadosFiltrados =
    mesSelecionado === "Todos"
      ? dados
      : dados.filter((item) => {
          const data = new Date(item.created_at);
          const mes = data.toLocaleString("pt-BR", { month: "long" });
          return mes.toLowerCase() === mesSelecionado.toLowerCase();
        });

  // 🔹 Agrupa por classe
  const agruparPorClasse = () =>
    Object.values(
      dadosFiltrados.reduce((acc, item) => {
        acc[item.class_name] = acc[item.class_name] || {
          nome: item.class_name,
          valor: 0,
        };
        acc[item.class_name].valor++;
        return acc;
      }, {})
    );

  // 🔹 Agrupa por câmera
  const agruparPorCamera = () =>
    Object.values(
      dadosFiltrados.reduce((acc, item) => {
        acc[item.camera_name] = acc[item.camera_name] || {
          nome: item.camera_name,
          valor: 0,
        };
        acc[item.camera_name].valor++;
        return acc;
      }, {})
    );

  // 🔹 Dados da catraca (riscos)
  const dadosCatraca = dados
    .filter(
      (d) =>
        d.camera_name?.toLowerCase().includes("catraca_entrada") &&
        !CLASSES_SEGURO.includes(d.class_name)
    )
    .map((d) => {
      const data = new Date(d.created_at);
      return {
        user: d.employee_name || d.name || `Usuário ${d.user_id || "?"}`,
        ano: data.getFullYear(),
        mes: data.getMonth() + 1,
        dia: data.getDate(),
        hora: data.getHours(),
        class_name: d.class_name,
        color: coresPorClasse[d.class_name] || "#FF0000",
      };
    });

  // 🔹 Filtros de data aplicados no gráfico da catraca
  const dadosCatracaFiltrados = dadosCatraca.filter((d) => {
    const condAno = filtroAno === "Todos" || d.ano === Number(filtroAno);
    const condMes = filtroMes === "Todos" || d.mes === Number(filtroMes);
    const condDia = filtroDia === "Todos" || d.dia === Number(filtroDia);
    const condHora = filtroHora === "Todos" || d.hora === Number(filtroHora);
    return condAno && condMes && condDia && condHora;
  });

  // 🔹 Agrupa por funcionário
  const dadosCatracaAgrupados = Object.values(
    dadosCatracaFiltrados.reduce((acc, item) => {
      acc[item.user] = acc[item.user] || {
        nome: item.user,
        valor: 0,
        color: item.color,
      };
      acc[item.user].valor++;
      return acc;
    }, {})
  );

  // 🔹 Escolhe gráfico principal
  const dadosGrafico =
    tipoGrafico === "classe" ? agruparPorClasse() : agruparPorCamera();

  const getCor = (i) => Object.values(coresPorClasse)[i % 9];

  // 🔹 Gerar opções dinâmicas de filtros
  const anos = ["Todos", ...new Set(dadosCatraca.map((d) => d.ano))];
  const mesesFiltro = ["Todos", ...new Set(dadosCatraca.map((d) => d.mes))];
  const dias = ["Todos", ...new Set(dadosCatraca.map((d) => d.dia))];
  const horas = ["Todos", ...new Set(dadosCatraca.map((d) => d.hora))];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-200 text-gray-900 p-6 flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-center text-cyan-600">
          Painel de Detecções YOLO
        </h1>

        {/* 🔽 Filtros principais */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <select
            className="bg-gray-800 text-white border border-cyan-500 rounded-lg px-4 py-2"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
          >
            {meses.map((mes) => (
              <option key={mes}>{mes}</option>
            ))}
          </select>

          <select
            className="bg-gray-800 text-white border border-green-500 rounded-lg px-4 py-2"
            value={tipoGrafico}
            onChange={(e) => setTipoGrafico(e.target.value)}
          >
            <option value="classe">Por Classe Detectada</option>
            <option value="camera">Por Câmera</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Carregando dados...</p>
        ) : (
          <>
            {/* 🧩 Gráfico principal */}
            <div className="bg-gray-800 text-white rounded-2xl shadow-md p-6 mx-auto w-full lg:w-2/3">
              <h3 className="text-lg font-semibold mb-4 text-cyan-400 text-center">
                {tipoGrafico === "classe"
                  ? "Detecções por Classe"
                  : "Detecções por Câmera"}
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGrafico === "camera" ? (
                    <PieChart>
                      <Pie
                        data={dadosGrafico}
                        dataKey="valor"
                        nameKey="nome"
                        outerRadius={130}
                        label
                      >
                        {dadosGrafico.map((entry, index) => (
                          <Cell key={index} fill={getCor(index)} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#eef1f5" }} />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart
                      data={dadosGrafico}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                      <XAxis dataKey="nome" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937" }} />
                      <Legend />
                      <Bar dataKey="valor" fill="white" name="Quantidade">
                        {dadosGrafico.map((obj, i) => (
                          <Cell key={i} fill={getCorClasse(obj.nome, i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* 📆 Gráfico de Catraca */}
            <div className="bg-gray-900 text-white rounded-2xl shadow-md p-6 mx-auto w-full lg:w-2/3 mt-10">
              <h3 className="text-lg font-semibold mb-4 text-red-400 text-center">
                Funcionários Detectados sem EPI - Catraca Entrada
              </h3>

              {/* 🔹 Filtros de data */}
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                <select
                  className="bg-gray-800 px-3 py-2 rounded"
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(e.target.value)}
                >
                  {anos.map((ano) => (
                    <option key={ano}>{ano}</option>
                  ))}
                </select>
                <select
                  className="bg-gray-800 px-3 py-2 rounded"
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                >
                  {mesesFiltro.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <select
                  className="bg-gray-800 px-3 py-2 rounded"
                  value={filtroDia}
                  onChange={(e) => setFiltroDia(e.target.value)}
                >
                  {dias.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <select
                  className="bg-gray-800 px-3 py-2 rounded"
                  value={filtroHora}
                  onChange={(e) => setFiltroHora(e.target.value)}
                >
                  {horas.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* 🔹 Gráfico de barras por funcionário */}
              {dadosCatracaAgrupados.length > 0 ? (
                <div className="h-96">
                  {/* Container responsivo do gráfico */}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosCatracaAgrupados} // Dados de entrada do gráfico
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }} // Margens
                    >
                      {/* Grade de fundo */}
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />

                      {/* Eixo X com os nomes dos funcionários */}
                      <XAxis
                        dataKey="nome"
                        stroke="#fff"
                        tick={{ fontSize: 10 }}
                      />

                      {/* Eixo Y com a contagem de detecções */}
                      <YAxis stroke="#fff" />

                      {/* Tooltip (caixa de informação ao passar o mouse) */}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          color: "#fff",
                          borderRadius: "8px",
                        }}
                      />

                      {/* Legenda superior */}
                      <Legend />

                      {/* 🔹 Barras de detecção com cor gerada automaticamente */}
                      <Bar
                        dataKey="valor"
                        fill="white"
                        name="Detecções sem EPI"
                      >
                        {dadosCatracaAgrupados.map((obj, i) => {
                          // 🔸 Função que gera uma cor única com base no nome (hash simples)
                          const gerarCor = (str) => {
                            let hash = 0;
                            for (let j = 0; j < str.length; j++) {
                              hash = str.charCodeAt(j) + ((hash << 5) - hash);
                            }
                            // Converte hash em cor HSL (hue 0-360)
                            const h = hash % 360;
                            return `hsl(${h}, 70%, 55%)`; // Saturação e brilho fixos → cores vibrantes e equilibradas
                          };

                          // 🔹 Usa a cor específica da classe, se existir; senão gera baseada no nome do usuário
                          const corFinal = gerarCor(obj.nome);

                          // Cria a célula (barra) com a cor correspondente
                          return <Cell key={i} fill={corFinal} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-gray-400">
                  Nenhum funcionário detectado sem EPI na catraca.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};