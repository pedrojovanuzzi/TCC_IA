# app/lifespan.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
import os, hashlib
from .database import get_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users WHERE login = %s", ("admin",))
        existe = cursor.fetchone()[0]
        if existe == 0:
            senha_hash = hashlib.sha256(os.getenv("ADMIN_PASSWORD").encode()).hexdigest()
            cursor.execute(
                "INSERT INTO users (login, password, nivel) VALUES (%s, %s, 3)",
                ("admin", senha_hash)
            )
            conn.commit()
        conn.close()
    except Exception:
        pass
    yield
