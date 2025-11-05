// Importa bibliotecas e dependências
import React, { useEffect, useState } from "react"; // React e hooks
import { useAuth } from "../../context/AuthContext"; // Contexto de autenticação
import getHostName from "../../../utils/getUrl"; // URL base da API
import Header from "../../components/Header"; // Cabeçalho

export const Users = () => { // Componente para CRUD de usuários
  // Estados para gerenciar dados do formulário e lista
  const [usuarios, setUsuarios] = useState([]);       // lista de usuários
  const [login, setLogin] = useState("");             // campo de login
  const [password, setPassword] = useState("");       // campo de senha
  const [name, setName] = useState("");               // novo campo: nome completo
  const [nivel, setNivel] = useState(1);              // nível de acesso
  const [editandoId, setEditandoId] = useState(null); // id em edição
  const [error, setError] = useState(null);           // erro da API

  const { username } = useAuth(); // Usuário logado (para auditoria se necessário)
  const API_URL = getHostName(); // URL base da API

  // Função para ler o token JWT armazenado
  const getAuthHeader = () => {
    const token = localStorage.getItem("access_token"); // Recupera token
    return token ? { Authorization: `Bearer ${token}` } : {}; // Cabeçalho de auth
  };

  // Carrega a lista de usuários do backend
  const carregarUsuarios = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, { // GET /users
        headers: {
          "Content-Type": "application/json", // Tipo JSON
          ...getAuthHeader(), // Inclui Authorization se houver
        },
      });
      if (!res.ok) throw new Error(`https ${res.status}`); // Trata HTTP != 2xx
      const data = await res.json(); // Converte resposta
      setUsuarios(data); // Atualiza lista
    } catch (err) {
      console.error("Falha ao buscar usuários:", err);
      setError(err.message); // Guarda mensagem de erro
    }
  };

  // Cria ou atualiza usuário
  const adicionarOuAtualizarUsuario = async (e) => {
    e.preventDefault(); // Evita reload da página
    if (!login) return alert("Preencha o login"); // Validação simples

    // Monta o corpo da requisição
    const payload = { login, name }; // Inclui o nome
    if (password) payload.password = password; // Inclui senha se informada
    if (nivel) payload.nivel = Number(nivel); // Converte nível para número
    if (username) payload.username = username; // Pode enviar usuário executor

    const url = editandoId
      ? `${API_URL}/users/${editandoId}` // Atualiza
      : `${API_URL}/users`; // Cria
    const method = editandoId ? "PUT" : "POST"; // Verbo conforme modo

    if (!editandoId && !password) {
      return alert("Senha é obrigatória ao criar um usuário");
    }

    try {
      const res = await fetch(url, { // Chamada ao backend
        method, // PUT/POST
        headers: {
          "Content-Type": "application/json", // JSON
          ...getAuthHeader(), // Auth
        },
        body: JSON.stringify(payload), // Corpo com dados
      });
      if (!res.ok) throw new Error(`https ${res.status}`); // Trata erro HTTP
      resetarForm(); // Limpa formulário
      carregarUsuarios(); // Recarrega lista
    } catch (err) {
      alert(`Erro ao ${editandoId ? "atualizar" : "criar"} usuário`);
      console.error(err); // Log
    }
  };

  // Reseta o formulário após salvar
  const resetarForm = () => {
    setLogin(""); // Limpa login
    setPassword(""); // Limpa senha
    setName(""); // Limpa nome
    setNivel(1); // Restaura nível padrão
    setEditandoId(null); // Sai do modo edição
  };

  // Preenche o formulário ao clicar em editar
  const editarUsuario = (user) => {
    setLogin(user.login); // Preenche login
    setName(user.name || ""); // Preenche nome
    setNivel(user.nivel); // Preenche nível
    setEditandoId(user.id); // Marca ID em edição
  };

  // Remove usuário
  const removerUsuario = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return; // Confirmação
    try {
      const res = await fetch(`${API_URL}/users/${id}`, { // DELETE /users/:id
        method: "DELETE",
        headers: {
          ...getAuthHeader(), // Auth
        },
      });
      if (!res.ok) throw new Error(`https ${res.status}`); // Trata HTTP != 2xx
      carregarUsuarios(); // Atualiza lista
    } catch {
      alert("Erro ao remover usuário"); // Alerta de erro
    }
  };

  // Carrega usuários na montagem do componente
  useEffect(() => {
    carregarUsuarios(); // Busca lista
  }, []); // Apenas uma vez

  if (error) return <div>Erro: {error}</div>; // Exibe erro simples

  return (
    <>
      <Header /> {/* Cabeçalho */}
      <div className="p-10 max-w-xl mx-auto"> {/* Container centralizado */}
        <h2 className="text-2xl font-bold mb-4"> {/* Título */}
          {editandoId ? "Editar Usuário" : "Adicionar Usuário"}
        </h2>

        {/* Formulário */}
        <form onSubmit={adicionarOuAtualizarUsuario} className="mb-6 space-y-4"> {/* Envia para handler */}
          <input
            type="text" // Campo de texto
            placeholder="Login" // Placeholder
            className="w-full p-2 border rounded" // Estilo
            value={login} // Valor controlado
            onChange={(e) => setLogin(e.target.value)} // Atualiza estado
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
            type="submit" // Submete o formulário
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500"
          >
            {editandoId ? "Atualizar Usuário" : "Adicionar Usuário"}
          </button>
          {editandoId && (
            <button
              type="button" // Evita submit
              onClick={resetarForm} // Limpa e sai do modo edição
              className="ml-2 text-sm text-gray-600 underline"
            >
              Cancelar edição
            </button>
          )}
        </form>

        {/* Lista de usuários */}
        <ul className="space-y-2">
          {usuarios.map((user) => (
            <li
              key={user.id}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-2"
            >
              <div>
                <span className="font-semibold text-gray-800">#{user.id}</span>{" "}
                <span className="font-medium">{user.login}</span>{" "}
                <span className="text-gray-600">({user.name || "Sem nome"})</span>{" "}
                <span className="text-sm text-gray-500">Nível {user.nivel}</span>
              </div>
              <div className="mt-2 sm:mt-0 space-x-2"> {/* Ações */}
                <button
                  onClick={() => editarUsuario(user)} // Preenche formulário com dados do usuário
                  className="text-sm text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => removerUsuario(user.id)} // Remove usuário atual
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

