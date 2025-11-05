# app/routers/cronjob.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from database import get_connection
from auth import verificar_token
from datetime import datetime, timedelta
import re, traceback

router = APIRouter()

# ✅ Inclui o campo 'email'
class CronJobConfig(BaseModel):
    time: str
    active: bool
    email: EmailStr


def parse_time_string(time_str: str) -> datetime:
    """Converte '10D 2H 30M' → datetime"""
    pattern = r'(\d+)\s*([DHMS])'
    matches = re.findall(pattern, time_str.upper())

    delta_kwargs = {'days': 0, 'hours': 0, 'minutes': 0, 'seconds': 0}
    for value, unit in matches:
        value = int(value)
        if unit == 'D':
            delta_kwargs['days'] += value
        elif unit == 'H':
            delta_kwargs['hours'] += value
        elif unit == 'M':
            delta_kwargs['minutes'] += value
        elif unit == 'S':
            delta_kwargs['seconds'] += value

    return datetime.now() + timedelta(**delta_kwargs)


@router.post("/cronjob")
def salvar_cronjob(config: CronJobConfig, token=Depends(verificar_token)):
    if token["nivel"] < 2:
        raise HTTPException(403, "Permissão negada")

    try:
        conn = get_connection()
        c = conn.cursor()

        dt_result = parse_time_string(config.time)
        print(f"⏰ Próxima execução agendada para: {dt_result}")

        # Verifica se já existe um registro
        c.execute("SELECT COUNT(*) FROM cronjob")
        existe = c.fetchone()[0]

        if existe > 0:
            c.execute(
                "UPDATE cronjob SET time=%s, active=%s, interval_text=%s, email=%s",
                (
                    dt_result.strftime("%Y-%m-%d %H:%M:%S"),
                    int(config.active),
                    config.time,
                    config.email,
                ),
            )
        else:
            c.execute(
                "INSERT INTO cronjob (time, active, interval_text, email) VALUES (%s, %s, %s, %s)",
                (
                    dt_result.strftime("%Y-%m-%d %H:%M:%S"),
                    int(config.active),
                    config.time,
                    config.email,
                ),
            )

        conn.commit()
        conn.close()
        return {"mensagem": "Configuração salva com sucesso!"}

    except Exception as e:
        print("❌ ERRO NO CRONJOB:")
        traceback.print_exc()
        raise HTTPException(500, f"Erro ao salvar configuração: {e}")


@router.get("/cronjob")
def listar_cronjob(token=Depends(verificar_token)):
    if token["nivel"] < 2:
        raise HTTPException(403, "Permissão negada")

    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT time, active, interval_text, email FROM cronjob LIMIT 1")
        result = c.fetchone()
        conn.close()

        if not result:
            return {"time": "", "active": False, "email": ""}

        dt_exec, ativo, intervalo, email = result
        return {
            "time": intervalo or "",
            "active": bool(ativo),
            "email": email or "",
        }

    except Exception as e:
        print("❌ ERRO AO BUSCAR CONFIGURAÇÃO DO CRONJOB:")
        traceback.print_exc()
        raise HTTPException(500, f"Erro ao buscar configuração: {e}")
