from fastapi import FastAPI
from contextlib import asynccontextmanager
import os, hashlib
from .database import get_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 [lifespan] Inicializando...")

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users WHERE login = %s", ("admin",))
        existe = cursor.fetchone()[0]

        if existe == 0:
            senha = os.getenv("ADMIN_PASSWORD")
            if not senha:
                raise ValueError("ADMIN_PASSWORD não está definido.")
            senha_hash = hashlib.sha256(senha.encode()).hexdigest()
            cursor.execute(
                "INSERT INTO users (login, password, nivel) VALUES (%s, %s, 3)",
                ("admin", senha_hash)
            )
            conn.commit()
            print("✅ Usuário admin criado com sucesso.")
        else:
            print("🔒 Usuário admin já existe.")

        conn.close()
    except Exception as e:
        print("❌ Erro ao criar admin:", e)

    yield
    print("🛑 [lifespan] Encerrando...")
