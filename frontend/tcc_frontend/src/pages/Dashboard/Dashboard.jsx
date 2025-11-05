import React, { useEffect, useState } from "react"; // React e hooks (efeitos e estado)
import { // Componentes do Recharts para gráficos responsivos
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
import axios from "axios"; // Cliente HTTP para acessar a API
import Header from "../../components/Header"; // Componente de cabeçalho
import getHostName from "../../../utils/getUrl"; // Utilitário para obter URL base da API

export const Dashboard = () => { // Componente principal do painel
  const [dados, setDados] = useState([]); // Lista de detecções vindas da API
  const [loading, setLoading] = useState(true); // Indicador de carregamento
  const [mesSelecionado, setMesSelecionado] = useState("Todos"); // Filtro por mês (gráfico principal)
  const [tipoGrafico, setTipoGrafico] = useState("classe"); // Tipo do gráfico principal
  const [filtroAno, setFiltroAno] = useState("Todos"); // Filtro catraca: ano
  const [filtroMes, setFiltroMes] = useState("Todos"); // Filtro catraca: mês
  const [filtroDia, setFiltroDia] = useState("Todos"); // Filtro catraca: dia
  const [filtroHora, setFiltroHora] = useState("Todos"); // Filtro catraca: hora

  const API_URL = getHostName(); // URL base da API
  const token = localStorage.getItem("access_token") || ""; // Token JWT salvo no navegador

  useEffect(() => { // Ao montar, busca as detecções
    buscarDeteccoes(); // Chama a função de busca
  }, []); // Executa apenas uma vez na montagem

  async function buscarDeteccoes() { // Obtém detecções da API
    try { // Tenta fazer a requisição
      const res = await axios.get(`${API_URL}/detections`, {
        headers: { Authorization: `Bearer ${token}` }, // Autorização via Bearer token
      });
      setDados(res.data); // Atualiza estado com os dados
    } catch (err) {
      console.error("Erro ao buscar detecções:", err); // Loga erro se falhar
    } finally {
      setLoading(false); // Finaliza carregamento
    }
  }

  const meses = [ // Lista de meses para o seletor de filtro
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

  const CLASSES_SEGURO = ["helmet", "glove", "glasses", "belt", "boots"]; // Itens considerados EPI ok

  const coresPorClasse = { // Mapa de cores por classe detectada
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

  const getCorClasse = (nome, index) => { // Resolve cor por classe, com fallback cíclico
    const cores = Object.values(coresPorClasse); // Lista de cores disponíveis
    return coresPorClasse[nome] || cores[index % cores.length]; // Preferência pela cor da classe
  };

  // Filtro por mês (gráfico principal)
  const dadosFiltrados =
    mesSelecionado === "Todos"
      ? dados
      : dados.filter((item) => {
          const data = new Date(item.created_at); // Converte timestamp em data
          const mes = data.toLocaleString("pt-BR", { month: "long" }); // Nome do mês
          return mes.toLowerCase() === mesSelecionado.toLowerCase(); // Compara com filtro
        });

  // Agrupa por classe
  const agruparPorClasse = () => // Retorna array com {nome, valor} por classe
    Object.values(
      dadosFiltrados.reduce((acc, item) => {
        acc[item.class_name] = acc[item.class_name] || { // Inicializa acumulador
          nome: item.class_name, // Nome da classe
          valor: 0, // Contador
        };
        acc[item.class_name].valor++; // Incrementa contagem
        return acc; // Retorna acumulador
      }, {})
    );

  // Agrupa por câmera
  const agruparPorCamera = () => // Retorna array com {nome, valor} por câmera
    Object.values(
      dadosFiltrados.reduce((acc, item) => {
        acc[item.camera_name] = acc[item.camera_name] || { // Inicializa acumulador
          nome: item.camera_name, // Nome da câmera
          valor: 0, // Contador
        };
        acc[item.camera_name].valor++; // Incrementa contagem
        return acc; // Retorna acumulador
      }, {})
    );

  // Dados da catraca (registros de risco sem EPI na catraca_entrada)
  const dadosCatraca = dados
    .filter(
      (d) =>
        d.camera_name?.toLowerCase().includes("catraca_entrada") &&
        !CLASSES_SEGURO.includes(d.class_name)
    )
    .map((d) => {
      const data = new Date(d.created_at); // Converte timestamp
      return {
        user: d.employee_name || d.name || `Usuário ${d.user_id || "?"}`, // Nome do funcionário
        ano: data.getFullYear(), // Ano numérico
        mes: data.getMonth() + 1, // Mês (1-12)
        dia: data.getDate(), // Dia do mês
        hora: data.getHours(), // Hora do dia
        class_name: d.class_name, // Classe detectada (violação)
        color: coresPorClasse[d.class_name] || "#FF0000", // Cor da classe
      };
    });

  // Filtros de data aplicados no gráfico da catraca
  const dadosCatracaFiltrados = dadosCatraca.filter((d) => { // Aplica filtros selecionados
    const condAno = filtroAno === "Todos" || d.ano === Number(filtroAno); // Filtra por ano
    const condMes = filtroMes === "Todos" || d.mes === Number(filtroMes); // Filtra por mês
    const condDia = filtroDia === "Todos" || d.dia === Number(filtroDia); // Filtra por dia
    const condHora = filtroHora === "Todos" || d.hora === Number(filtroHora); // Filtra por hora
    return condAno && condMes && condDia && condHora; // Mantém apenas registros válidos
  });

  // Agrupa por funcionário
  const dadosCatracaAgrupados = Object.values(
    dadosCatracaFiltrados.reduce((acc, item) => {
      acc[item.user] = acc[item.user] || { // Inicializa agrupamento por usuário
        nome: item.user, // Nome do funcionário
        valor: 0, // Quantidade de detecções
        color: item.color, // Cor associada
      };
      acc[item.user].valor++; // Incrementa contagem
      return acc; // Retorna acumulador
    }, {})
  );

  // Escolhe dados do gráfico principal conforme tipo
  const dadosGrafico =
    tipoGrafico === "classe" ? agruparPorClasse() : agruparPorCamera();

  const getCor = (i) => Object.values(coresPorClasse)[i % 9]; // Cor por índice (para pizza)

  // Opções dinâmicas para filtros do gráfico de catraca
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

            <div className="bg-gray-900 text-white rounded-2xl shadow-md p-6 mx-auto w-full lg:w-2/3 mt-10">
              <h3 className="text-lg font-semibold mb-4 text-red-400 text-center">
                Funcionários Detectados sem EPI - Catraca Entrada
              </h3>

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

              {dadosCatracaAgrupados.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosCatracaAgrupados}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="nome" stroke="#fff" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#fff" />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", color: "#fff", borderRadius: "8px" }} />
                      <Legend />
                      <Bar dataKey="valor" fill="white" name="Detecções sem EPI">
                        {dadosCatracaAgrupados.map((obj, i) => {
                          const gerarCor = (str) => {
                            let hash = 0;
                            for (let j = 0; j < str.length; j++) {
                              hash = str.charCodeAt(j) + ((hash << 5) - hash);
                            }
                            const h = hash % 360;
                            return `hsl(${h}, 70%, 55%)`;
                          };
                          const corFinal = gerarCor(obj.nome);
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
