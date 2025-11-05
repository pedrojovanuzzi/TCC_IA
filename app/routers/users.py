from fastapi import APIRouter, Depends, HTTPException, Body  # importa utilitários do FastAPI para rotas, dependências, exceções e corpo da requisição
from ..schemas import TokenRequest  # modelo Pydantic que define o payload de login (username/password)
from ..auth import criar_token, verificar_token  # funções para criar e verificar JWT
from ..database import get_connection  # função para obter conexão com o banco de dados
from ..utils import log_operation  # função de auditoria/log de operações
import hashlib  # biblioteca para hashing (SHA-256) de senhas

router = APIRouter()  # instancia um roteador do FastAPI para agrupar endpoints


# 🔐 Login
@router.post("/token")  # define endpoint POST /token para autenticação
def login(data: TokenRequest):  # função que recebe credenciais e retorna token JWT
    h = hashlib.sha256(data.password.encode()).hexdigest()  # gera hash SHA-256 da senha enviada
    conn = get_connection(); c = conn.cursor()  # abre conexão com o banco e cria cursor
    c.execute("SELECT id, nivel, login FROM users WHERE login=%s AND password=%s", (data.username, h))  # consulta usuário por login e hash da senha
    r = c.fetchone(); conn.close()  # obtém o primeiro resultado e fecha a conexão
    if not r:  # se nenhum usuário encontrado
        raise HTTPException(401, "Login ou senha inválidos")  # retorna HTTP 401 (não autorizado)
    return {  # retorna credenciais de acesso
        "access_token": criar_token({"user_id": r[0], "nivel": r[1], "username": r[2]}),  # gera JWT com id, nível e login do usuário
        "token_type": "bearer"  # tipo de token para o frontend (Bearer)
    }  # fim do retorno


# 📋 Listar usuários
@router.get("/users")  # endpoint GET /users para listar usuários
def listar(token=Depends(verificar_token)):  # exige token válido via dependência
    if token["nivel"] < 3:  # checa permissão mínima (nível 3 = admin)
        raise HTTPException(403, "Permissão negada")  # bloqueia se usuário não tiver nível suficiente
    conn = get_connection(); c = conn.cursor()  # abre conexão e cursor
    c.execute("SELECT id, login, nivel, name FROM users")  # busca todos os usuários
    u = [{"id": i[0], "login": i[1], "nivel": i[2], "name": i[3]} for i in c.fetchall()]  # transforma resultado em lista de dicionários
    conn.close()  # fecha conexão com o banco
    return u  # retorna lista de usuários


# ➕ Criar usuário
@router.post("/users")  # endpoint POST /users para criar novo usuário
def criar(user: dict = Body(...), token=Depends(verificar_token)):  # recebe JSON com dados do usuário e valida token
    if not user.get("login") or not user.get("password"):  # valida obrigatoriedade de login e senha
        raise HTTPException(400, "Dados obrigatórios")  # retorna erro 400 se faltarem campos
    if not isinstance(user.get("nivel", 1), int) or not 1 <= user["nivel"] <= 3:  # valida que nível é int entre 1 e 3
        raise HTTPException(400, "Nível inválido")  # retorna erro se nível estiver fora do intervalo

    name = user.get("name", "")  # obtém nome opcional (padrão vazio)
    h = hashlib.sha256(user["password"].encode()).hexdigest()  # gera hash da senha para persistência segura

    conn = get_connection(); c = conn.cursor()  # abre conexão e cursor
    c.execute(  # insere novo registro na tabela users
        "INSERT INTO users (login, password, nivel, name) VALUES (%s, %s, %s, %s)",
        (user["login"], h, user["nivel"], name)
    )  # fim do INSERT
    conn.commit(); conn.close()  # confirma transação e fecha conexão

    log_operation(token["user_id"], f"criou usuário '{user['login']}' nível {user['nivel']}")  # registra operação de criação no log
    return {"success": True, "login": user["login"], "nivel": user["nivel"], "name": name}  # resposta com dados principais


# ❌ Deletar usuário
@router.delete("/users/{user_id}")  # endpoint DELETE /users/{user_id} para remover usuário
def deletar(user_id: int, token=Depends(verificar_token)):  # recebe id do usuário e valida token
    conn = get_connection(); c = conn.cursor()  # abre conexão e cursor
    c.execute("SELECT login FROM users WHERE id=%s", (user_id,))  # verifica se usuário existe
    r = c.fetchone()  # obtém resultado da consulta
    if not r:  # se não encontrou
        conn.close()  # fecha conexão antes de sair
        raise HTTPException(404, "Usuário não encontrado")  # retorna erro 404

    login = r[0]  # guarda login para log
    c.execute("DELETE FROM users WHERE id=%s", (user_id,))  # executa exclusão do usuário
    conn.commit(); conn.close()  # confirma e fecha conexão
    log_operation(token["user_id"], f"deletou usuário '{login}' (id={user_id})")  # registra a exclusão no log
    return {"success": True}  # confirma sucesso


# ✏️ Atualizar usuário
@router.put("/users/{user_id}")  # endpoint PUT /users/{user_id} para atualizar campos
def atualizar(user_id: int, data: dict = Body(...), token=Depends(verificar_token)):  # recebe id e payload de atualização
    u, p = [], []  # listas para montar SET dinâmico e parâmetros

    if data.get("login"):  # se veio novo login
        u.append("login=%s"); p.append(data["login"])  # adiciona campo e parâmetro
    if data.get("password"):  # se veio nova senha
        h = hashlib.sha256(data["password"].encode()).hexdigest()  # calcula hash da nova senha
        u.append("password=%s"); p.append(h)  # atualiza campo de senha com hash
    if data.get("nivel") is not None:  # se nível foi informado (mesmo que 0, mas regra aceita 1..3)
        u.append("nivel=%s"); p.append(data["nivel"])  # adiciona atualização de nível
    if data.get("name"):  # se veio nome
        u.append("name=%s"); p.append(data["name"])  # adiciona atualização de nome

    if not u:  # se nenhuma coluna foi selecionada para update
        raise HTTPException(400, "Nada para atualizar")  # retorna erro 400

    p.append(user_id)  # adiciona id ao final para cláusula WHERE
    conn = get_connection(); c = conn.cursor()  # abre conexão e cursor
    c.execute(f"UPDATE users SET {','.join(u)} WHERE id=%s", tuple(p))  # executa UPDATE com campos dinâmicos
    conn.commit(); conn.close()  # confirma transação e fecha conexão

    log_operation(token["user_id"], f"atualizou usuário id={user_id}")  # registra atualização no log
    return {"success": True}  # responde sucesso
