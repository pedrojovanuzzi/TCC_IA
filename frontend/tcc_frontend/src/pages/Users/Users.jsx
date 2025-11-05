// Importa bibliotecas e dependências // linha de comentário informativa já presente
import React, { useEffect, useState } from "react"; // importa React e hooks para estado (useState) e efeitos (useEffect)
import { useAuth } from "../../context/AuthContext"; // importa contexto de autenticação para obter dados do usuário logado
import getHostName from "../../../utils/getUrl"; // util para resolver a URL base da API do backend
import Header from "../../components/Header"; // componente de cabeçalho reutilizável

export const Users = () => { // declara e exporta o componente funcional Users
  // Estados para gerenciar dados do formulário e lista // comentário original explicando o bloco de estados
  const [usuarios, setUsuarios] = useState([]);       // lista de usuários carregada da API
  const [login, setLogin] = useState("");             // campo controlado para o login do usuário
  const [password, setPassword] = useState("");       // campo controlado para a senha
  const [name, setName] = useState("");               // ✅ novo campo: nome completo // estado para o nome exibido
  const [nivel, setNivel] = useState(1);              // nível de acesso (1, 2 ou 3) com padrão 1
  const [editandoId, setEditandoId] = useState(null); // identifica o usuário em edição (null quando criando)
  const [error, setError] = useState(null);           // armazena mensagens de erro da API para renderização

  const { username } = useAuth(); // obtém o username do usuário autenticado via contexto
  const API_URL = getHostName(); // resolve a URL base do backend (ex.: http://localhost:3001/api)

  // Função para ler o token JWT armazenado // comentário explicativo da função de util interno
  const getAuthHeader = () => { // retorna headers de autorização se houver token
    const token = localStorage.getItem("access_token"); // lê token JWT do localStorage
    return token ? { Authorization: `Bearer ${token}` } : {}; // monta header Authorization ou objeto vazio
  }; // fim getAuthHeader

  // 🔹 Carrega a lista de usuários do backend // comentário original indicando operação de leitura
  const carregarUsuarios = async () => { // função assíncrona para buscar usuários
    try { // tenta realizar a requisição
      const res = await fetch(`${API_URL}/users`, { // chama endpoint GET /users
        headers: { // define cabeçalhos da requisição
          "Content-Type": "application/json", // indica JSON na resposta/negociação
          ...getAuthHeader(), // injeta Authorization se disponível
        }, // fim headers
      }); // fim fetch
      if (!res.ok) throw new Error(`https ${res.status}`); // lança erro caso status HTTP não seja 2xx
      const data = await res.json(); // parseia o corpo JSON retornado
      setUsuarios(data); // atualiza estado com a lista de usuários
    } catch (err) { // captura falhas de rede/HTTP
      console.error("Falha ao buscar usuários:", err); // loga o erro no console
      setError(err.message); // guarda mensagem de erro para exibir na UI
    } // fim try/catch
  }; // fim carregarUsuarios

  // 🔹 Cria ou atualiza usuário // comentário original indicando operação de escrita
  const adicionarOuAtualizarUsuario = async (e) => { // handler do submit do formulário
    e.preventDefault(); // previne o reload da página padrão do form
    if (!login) return alert("Preencha o login"); // validação simples: login obrigatório

    // monta o corpo da requisição // comentário original sobre construção do payload
    const payload = { login, name }; // ✅ inclui o nome // objeto base com login e nome
    if (password) payload.password = password; // inclui senha somente se informada
    if (nivel) payload.nivel = Number(nivel); // garante que nível seja número ao enviar
    if (username) payload.username = username; // opcional: inclui username do operador (para logs no backend)

    const url = editandoId // decide endpoint conforme operação
      ? `${API_URL}/users/${editandoId}` // URL para atualizar (PUT)
      : `${API_URL}/users`; // URL para criar (POST)
    const method = editandoId ? "PUT" : "POST"; // método HTTP conforme criação/edição

    if (!editandoId && !password) { // validação extra: criação exige senha
      return alert("Senha é obrigatória ao criar um usuário"); // feedback ao usuário
    } // fim validação senha

    try { // tenta executar requisição de criação/atualização
      const res = await fetch(url, { // envia para o endpoint definido
        method, // método HTTP dinamicamente escolhido
        headers: { // cabeçalhos da requisição
          "Content-Type": "application/json", // indica JSON no corpo
          ...getAuthHeader(), // adiciona Authorization se houver token
        }, // fim headers
        body: JSON.stringify(payload), // serializa payload em JSON
      }); // fim fetch
      if (!res.ok) throw new Error(`https ${res.status}`); // caso falhe, lança erro para o catch
      resetarForm(); // limpa o formulário após sucesso
      carregarUsuarios(); // recarrega a lista atualizada da API
    } catch (err) { // trata erros da operação
      alert(`Erro ao ${editandoId ? "atualizar" : "criar"} usuário`); // mensagem contextual conforme ação
      console.error(err); // log detalhado no console
    } // fim try/catch
  }; // fim adicionarOuAtualizarUsuario

  // 🔹 Reseta o formulário após salvar // comentário original descrevendo a função
  const resetarForm = () => { // função utilitária para limpar campos
    setLogin(""); // limpa login
    setPassword(""); // limpa senha
    setName(""); // limpa nome
    setNivel(1); // retorna nível ao padrão (1)
    setEditandoId(null); // sai do modo edição
  }; // fim resetarForm

  // 🔹 Preenche o formulário ao clicar em editar // comentário original
  const editarUsuario = (user) => { // inicia edição de um usuário existente
    setLogin(user.login); // preenche login com o valor atual
    setName(user.name || ""); // preenche nome ou string vazia se ausente
    setNivel(user.nivel); // define o nível atual do usuário
    setEditandoId(user.id); // marca o id que está em edição
  }; // fim editarUsuario

  // 🔹 Remove usuário // comentário original
  const removerUsuario = async (id) => { // handler para excluir um usuário
    if (!window.confirm("Tem certeza que deseja excluir?")) return; // confirma ação destrutiva
    try { // tenta realizar deleção
      const res = await fetch(`${API_URL}/users/${id}`, { // chama DELETE /users/:id
        method: "DELETE", // método HTTP de remoção
        headers: { // injeta Authorization se presente
          ...getAuthHeader(), // cabeçalho com Bearer token
        }, // fim headers
      }); // fim fetch
      if (!res.ok) throw new Error(`https ${res.status}`); // se falhar, encaminha para catch
      carregarUsuarios(); // atualiza a lista após remoção
    } catch { // captura qualquer erro
      alert("Erro ao remover usuário"); // mostra erro genérico ao usuário
    } // fim try/catch
  }; // fim removerUsuario

  // 🔹 Carrega usuários na montagem do componente // comentário original
  useEffect(() => { // efeito chamado ao montar o componente
    carregarUsuarios(); // busca a lista inicial de usuários
  }, []); // dependências vazias: roda apenas uma vez

  if (error) return <div>Erro: {error}</div>; // renderiza mensagem de erro caso exista erro na busca

  return ( // JSX de renderização do componente
    <> {/* Fragmento React para agrupar múltiplos elementos sem nó extra no DOM */}
      <Header /> {/* Renderiza o cabeçalho da aplicação */}
      <div className="p-10 max-w-xl mx-auto"> {/* container central com padding e largura máxima */}
        <h2 className="text-2xl font-bold mb-4"> {/* título do formulário com estilos */}
          {editandoId ? "Editar Usuário" : "Adicionar Usuário"} {/* alterna texto conforme modo */}
        </h2> {/* fim do título */}

        {/* 🔹 Formulário */} {/* comentário informativo da seção do formulário */}
        <form onSubmit={adicionarOuAtualizarUsuario} className="mb-6 space-y-4"> {/* form que dispara submit handler */}
          <input
            type="text"
            placeholder="Login"
            className="w-full p-2 border rounded"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          /> {/* campo de login controlado */}
          <input
            type="text"
            placeholder="Nome Completo"
            className="w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          /> {/* campo do nome controlado */}
          <input
            type="password"
            placeholder="Senha"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          /> {/* campo de senha controlado */}
          <select
            className="w-full p-2 border rounded"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
          > {/* seletor de nível de acesso */}
            <option value={1}>Nível 1 - Restrito</option> {/* opção nível 1 */}
            <option value={2}>Nível 2 - Intermediário</option> {/* opção nível 2 */}
            <option value={3}>Nível 3 - Admin</option> {/* opção nível 3 */}
          </select> {/* fim do select */}
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500"
          >
            {editandoId ? "Atualizar Usuário" : "Adicionar Usuário"}
          </button> {/* botão principal do formulário */}
          {editandoId && ( // renderização condicional: exibe botão de cancelar quando em edição
            <button
              type="button"
              onClick={resetarForm}
              className="ml-2 text-sm text-gray-600 underline"
            >
              Cancelar edição
            </button>
          )} {/* fim do condicional de cancelamento */}
        </form> {/* fim do formulário */}

        {/* 🔹 Lista de usuários */} {/* comentário original da seção de listagem */}
        <ul className="space-y-2"> {/* lista com espaçamento vertical entre itens */}
          {usuarios.map((user) => ( // mapeia usuários em itens da lista
            <li
              key={user.id}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-2"
            > {/* item de usuário com layout responsivo e borda inferior */}
              <div> {/* bloco com dados do usuário */}
                <span className="font-semibold text-gray-800">#{user.id}</span>{" "} {/* exibe id com destaque */}
                <span className="font-medium">{user.login}</span>{" "} {/* exibe login */}
                <span className="text-gray-600">
                  ({user.name || "Sem nome"})
                </span>{" "} {/* exibe nome ou placeholder */}
                <span className="text-sm text-gray-500">
                  — Nível {user.nivel}
                </span> {/* exibe o nível do usuário */}
              </div> {/* fim bloco de dados */}
              <div className="mt-2 sm:mt-0 space-x-2"> {/* bloco de ações (editar/remover) */}
                <button
                  onClick={() => editarUsuario(user)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Editar
                </button> {/* botão que preenche o formulário com os dados do usuário */}
                <button
                  onClick={() => removerUsuario(user.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remover
                </button> {/* botão que solicita remoção do usuário */}
              </div> {/* fim bloco de ações */}
            </li>
          ))} {/* fim map de usuários */}
        </ul> {/* fim da lista */}
      </div> {/* fim do container principal */}
    </> // fim do fragmento raiz
  ); // fim do return do componente
}; // fim da declaração do componente Users
