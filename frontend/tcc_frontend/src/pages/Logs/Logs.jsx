import React, { useEffect, useState } from "react"

export const Logs = () => {
  const [logs, setLogs] = useState([])
  const API = "http://localhost:3001/api"
  const token = localStorage.getItem("access_token")

  useEffect(() => {
    fetch(`${API}/logs`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(setLogs)
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Logs do Sistema</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">Usuário</th>
              <th className="border px-4 py-2">Operação</th>
              <th className="border px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td className="border px-4 py-1">{log.id}</td>
                <td className="border px-4 py-1">{log.user_id}</td>
                <td className="border px-4 py-1">{log.operacao}</td>
                <td className="border px-4 py-1">{log.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
