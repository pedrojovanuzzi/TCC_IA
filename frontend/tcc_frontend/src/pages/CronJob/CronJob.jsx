import React, { useState, useEffect } from "react"; // Importa React e hooks de estado/efeito
import axios from "axios"; // Cliente HTTP para chamadas à API
import getHostName from "../../../utils/getUrl"; // Função utilitária que retorna a URL base da API
import Header from "../../components/Header"; // Componente de cabeçalho

export const CronJob = () => { // Componente de página para configurar o cronjob
  const [tempo, setTempo] = useState(""); // Valor digitado para periodicidade (ex: "1D 2H 30M")
  const [ativo, setAtivo] = useState(false); // Flag que indica se o cronjob está ativo
  const [email, setEmail] = useState(""); // Campo de e-mail para notificações
  const [erro, setErro] = useState(""); // Mensagem de erro de validação (se houver)
  const API_URL = getHostName(); // URL base da API
  const token = localStorage.getItem("access_token") || ""; // Token JWT salvo localmente

  // Expressão regular que valida entradas como "10D 2H 30M 5S"
  const regex = /^(?:(\d+\s*D))?(?:\s*(\d+\s*H))?(?:\s*(\d+\s*M))?(?:\s*(\d+\s*S))?$/i; // Captura D/H/M/S opcionais

  const handleSubmit = async (e) => { // Handler do submit do formulário
    e.preventDefault(); // Evita recarregar a página

    // Validação básica do campo de tempo
    if (!regex.test(tempo.trim()) || tempo.trim() === "") { // Verifica formato do tempo
      setErro("Formato inválido. Exemplo: 1D 2H 30M ou 10M 5S."); // Define mensagem de erro
      return; // Interrompe envio
    }
    // Validação básica do e-mail
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { // Verifica padrão de e-mail simples
      setErro("E-mail inválido."); // Define erro para e-mail
      return; // Interrompe envio
    }

    setErro(""); // Limpa erros
    try { // Tenta enviar configurações à API
      await axios.post(
        `${API_URL}/cronjob`, // Endpoint da API
        { time: tempo.trim(), active: ativo, email: email.trim() }, // Payload JSON
        {
          headers: {
            "Content-Type": "application/json", // Envio em JSON
            Authorization: `Bearer ${token}`, // Autenticação via Bearer token
          },
        }
      );
      alert("Configuração salva com sucesso!"); // Feedback de sucesso
    } catch (error) { // Em caso de erro na requisição
      console.error("Erro ao salvar configuração:", error); // Loga erro no console
      alert("Erro ao salvar configuração!"); // Feedback de falha
    }
  };

  const carregarConfig = async () => { // Busca configuração atual do cronjob na API
    try {
      const response = await axios.get(`${API_URL}/cronjob`, { // Requisição GET ao endpoint
        headers: { Authorization: `Bearer ${token}` }, // Cabeçalho de autenticação
      });
      setTempo(response.data.time || ""); // Preenche estado 'tempo' com valor da API
      setAtivo(response.data.active || false); // Preenche estado 'ativo'
      setEmail(response.data.email || ""); // Preenche estado 'email' se existir
    } catch (error) {
      console.error("Erro ao buscar configuração:", error); // Loga erro na busca
    }
  };

  useEffect(() => { // Efeito para carregar configuração ao ter token
    if (token) carregarConfig(); // Se houver token, busca a configuração existente
  }, [token]); // Reexecuta caso o token mude

  return ( // Renderização do componente
    <>
      <Header /> {/* Cabeçalho da aplicação */}
      <div className="flex justify-center mt-10"> {/* Wrapper centralizado */}
        <div className="bg-white shadow-2xl rounded-2xl p-8 w-96"> {/* Card do formulário */}
          <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center"> {/* Título */}
            Definir Tempo para Limpar Galeria
          </h1>

          {/* Formulário de configuração do cronjob */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}> {/* Envia para handleSubmit */}
            {/* CAMPO TEMPO */}
            <div className="flex flex-col"> {/* Grupo do campo tempo */}
              <label className="text-gray-600 font-medium mb-1">Repetir a cada:</label> {/* Rótulo */}
              <input
                placeholder="Ex: 30D, 2H 30M, 10M 5S" // Placeholder com exemplos válidos
                type="text" // Campo de texto livre
                value={tempo} // Valor controlado pelo estado 'tempo'
                onChange={(e) => { // Atualiza 'tempo' a cada digitação
                  setTempo(e.target.value);
                  if (regex.test(e.target.value.trim())) setErro(""); // Limpa erro se voltar a ficar válido
                }}
                className={`border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                  erro ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                }`} // Estilização condicional conforme erro
              />
            </div>

            {/* CAMPO EMAIL */}
            <div className="flex flex-col"> {/* Grupo do campo e-mail */}
              <label className="text-gray-600 font-medium mb-1"> {/* Rótulo do e-mail */}
                E-mail para notificações:
              </label>
              <input
                type="email" // Usa validação nativa de e-mail do browser
                placeholder="exemplo@dominio.com" // Exemplo de formato
                value={email} // Valor controlado pelo estado 'email'
                onChange={(e) => setEmail(e.target.value)} // Atualiza estado de e-mail
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" // Estilos
              />
            </div>

            {/* CHECKBOX */}
            <div className="flex items-center justify-between"> {/* Linha com rótulo e checkbox */}
              <label className="text-gray-600 font-medium">Ativo:</label> {/* Rótulo do checkbox */}
              <input
                type="checkbox" // Tipo checkbox
                checked={ativo} // Valor controlado pelo estado 'ativo'
                onChange={(e) => setAtivo(e.target.checked)} // Atualiza 'ativo' ao clicar
                className="w-5 h-5 accent-blue-600 cursor-pointer" // Estilização do checkbox
              />
            </div>

            {/* BOTÃO */}
            <button
              type="submit" // Submete o formulário
              disabled={!!erro || tempo.trim() === ""} // Desabilita se houver erro ou sem tempo
              className={`${
                erro
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
              } text-white font-semibold py-2 rounded-lg shadow-md transition-all duration-300`} // Estilos
            >
              Salvar Configuração
            </button>

            {/* MENSAGEM DE ERRO */}
            {erro && <p className="text-sm text-red-600 mt-1 font-medium">{erro}</p>} {/* Exibe erro */}
          </form>
        </div>
      </div>
    </>
  );
};

