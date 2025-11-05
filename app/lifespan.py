from fastapi import FastAPI  # importa a classe FastAPI para criar a aplicação
from contextlib import asynccontextmanager  # utilitário para definir um ciclo de vida assíncrono
import os, hashlib  # os para variáveis de ambiente/SO e hashlib para hash da senha
from .database import get_connection  # função que retorna uma conexão com o banco de dados

@asynccontextmanager  # decorador que define um gerenciador de contexto assíncrono (lifespan)
async def lifespan(app: FastAPI):  # função de ciclo de vida da aplicação FastAPI
    print("🚀 [lifespan] Inicializando...")  # loga início da inicialização

    try:  # tenta executar o bloco de criação do usuário admin
        conn = get_connection()  # abre conexão com o banco
        cursor = conn.cursor()  # cria um cursor para executar comandos SQL

        cursor.execute("SELECT COUNT(*) FROM users WHERE login = %s", ("admin",))  # verifica se já existe usuário 'admin'
        existe = cursor.fetchone()[0]  # obtém a contagem retornada (0 se não existe)

        if existe == 0:  # se não existe usuário admin
            senha = os.getenv("ADMIN_PASSWORD")  # lê a senha do admin do ambiente (.env)
            if not senha:  # se a variável não está definida
                raise ValueError("ADMIN_PASSWORD não está definido.")  # lança erro informando ausência de senha
            senha_hash = hashlib.sha256(senha.encode()).hexdigest()  # gera hash SHA-256 da senha
            cursor.execute(  # insere o usuário admin com nível 3 e senha com hash
                "INSERT INTO users (login, password, nivel) VALUES (%s, %s, 3)",
                ("admin", senha_hash)
            )
            conn.commit()  # confirma a transação no banco
            print("✅ Usuário admin criado com sucesso.")  # loga sucesso na criação
        else:  # caso já exista ao menos um admin
            print("🔒 Usuário admin já existe.")  # informa que não será recriado

        conn.close()  # fecha a conexão com o banco
    except Exception as e:  # captura qualquer erro durante o processo
        print("❌ Erro ao criar admin:", e)  # loga a mensagem de erro

    yield  # entrega o controle para a aplicação rodar (entre inicialização e finalização)
    print("🛑 [lifespan] Encerrando...")  # loga encerramento do ciclo de vida
