import React, { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import Header from "../../components/Header";

export const Dashboard = () => {
  const [mesSelecionado, setMesSelecionado] = useState("Janeiro");

  const dadosMensais = [
    { mes: "Janeiro", vendas: 4000, lucro: 2400, gastos: 1200 },
    { mes: "Fevereiro", vendas: 3000, lucro: 1398, gastos: 900 },
    { mes: "Março", vendas: 2000, lucro: 980, gastos: 800 },
    { mes: "Abril", vendas: 2780, lucro: 3908, gastos: 700 },
    { mes: "Maio", vendas: 1890, lucro: 4800, gastos: 500 },
    { mes: "Junho", vendas: 2390, lucro: 3800, gastos: 600 },
    { mes: "Julho", vendas: 3490, lucro: 4300, gastos: 800 },
  ];

  const dadosPizza = [
    { nome: "Marketing", valor: 400 },
    { nome: "Infraestrutura", valor: 300 },
    { nome: "RH", valor: 300 },
    { nome: "Pesquisa", valor: 200 },
  ];

  const cores = ["#3b82f6", "#10b981", "#facc15", "#ef4444"];
  const dadosSelecionados = dadosMensais.find(d => d.mes === mesSelecionado);

  return (
    <><Header></Header><div className="min-h-screen bg-gray-200 text-white p-6 flex flex-col gap-8">
          <h1 className="text-3xl font-bold text-center text-cyan-400">Painel de Controle</h1>

          <div className="flex justify-center">
              <select
                  className="bg-gray-800 text-white border border-cyan-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
              >
                  {dadosMensais.map((d) => (
                      <option key={d.mes} value={d.mes}>{d.mes}</option>
                  ))}
              </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-2xl shadow-md p-4">
                  <h3 className="text-lg font-semibold mb-2 text-cyan-500">Vendas e Lucro por Mês</h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dadosMensais}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="mes" stroke="#9ca3af" />
                              <YAxis stroke="#9ca3af" />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="vendas" stroke="#3b82f6" strokeWidth={3} />
                              <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={3} />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <div className="bg-gray-800 rounded-2xl shadow-md p-4">
                  <h3 className="text-lg font-semibold mb-2 text-cyan-500">Comparativo de Lucro e Gastos</h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dadosMensais}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="mes" stroke="#9ca3af" />
                              <YAxis stroke="#9ca3af" />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="lucro" fill="#10b981" radius={[5, 5, 0, 0]} />
                              <Bar dataKey="gastos" fill="#ef4444" radius={[5, 5, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <div className="bg-gray-800 rounded-2xl shadow-md p-4">
                  <h3 className="text-lg font-semibold mb-2 text-cyan-500">Distribuição de Investimentos</h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={dadosPizza}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={100}
                                  dataKey="valor"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                  {dadosPizza.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
                                  ))}
                              </Pie>
                              <Tooltip />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {dadosSelecionados && (
              <div className="bg-gray-200 rounded-2xl p-6 text-center">
                  <h2 className="text-2xl font-bold text-cyan-400 mb-4">Resumo de {dadosSelecionados.mes}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-700 p-4 rounded-xl shadow">
                          <p className="text-gray-400">Vendas</p>
                          <p className="text-2xl font-bold text-blue-400">R$ {dadosSelecionados.vendas}</p>
                      </div>
                      <div className="bg-gray-700 p-4 rounded-xl shadow">
                          <p className="text-gray-400">Lucro</p>
                          <p className="text-2xl font-bold text-green-400">R$ {dadosSelecionados.lucro}</p>
                      </div>
                      <div className="bg-gray-700 p-4 rounded-xl shadow">
                          <p className="text-gray-400">Gastos</p>
                          <p className="text-2xl font-bold text-red-400">R$ {dadosSelecionados.gastos}</p>
                      </div>
                  </div>
              </div>
          )}
      </div></>
  );
};
