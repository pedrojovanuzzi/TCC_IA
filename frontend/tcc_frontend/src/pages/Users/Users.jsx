import React, { useEffect, useState } from "react";

export const Users = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const carregarUsuarios = async () => {
    const res = await fetch("http://localhost:3001/api/users");
    const data = await res.json();
    setUsuarios(data);
  };

  const adicionarUsuario = async (e) => {
    e.preventDefault();
    if (!login || !password) return alert("Preencha todos os campos");


    const res = await fetch("http://localhost:3001/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    if (res.ok) {
        setLogin(""); // se estiver usando login, não username
        setPassword("");
        carregarUsuarios();
      } else {
        alert("Erro ao criar usuário");
      }      
  };

  const removerUsuario = async (id) => {
    const ok = confirm("Tem certeza que deseja excluir?");
    if (!ok) return;
    await fetch(`http://localhost:3001/api/users/${id}`, { method: "DELETE" });
    carregarUsuarios();
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Gerenciar Usuários</h2>

      <form onSubmit={adicionarUsuario} className="mb-6 space-y-4">
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
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 cursor-pointer"
        >
          Adicionar Usuário
        </button>
      </form>

      <ul className="space-y-2">
        {usuarios.map((user) => (
          <li key={user.id} className="flex justify-between items-center border-b pb-2">
            <span>{user.login}</span>
            <button
              onClick={() => removerUsuario(user.id)}
              className="text-sm text-red-600 hover:underline cursor-pointer"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
