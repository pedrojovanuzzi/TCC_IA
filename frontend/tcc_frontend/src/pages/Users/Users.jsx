import React, { useEffect, useState } from "react";

export const Users = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [nivel, setNivel] = useState(1);
  const [editandoId, setEditandoId] = useState(null);

  const carregarUsuarios = async () => {
    const res = await fetch("http://localhost:3001/api/users");
    const data = await res.json();
    setUsuarios(data);
  };

  const adicionarOuAtualizarUsuario = async (e) => {
    e.preventDefault();
    if (!login || !password) return alert("Preencha todos os campos");

    const payload = { login, password, nivel: Number(nivel) };

    if (editandoId) {
      const res = await fetch(`http://localhost:3001/api/users/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetarForm();
        carregarUsuarios();
      } else {
        alert("Erro ao atualizar usuário");
      }
    } else {
      const res = await fetch("http://localhost:3001/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetarForm();
        carregarUsuarios();
      } else {
        alert("Erro ao criar usuário");
      }
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
    if (!confirm("Tem certeza que deseja excluir?")) return;
    await fetch(`http://localhost:3001/api/users/${id}`, { method: "DELETE" });
    carregarUsuarios();
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{editandoId ? "Editar Usuário" : "Adicionar Usuário"}</h2>

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
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 cursor-pointer"
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
          <li key={user.id} className="flex justify-between items-center border-b pb-2">
            <span>
              {user.login} — <span className="text-sm text-gray-500">Nível {user.nivel}</span>
            </span>
            <div className="space-x-2">
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
