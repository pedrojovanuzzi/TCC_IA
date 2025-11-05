import React, { useEffect, useState } from "react"; // importa React e hooks para efeitos e estado
import { // importa componentes de gráficos do Recharts
  BarChart, // componente para gráfico de barras
  Bar, // série de barras dentro do BarChart
  XAxis, // eixo X
  YAxis, // eixo Y
  CartesianGrid, // grade do gráfico
  Tooltip, // tooltip ao passar o mouse
  Legend, // legenda do gráfico
  ResponsiveContainer, // container responsivo que ajusta o gráfico ao tamanho disponível
  Cell, // célula individual (barra/fatia) para customizar cor
  PieChart, // componente para gráfico de pizza
  Pie, // série de pizza dentro do PieChart
} from "recharts"; // origem dos componentes de gráficos
import axios from "axios"; // cliente HTTP para chamadas à API
import Header from "../../components/Header"; // cabeçalho da aplicação
import getHostName from "../../../utils/getUrl"; // utilitário para obter a URL base da API

export const Dashboard = () => { // componente principal do painel
  const [dados, setDados] = useState([]); // estado com a lista de detecções vindas da API
  const [loading, setLoading] = useState(true); // estado de carregamento enquanto busca dados
  const [mesSelecionado, setMesSelecionado] = useState("Todos"); // filtro de mês para o gráfico principal
  const [tipoGrafico, setTipoGrafico] = useState("classe"); // seleção de tipo do gráfico principal (classe/camera)
  const [filtroAno, setFiltroAno] = useState("Todos"); // filtro por ano para o gráfico de catraca
  const [filtroMes, setFiltroMes] = useState("Todos"); // filtro por mês para o gráfico de catraca
  const [filtroDia, setFiltroDia] = useState("Todos"); // filtro por dia para o gráfico de catraca
  const [filtroHora, setFiltroHora] = useState("Todos"); // filtro por hora para o gráfico de catraca

  const API_URL = getHostName(); // resolve a URL base da API
  const token = localStorage.getItem("access_token") || ""; // recupera o token JWT salvo no navegador (ou string vazia)

  useEffect(() => { // efeito para buscar as detecções ao montar o componente
    buscarDeteccoes(); // chama a função de busca
  }, []); // executa apenas uma vez na montagem

  async function buscarDeteccoes() { // função assíncrona que requisita as detecções à API
    try { // tenta realizar a chamada HTTP
      const res = await axios.get(`${API_URL}/detections`, { // faz GET no endpoint de detecções
        headers: { Authorization: `Bearer ${token}` }, // envia o token no header Authorization
      }); // fim da requisição
      setDados(res.data); // atualiza o estado com os dados retornados
    } catch (err) { // em caso de erro na requisição
      console.error("Erro ao buscar detecções:", err); // loga o erro para depuração
    } finally { // sempre executa ao final, com sucesso ou erro
      setLoading(false); // desativa o indicador de carregamento
    } // fim do finally
  } // fim da função buscarDeteccoes

  const meses = [ // array com nomes dos meses para o seletor de filtro
    "Todos", // opção para não filtrar por mês
    "Janeiro", // mês 1
    "Fevereiro", // mês 2
    "Março", // mês 3
    "Abril", // mês 4
    "Maio", // mês 5
    "Junho", // mês 6
    "Julho", // mês 7
    "Agosto", // mês 8
    "Setembro", // mês 9
    "Outubro", // mês 10
    "Novembro", // mês 11
    "Dezembro", // mês 12
  ]; // fim do array meses

  const CLASSES_SEGURO = ["helmet", "glove", "glasses", "belt", "boots"]; // classes consideradas seguras (com EPI)

  const coresPorClasse = { // mapeia classes para cores fixas (hex)
    glasses: "#800080", // roxo para óculos
    helmet: "#00FF00", // verde para capacete
    glove: "#00FFFF", // ciano para luva
    hands: "#FFFF00", // amarelo para mãos (exemplo)
    head: "#0000FF", // azul para cabeça (exemplo)
    belt: "#FFA500", // laranja para cinto
    no_glasses: "#FF00FF", // magenta para ausência de óculos
    no_belt: "#FF0000", // vermelho para ausência de cinto
    boots: "#0080FF", // azul claro para botas
  }; // fim do objeto de cores

  const getCorClasse = (nome, index) => { // retorna a cor da classe ou uma cor fallback baseada no índice
    const cores = Object.values(coresPorClasse); // obtém lista de cores definidas
    return coresPorClasse[nome] || cores[index % cores.length]; // retorna cor específica ou uma cíclica
  }; // fim da função getCorClasse

  // 🔹 Filtro por mês (gráfico principal)
  const dadosFiltrados = // aplica filtro por mês selecionado para os dados base
    mesSelecionado === "Todos" // se a opção for "Todos", não filtra
      ? dados // mantém todos os dados
      : dados.filter((item) => { // filtra pela igualdade do nome do mês
          const data = new Date(item.created_at); // cria objeto Date a partir da data da detecção
          const mes = data.toLocaleString("pt-BR", { month: "long" }); // obtém o nome do mês por extenso
          return mes.toLowerCase() === mesSelecionado.toLowerCase(); // compara ignorando maiúsculas/minúsculas
        }); // fim do filtro

  // 🔹 Agrupa por classe
  const agruparPorClasse = () => // função que agrega contagem por nome de classe
    Object.values( // converte objeto acumulador em array de valores
      dadosFiltrados.reduce((acc, item) => { // reduz a lista agrupando por class_name
        acc[item.class_name] = acc[item.class_name] || { // inicia o acumulador para a classe se não existir
          nome: item.class_name, // chave 'nome' para o gráfico
          valor: 0, // contador inicial
        }; // fim da criação do bucket
        acc[item.class_name].valor++; // incrementa a contagem da classe
        return acc; // retorna o acumulador para a próxima iteração
      }, {}) // acumulador inicial vazio
    ); // fim do Object.values

  // 🔹 Agrupa por câmera
  const agruparPorCamera = () => // função que agrega contagem por nome da câmera
    Object.values( // transforma o acumulador em array
      dadosFiltrados.reduce((acc, item) => { // faz redução agrupando por camera_name
        acc[item.camera_name] = acc[item.camera_name] || { // inicia bucket para a câmera se não existir
          nome: item.camera_name, // nome exibido no gráfico
          valor: 0, // contagem inicial
        }; // fim do bucket
        acc[item.camera_name].valor++; // incrementa contagem da câmera
        return acc; // retorna acumulador
      }, {}) // acumulador inicial vazio
    ); // fim do Object.values

  // 🔹 Dados da catraca (riscos)
  const dadosCatraca = dados // deriva lista de registros da catraca com classes perigosas
    .filter( // filtra apenas eventos da câmera de entrada da catraca e classes não seguras
      (d) =>
        d.camera_name?.toLowerCase().includes("catraca_entrada") && // mantém apenas camera_name contendo 'catraca_entrada'
        !CLASSES_SEGURO.includes(d.class_name) // exclui classes seguras (deixa somente riscos)
    )
    .map((d) => { // transforma cada item em um objeto normalizado para o gráfico
      const data = new Date(d.created_at); // instancia Date do timestamp
      return { // retorna o objeto com campos utilizados nos filtros e gráfico
        user: d.employee_name || d.name || `Usuário ${d.user_id || "?"}`, // nome do funcionário (fallbacks)
        ano: data.getFullYear(), // ano do evento
        mes: data.getMonth() + 1, // mês (1-12)
        dia: data.getDate(), // dia do mês
        hora: data.getHours(), // hora do dia (0-23)
        class_name: d.class_name, // nome da classe detectada
        color: coresPorClasse[d.class_name] || "#FF0000", // cor associada à classe (ou vermelho padrão)
      }; // fim do objeto mapeado
    }); // fim do map

  // 🔹 Filtros de data aplicados no gráfico da catraca
  const dadosCatracaFiltrados = dadosCatraca.filter((d) => { // aplica filtros de ano/mês/dia/hora
    const condAno = filtroAno === "Todos" || d.ano === Number(filtroAno); // aceita todos ou igual ao filtro de ano
    const condMes = filtroMes === "Todos" || d.mes === Number(filtroMes); // aceita todos ou igual ao filtro de mês
    const condDia = filtroDia === "Todos" || d.dia === Number(filtroDia); // aceita todos ou igual ao filtro de dia
    const condHora = filtroHora === "Todos" || d.hora === Number(filtroHora); // aceita todos ou igual ao filtro de hora
    return condAno && condMes && condDia && condHora; // mantém somente se todas as condições forem verdadeiras
  }); // fim do filter

  // 🔹 Agrupa por funcionário
  const dadosCatracaAgrupados = Object.values( // converte acumulador em array
    dadosCatracaFiltrados.reduce((acc, item) => { // reduz agrupando por usuário
      acc[item.user] = acc[item.user] || { // inicia bucket do usuário se não existir
        nome: item.user, // nome (rótulo) do funcionário
        valor: 0, // contador inicial
        color: item.color, // cor preferencial associada (não usada diretamente abaixo)
      }; // fim do bucket
      acc[item.user].valor++; // incrementa a quantidade de ocorrências para o usuário
      return acc; // retorna acumulador
    }, {}) // acumulador inicial vazio
  ); // fim do Object.values

  // 🔹 Escolhe gráfico principal
  const dadosGrafico = // dados alimentados no gráfico principal (classe/câmera)
    tipoGrafico === "classe" ? agruparPorClasse() : agruparPorCamera(); // decide agrupamento com base na seleção

  const getCor = (i) => Object.values(coresPorClasse)[i % 9]; // função que cicla cores por índice (fallback para pizza)

  // 🔹 Gerar opções dinâmicas de filtros
  const anos = ["Todos", ...new Set(dadosCatraca.map((d) => d.ano))]; // lista de anos distintos com 'Todos' no início
  const mesesFiltro = ["Todos", ...new Set(dadosCatraca.map((d) => d.mes))]; // lista de meses distintos com 'Todos'
  const dias = ["Todos", ...new Set(dadosCatraca.map((d) => d.dia))]; // lista de dias distintos com 'Todos'
  const horas = ["Todos", ...new Set(dadosCatraca.map((d) => d.hora))]; // lista de horas distintas com 'Todos'

  return ( // inicia o retorno JSX do componente
    <> // fragmento React sem nó extra
      <Header /> // componente de cabeçalho no topo
      <div className="min-h-screen bg-gray-200 text-gray-900 p-6 flex flex-col gap-8"> // container principal com estilos Tailwind
        <h1 className="text-3xl font-bold text-center text-cyan-600"> // título do painel
          Painel de Detecções YOLO // texto exibido no título
        </h1> // fim do h1

        {/* 🔽 Filtros principais */} // comentário JSX descritivo de seção
        <div className="flex flex-wrap justify-center gap-4 mb-6"> // área de filtros (mês e tipo de gráfico)
          <select // seletor de mês para o gráfico principal
            className="bg-gray-800 text-white border border-cyan-500 rounded-lg px-4 py-2" // estilos do select
            value={mesSelecionado} // valor controlado do select
            onChange={(e) => setMesSelecionado(e.target.value)} // atualiza estado ao mudar
          > // abre lista de opções
            {meses.map((mes) => ( // cria <option> para cada mês
              <option key={mes}>{mes}</option> // opção exibindo o nome do mês
            ))} // fim do map
          </select> // fim do select de meses

          <select // seletor do tipo de gráfico (classe/câmera)
            className="bg-gray-800 text-white border border-green-500 rounded-lg px-4 py-2" // estilos do select
            value={tipoGrafico} // valor atual do tipo de gráfico
            onChange={(e) => setTipoGrafico(e.target.value)} // atualiza tipo de gráfico quando muda
          > // abre lista de opções
            <option value="classe">Por Classe Detectada</option> // opção para agrupar por classe
            <option value="camera">Por Câmera</option> // opção para agrupar por câmera
          </select> // fim do select de tipo
        </div> // fim da barra de filtros principais

        {loading ? ( // condicional: se ainda carregando, mostra mensagem de loading
          <p className="text-center text-gray-600">Carregando dados...</p> // feedback de carregamento
        ) : ( // senão, renderiza os gráficos
          <> // fragmento para agrupar seções
            {/* 🧩 Gráfico principal */} // comentário da seção do gráfico principal
            <div className="bg-gray-800 text-white rounded-2xl shadow-md p-6 mx-auto w-full lg:w-2/3"> // card do gráfico principal
              <h3 className="text-lg font-semibold mb-4 text-cyan-400 text-center"> // subtítulo do gráfico principal
                {tipoGrafico === "classe" // condicional de texto do subtítulo
                  ? "Detecções por Classe" // rótulo quando agrupa por classe
                  : "Detecções por Câmera"} // rótulo quando agrupa por câmera
              </h3> // fim do subtítulo
              <div className="h-80"> // define altura fixa do container do gráfico
                <ResponsiveContainer width="100%" height="100%"> // torna o gráfico responsivo
                  {tipoGrafico === "camera" ? ( // se o tipo for 'camera', usa pizza
                    <PieChart> // inicia gráfico de pizza
                      <Pie // série de pizza
                        data={dadosGrafico} // dados agregados (por câmera)
                        dataKey="valor" // campo de valor
                        nameKey="nome" // campo de rótulo
                        outerRadius={130} // raio externo da pizza
                        label // exibe labels nas fatias
                      > // abertura da série
                        {dadosGrafico.map((entry, index) => ( // mapeia dados para gerar células coloridas
                          <Cell key={index} fill={getCor(index)} /> // define a cor da fatia pelo índice
                        ))} // fim do map
                      </Pie> // fim da série de pizza
                      <Tooltip contentStyle={{ backgroundColor: "#eef1f5" }} /> // tooltip com fundo claro
                      <Legend /> // legenda do gráfico de pizza
                    </PieChart> // fim do PieChart
                  ) : ( // caso contrário, usa gráfico de barras
                    <BarChart // componente do gráfico de barras
                      data={dadosGrafico} // dados agregados (por classe)
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }} // margens internas do gráfico
                    > // abertura do BarChart
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" /> // grade do gráfico com tracejado
                      <XAxis dataKey="nome" stroke="#fff" /> // eixo X mostrando o 'nome'
                      <YAxis stroke="#fff" /> // eixo Y com linhas e cor branca
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937" }} /> // tooltip com fundo escuro
                      <Legend /> // legenda do gráfico de barras
                      <Bar dataKey="valor" fill="white" name="Quantidade"> // série de barras (quantidade por categoria)
                        {dadosGrafico.map((obj, i) => ( // mapeia cada barra para aplicar cor específica
                          <Cell key={i} fill={getCorClasse(obj.nome, i)} /> // define cor da barra pela classe/índice
                        ))} // fim do map
                      </Bar> // fim da série de barras
                    </BarChart> // fim do BarChart
                  )} // fim da condicional de tipo de gráfico
                </ResponsiveContainer> // fecha container responsivo
              </div> // fim do container de altura do gráfico
            </div> // fim do card do gráfico principal

            {/* 📆 Gráfico de Catraca */} // comentário da seção de catraca
            <div className="bg-gray-900 text-white rounded-2xl shadow-md p-6 mx-auto w-full lg:w-2/3 mt-10"> // card do gráfico de catraca
              <h3 className="text-lg font-semibold mb-4 text-red-400 text-center"> // subtítulo do gráfico de catraca
                Funcionários Detectados sem EPI - Catraca Entrada // texto do subtítulo
              </h3> // fim do subtítulo

              {/* 🔹 Filtros de data */} // comentário da área de filtros de data
              <div className="flex flex-wrap justify-center gap-3 mb-4"> // container dos filtros de ano/mês/dia/hora
                <select // seletor de ano
                  className="bg-gray-800 px-3 py-2 rounded" // estilos do select
                  value={filtroAno} // valor atual do filtro
                  onChange={(e) => setFiltroAno(e.target.value)} // atualiza estado ao mudar
                > // abre opções
                  {anos.map((ano) => ( // gera opção por ano distinto
                    <option key={ano}>{ano}</option> // exibe o ano (ou 'Todos')
                  ))} // fim do map de anos
                </select> // fim do select de ano
                <select // seletor de mês
                  className="bg-gray-800 px-3 py-2 rounded" // estilos do select
                  value={filtroMes} // valor de filtro de mês
                  onChange={(e) => setFiltroMes(e.target.value)} // atualiza filtro
                > // abre opções
                  {mesesFiltro.map((m) => ( // gera opções por mês presente nos dados
                    <option key={m}>{m}</option> // exibe o mês (ou 'Todos')
                  ))} // fim do map de meses
                </select> // fim do select de mês
                <select // seletor de dia
                  className="bg-gray-800 px-3 py-2 rounded" // estilos do select
                  value={filtroDia} // valor de filtro de dia
                  onChange={(e) => setFiltroDia(e.target.value)} // atualiza filtro
                > // abre opções
                  {dias.map((d) => ( // gera opções por dia presente nos dados
                    <option key={d}>{d}</option> // exibe dia (ou 'Todos')
                  ))} // fim do map de dias
                </select> // fim do select de dia
                <select // seletor de hora
                  className="bg-gray-800 px-3 py-2 rounded" // estilos do select
                  value={filtroHora} // valor do filtro de hora
                  onChange={(e) => setFiltroHora(e.target.value)} // atualiza filtro
                > // abre opções
                  {horas.map((h) => ( // gera opções por hora presente nos dados
                    <option key={h}>{h}</option> // exibe hora (ou 'Todos')
                  ))} // fim do map de horas
                </select> // fim do select de hora
              </div> // fim da barra de filtros de data

              {/* 🔹 Gráfico de barras por funcionário */} // comentário da área do gráfico por funcionário
              {dadosCatracaAgrupados.length > 0 ? ( // se houver dados após filtros, exibe o gráfico
                <div className="h-96"> // define uma altura para o gráfico
                  {/* Container responsivo do gráfico */} // comentário JSX descritivo
                  <ResponsiveContainer width="100%" height="100%"> // permite o gráfico ocupar todo o container
                    <BarChart // inicia o gráfico de barras por funcionário
                      data={dadosCatracaAgrupados} // Dados de entrada do gráfico
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }} // Margens
                    > // abertura do BarChart
                      {/* Grade de fundo */} // comentário JSX
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" /> // grade com traços
                      {/* Eixo X com os nomes dos funcionários */} // comentário JSX
                      <XAxis // eixo X
                        dataKey="nome" // campo que identifica cada barra (nome)
                        stroke="#fff" // cor do texto/linhas do eixo
                        tick={{ fontSize: 10 }} // tamanho da fonte dos ticks
                      /> // fim do XAxis
                      {/* Eixo Y com a contagem de detecções */} // comentário JSX
                      <YAxis stroke="#fff" /> // eixo Y com cor branca
                      {/* Tooltip (caixa de informação ao passar o mouse) */} // comentário JSX
                      <Tooltip // componente tooltip
                        contentStyle={{ // estilos do conteúdo do tooltip
                          backgroundColor: "#1f2937", // fundo escuro
                          color: "#fff", // texto branco
                          borderRadius: "8px", // cantos arredondados
                        }} // fim do objeto de estilo
                      /> // fim do Tooltip
                      {/* Legenda superior */} // comentário JSX
                      <Legend /> // legenda padrão do Recharts
                      {/* 🔹 Barras de detecção com cor gerada automaticamente */} // comentário da série de barras
                      <Bar // série de barras
                        dataKey="valor" // campo numérico a ser plotado
                        fill="white" // cor padrão (sobrescrita célula a célula)
                        name="Detecções sem EPI" // rótulo da série
                      > // abertura da série
                        {dadosCatracaAgrupados.map((obj, i) => { // para cada barra, define uma cor calculada
                          // 🔸 Função que gera uma cor única com base no nome (hash simples)
                          const gerarCor = (str) => { // converte string em um hue usando hash
                            let hash = 0; // valor inicial do hash
                            for (let j = 0; j < str.length; j++) { // percorre caracteres
                              hash = str.charCodeAt(j) + ((hash << 5) - hash); // atualização do hash (variação do DJB2)
                            } // fim do loop
                            // Converte hash em cor HSL (hue 0-360)
                            const h = hash % 360; // limita o hue ao intervalo 0-359
                            return `hsl(${h}, 70%, 55%)`; // Saturação e brilho fixos → cores vibrantes e equilibradas
                          }; // fim da função gerarCor

                          // 🔹 Usa a cor específica da classe, se existir; senão gera baseada no nome do usuário
                          const corFinal = gerarCor(obj.nome); // calcula a cor final baseada no nome do funcionário

                          // Cria a célula (barra) com a cor correspondente
                          return <Cell key={i} fill={corFinal} />; // retorna a célula com a cor definida
                        })} // fim do map para células
                      </Bar> // fim da série de barras
                    </BarChart> // fim do gráfico de barras
                  </ResponsiveContainer> // fecha o container responsivo
                </div> // fim do wrapper de altura do gráfico
              ) : ( // caso não haja dados filtrados
                <p className="text-center text-gray-400"> // mensagem informando ausência de resultados
                  Nenhum funcionário detectado sem EPI na catraca. // texto exibido
                </p> // fim do parágrafo
              )} // fim da condicional do gráfico por funcionário
            </div> // fim do card do gráfico de catraca
          </> // fim do fragmento que contém os dois gráficos
        )} // fim do ternário de loading
      </div> // fim do container principal da página
    </> // fim do fragmento raiz
  ); // fim do retorno JSX
}; // fim e export do componente Dashboard
