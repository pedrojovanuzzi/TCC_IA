import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export const Users = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [nivel, setNivel] = useState(1);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState(null);
  const { username } = useAuth();

  // Lê o token do localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const carregarUsuarios = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/users", {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      console.error("Falha ao buscar usuários:", err);
      setError(err.message);
    }
  };

  const adicionarOuAtualizarUsuario = async (e) => {
    e.preventDefault();
    if (!login) return alert("Preencha o login");

    const payload = { login };
    if (password) payload.password = password;
    if (nivel) payload.nivel = Number(nivel);
    if (username) payload.username = username;

    const url = editandoId
      ? `http://localhost:3001/api/users/${editandoId}`
      : "http://localhost:3001/api/users";
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      resetarForm();
      carregarUsuarios();
    } catch {
      alert(`Erro ao ${editandoId ? "atualizar" : "criar"} usuário`);
    }
  };

  const resetarForm = () => {
    setLogin("");
    setPassword("");
    setNivel(1);
    setEditandoId(null);
  };

  const editarUsuario = (user) => {
    setLogin(user.login);
    setNivel(user.nivel);
    setEditandoId(user.id);
  };

  const removerUsuario = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      const res = await fetch(`http://localhost:3001/api/users/${id}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      carregarUsuarios();
    } catch {
      alert("Erro ao remover usuário");
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        {editandoId ? "Editar Usuário" : "Adicionar Usuário"}
      </h2>

      <form onSubmit={adicionarOuAtualizarUsuario} className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Login"
          className="w-full p-2 border rounded"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
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

      <ul className="space-y-2">
        {usuarios.map((user) => (
          <li
            key={user.id}
            className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-2"
          >
            <div>
              <span className="font-medium">{user.login}</span>{" "}
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
  );
};
