import React, { useState, useEffect } from "react"; // importa React e hooks de estado/efeitos
import axios from "axios"; // cliente HTTP para chamadas ao backend
import getHostName from "../../../utils/getUrl"; // utilitário que retorna a URL base da API
import Header from "../../components/Header"; // componente de cabeçalho

export const CronJob = () => { // componente de configuração do CronJob
  const [tempo, setTempo] = useState(""); // estado do texto de intervalo (ex.: "1D 2H 30M")
  const [ativo, setAtivo] = useState(false); // estado se o cron está ativo
  const [email, setEmail] = useState(""); // ✅ novo campo // estado do e-mail para notificação
  const [erro, setErro] = useState(""); // estado da mensagem de erro de validação
  const API_URL = getHostName(); // URL base da API (ex.: http://localhost:3001/api)
  const token = localStorage.getItem("access_token") || ""; // token JWT salvo no navegador (ou vazio)

  // Expressão regular que valida entradas como "10D 2H 30M 5S"
  const regex = /^(?:(\d+\s*D))?(?:\s*(\d+\s*H))?(?:\s*(\d+\s*M))?(?:\s*(\d+\s*S))?$/i; // regex para D/H/M/S opcionais

  const handleSubmit = async (e) => { // trata envio do formulário
    e.preventDefault(); // evita reload da página

    // ⚠️ Validação básica
    if (!regex.test(tempo.trim()) || tempo.trim() === "") { // valida formato do campo tempo
      setErro("Formato inválido. Exemplo: 1D 2H 30M ou 10M 5S."); // define mensagem de erro
      return; // aborta submit
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { // valida e-mail simples
      setErro("E-mail inválido."); // erro de e-mail
      return; // aborta submit
    }

    setErro(""); // limpa erros
    try { // tenta persistir configuração no backend
      await axios.post( // chamada POST para salvar cronjob
        `${API_URL}/cronjob`, // endpoint de configuração
        { time: tempo.trim(), active: ativo, email: email.trim() }, // payload JSON
        {
          headers: {
            "Content-Type": "application/json", // indica JSON
            Authorization: `Bearer ${token}`, // autenticação com JWT
          },
        }
      ); // fim POST
      alert("✅ Configuração salva com sucesso!"); // feedback positivo
    } catch (error) { // captura erros de rede/servidor
      console.error("Erro ao salvar configuração:", error); // log detalhado
      alert("❌ Erro ao salvar configuração!"); // feedback negativo
    }
  }; // fim handleSubmit

  const carregarConfig = async () => { // busca configuração atual no backend
    try { // tenta GET
      const response = await axios.get(`${API_URL}/cronjob`, { // requisita config
        headers: { Authorization: `Bearer ${token}` }, // inclui JWT
      }); // fim GET
      setTempo(response.data.time || ""); // preenche campo tempo
      setAtivo(response.data.active || false); // preenche checkbox ativo
      setEmail(response.data.email || ""); // ✅ preenche e-mail salvo // preenche campo e-mail
    } catch (error) { // erro na busca
      console.error("Erro ao buscar configuração:", error); // log de erro
    }
  }; // fim carregarConfig

  useEffect(() => { // executa ao montar e quando token mudar
    if (token) carregarConfig(); // só busca se houver token
  }, [token]); // dependência do token

  return ( // renderização do componente
    <>
      <Header /> {/* cabeçalho da aplicação */}
      <div className="flex justify-center mt-10"> {/* container centralizado com margem superior */}
        <div className="bg-white shadow-2xl rounded-2xl p-8 w-96"> {/* card com sombra e bordas arredondadas */}
          <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center"> {/* título do card */}
            Definir Tempo para Limpar Galeria {/* texto do título */}
          </h1>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}> {/* formulário vertical com espaçamento */}
            {/* CAMPO TEMPO */}
            <div className="flex flex-col"> {/* grupo do input de tempo */}
              <label className="text-gray-600 font-medium mb-1">Repetir a cada:</label> {/* rótulo do tempo */}
              <input
                placeholder="Ex: 30D, 2H 30M, 10M 5S" // exemplos de formato aceito
                type="text" // entrada textual
                value={tempo} // valor controlado
                onChange={(e) => { // atualiza estado a cada digitação
                  setTempo(e.target.value); // define novo tempo
                  if (regex.test(e.target.value.trim())) setErro(""); // limpa erro se válido
                }}
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${ // estilos base
                  erro ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500" // destaca erro em vermelho
                }`}
              />
            </div>

            {/* CAMPO EMAIL */}
            <div className="flex flex-col"> {/* grupo do input de e-mail */}
              <label className="text-gray-600 font-medium mb-1"> {/* rótulo do e-mail */}
                E-mail para notificações: {/* texto explicativo */}
              </label>
              <input
                type="email" // validação HTML nativa de e-mail
                placeholder="exemplo@dominio.com" // placeholder
                value={email} // valor controlado
                onChange={(e) => setEmail(e.target.value)} // atualiza e-mail
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" // estilos do input
              />
            </div>

            {/* CHECKBOX */}
            <div className="flex items-center justify-between"> {/* linha com label e checkbox */}
              <label className="text-gray-600 font-medium">Ativo:</label> {/* rótulo do checkbox */}
              <input
                type="checkbox" // tipo do input
                checked={ativo} // estado controlado
                onChange={(e) => setAtivo(e.target.checked)} // alterna ativo/inativo
                className="w-5 h-5 accent-blue-600 cursor-pointer" // estilo do checkbox
              />
            </div>

            {/* BOTÃO */}
            <button
              type="submit" // submit do formulário
              disabled={!!erro || tempo.trim() === ""} // desabilita se erro ou tempo vazio
              className={`${
                erro
                  ? "bg-gray-400 cursor-not-allowed" // estilos quando desabilitado
                  : "bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500" // gradiente ativo
              } text-white font-semibold py-2 rounded-lg shadow-md transition-all duration-300`} // estilos comuns
            >
              Salvar Configuração {/* texto do botão */}
            </button>

            {/* MENSAGEM DE ERRO */}
            {erro && <p className="text-sm text-red-600 mt-1 font-medium">{erro}</p>} {/* exibe erro se existir */}
          </form>
        </div>
      </div>
    </>
  ); // fim do return
}; // exporta o componente CronJob
