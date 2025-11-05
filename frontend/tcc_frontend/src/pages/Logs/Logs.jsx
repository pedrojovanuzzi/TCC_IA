import React, { useEffect, useState } from "react"; // React e hooks para estado/efeito
import getHostName from "../../../utils/getUrl"; // Função utilitária para URL base da API
import Header from "../../components/Header"; // Componente de cabeçalho

export const Logs = () => { // Página que lista logs do sistema
  const [logs, setLogs] = useState([]); // Estado com a lista de logs
  const API_URL = getHostName(); // URL base da API
  const token = localStorage.getItem("access_token"); // Token JWT

  useEffect(() => { // Busca logs ao montar a página
    fetch(`${API_URL}/logs`, {
      headers: {
        Authorization: `Bearer ${token}`, // Autenticação via Bearer token
      },
    })
      .then((r) => r.json()) // Converte resposta em JSON
      .then(setLogs); // Atualiza estado com os logs recebidos
  }, []); // Executa uma vez na montagem

  return (
    <>
      <Header></Header> {/* Cabeçalho padrão da aplicação */}
      <div className="p-4"> {/* Container com padding */}
        <h1 className="text-xl font-semibold mb-4">Logs do Sistema</h1> {/* Título da página */}
        <div className="overflow-x-auto"> {/* Habilita scroll horizontal em telas pequenas */}
          <table className="min-w-full bg-white border"> {/* Tabela básica */}
            <thead>
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">Usuário</th>
                <th className="border px-4 py-2">Operação</th>
                <th className="border px-4 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}> {/* Linha por registro */}
                  <td className="border px-4 py-1">{log.id}</td> {/* ID do log */}
                  <td className="border px-4 py-1">{log.user_id}</td> {/* ID/username do usuário */}
                  <td className="border px-4 py-1">{log.operacao}</td> {/* Operação registrada */}
                  <td className="border px-4 py-1">{log.date}</td> {/* Data/hora do evento */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

