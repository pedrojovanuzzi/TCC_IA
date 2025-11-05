import React, { useEffect, useState } from "react" // importa React e os hooks useEffect/useState para efeitos colaterais e estado
import getHostName from "../../../utils/getUrl"; // importa função utilitária que retorna a URL base da API
import Header from "../../components/Header"; // importa o componente de cabeçalho para exibir no topo da página

export const Logs = () => { // declara e exporta o componente funcional Logs
  const [logs, setLogs] = useState([]) // cria estado 'logs' para armazenar a lista de logs retornados da API
    const API_URL = getHostName(); // resolve a URL base do backend (ex.: http://localhost:3001/api)
  const token = localStorage.getItem("access_token") // obtém o token JWT salvo no navegador (se existir)

  useEffect(() => { // executa ao montar o componente para buscar os logs
    fetch(`${API_URL}/logs`, { // faz chamada HTTP GET ao endpoint /logs
      headers: { // define cabeçalhos HTTP da requisição
        "Authorization": `Bearer ${token}` // envia o token no cabeçalho Authorization para autenticação
      } // fim dos cabeçalhos
    }) // fim do fetch com URL e opções
      .then(r => r.json()) // converte a resposta para JSON
      .then(setLogs) // atualiza o estado 'logs' com os dados recebidos
  }, []) // dependências vazias: executa apenas uma vez ao montar

  return ( // retorna a árvore JSX a ser renderizada
    <><Header></Header><div className="p-4"> // inclui o cabeçalho e um container com padding
      <h1 className="text-xl font-semibold mb-4">Logs do Sistema</h1> // título da página de logs
      <div className="overflow-x-auto"> // wrapper que permite rolagem horizontal na tabela em telas pequenas
        <table className="min-w-full bg-white border"> // tabela com largura mínima total, fundo branco e borda
          <thead> // cabeçalho da tabela
            <tr> // linha do cabeçalho
              <th className="border px-4 py-2">ID</th> // coluna de ID com padding e borda
              <th className="border px-4 py-2">Usuário</th> // coluna de usuário (id do usuário)
              <th className="border px-4 py-2">Operação</th> // coluna com a descrição da operação registrada
              <th className="border px-4 py-2">Data</th> // coluna com a data/hora do registro
            </tr> // fim da linha do cabeçalho
          </thead> // fim do cabeçalho
          <tbody> // corpo da tabela com os registros
            {logs.map(log => ( // itera sobre a lista de logs e cria uma linha por item
              <tr key={log.id}> // linha do corpo com chave única baseada no id do log
                <td className="border px-4 py-1">{log.id}</td> // célula exibindo o ID do log
                <td className="border px-4 py-1">{log.user_id}</td> // célula exibindo o ID do usuário que realizou a operação
                <td className="border px-4 py-1">{log.operacao}</td> // célula exibindo a descrição da operação
                <td className="border px-4 py-1">{log.date}</td> // célula exibindo a data/hora do registro
              </tr> // fim da linha do log
            ))} // fim do map de logs
          </tbody> // fim do corpo da tabela
        </table> // fim da tabela
      </div> // fim do wrapper com rolagem horizontal
    </div></> // fecha o container principal e o fragmento com Header
  ) // fim do retorno JSX
} // fim do componente Logs
