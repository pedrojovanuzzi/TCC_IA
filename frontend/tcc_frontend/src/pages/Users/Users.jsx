// Importa bibliotecas e dependências
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export const Users = () => {
  // Estados para gerenciar dados do formulário e lista
  const [usuarios, setUsuarios] = useState([]);       // lista de usuários
  const [login, setLogin] = useState("");             // campo de login
  const [password, setPassword] = useState("");       // campo de senha
  const [name, setName] = useState("");               // ✅ novo campo: nome completo
  const [nivel, setNivel] = useState(1);              // nível de acesso
  const [editandoId, setEditandoId] = useState(null); // id em edição
  const [error, setError] = useState(null);           // erro da API

  const { username } = useAuth();
  const API_URL = getHostName();

  // Função para ler o token JWT armazenado
  const getAuthHeader = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 🔹 Carrega a lista de usuários do backend
  const carregarUsuarios = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error(`https ${res.status}`);
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      console.error("Falha ao buscar usuários:", err);
      setError(err.message);
    }
  };

  // 🔹 Cria ou atualiza usuário
  const adicionarOuAtualizarUsuario = async (e) => {
    e.preventDefault();
    if (!login) return alert("Preencha o login");

    // monta o corpo da requisição
    const payload = { login, name }; // ✅ inclui o nome
    if (password) payload.password = password;
    if (nivel) payload.nivel = Number(nivel);
    if (username) payload.username = username;

    const url = editandoId
      ? `${API_URL}/users/${editandoId}`
      : `${API_URL}/users`;
    const method = editandoId ? "PUT" : "POST";

    if (!editandoId && !password) {
      return alert("Senha é obrigatória ao criar um usuário");
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`https ${res.status}`);
      resetarForm();
      carregarUsuarios();
    } catch (err) {
      alert(`Erro ao ${editandoId ? "atualizar" : "criar"} usuário`);
      console.error(err);
    }
  };

  // 🔹 Reseta o formulário após salvar
  const resetarForm = () => {
    setLogin("");
    setPassword("");
    setName("");
    setNivel(1);
    setEditandoId(null);
  };

  // 🔹 Preenche o formulário ao clicar em editar
  const editarUsuario = (user) => {
    setLogin(user.login);
    setName(user.name || "");
    setNivel(user.nivel);
    setEditandoId(user.id);
  };

  // 🔹 Remove usuário
  const removerUsuario = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error(`https ${res.status}`);
      carregarUsuarios();
    } catch {
      alert("Erro ao remover usuário");
    }
  };

  // 🔹 Carrega usuários na montagem do componente
  useEffect(() => {
    carregarUsuarios();
  }, []);

  if (error) return <div>Erro: {error}</div>;

  return (
    <>
      <Header />
      <div className="p-10 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">
          {editandoId ? "Editar Usuário" : "Adicionar Usuário"}
        </h2>

        {/* 🔹 Formulário */}
        <form onSubmit={adicionarOuAtualizarUsuario} className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="Login"
            className="w-full p-2 border rounded"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nome Completo"
            className="w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="w-full p-2 border rounded"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
          >
            <option value={1}>Nível 1 - Restrito</option>
            <option value={2}>Nível 2 - Intermediário</option>
            <option value={3}>Nível 3 - Admin</option>
          </select>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500"
          >
            {editandoId ? "Atualizar Usuário" : "Adicionar Usuário"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={resetarForm}
              className="ml-2 text-sm text-gray-600 underline"
            >
              Cancelar edição
            </button>
          )}
        </form>

        {/* 🔹 Lista de usuários */}
        <ul className="space-y-2">
          {usuarios.map((user) => (
            <li
              key={user.id}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-2"
            >
              <div>
                <span className="font-semibold text-gray-800">#{user.id}</span>{" "}
                <span className="font-medium">{user.login}</span>{" "}
                <span className="text-gray-600">
                  ({user.name || "Sem nome"})
                </span>{" "}
                <span className="text-sm text-gray-500">
                  — Nível {user.nivel}
                </span>
              </div>
              <div className="mt-2 sm:mt-0 space-x-2">
                <button
                  onClick={() => editarUsuario(user)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => removerUsuario(user.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};
