# app/routers/cronjob.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_connection
from auth import verificar_token  # Middleware de autenticação JWT
import traceback
from datetime import datetime, timedelta
import re

router = APIRouter()

# Modelo do corpo da requisição
class CronJobConfig(BaseModel):
    time: str
    active: bool


# POST - Salvar/Atualizar configuração
@router.post("/cronjob")
def salvar_cronjob(config: CronJobConfig, token=Depends(verificar_token)):
    if token["nivel"] < 2:
        raise HTTPException(403, "Permissão negada")

    try:
        # Função auxiliar para converter string em datetime
        def parse_time_string(time_str: str) -> datetime:
            # Expressão regular para capturar grupos: ex "10D 5H 30M 10S"
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

            # Adiciona o delta ao tempo atual
            result = datetime.now() + timedelta(**delta_kwargs)
            return result

        # Converte a string recebida (ex: "10D 5H") para datetime
        dt_result = parse_time_string(config.time)
        print(f"⏰ Tempo convertido: {dt_result}")

        conn = get_connection()
        c = conn.cursor()

        c.execute("SELECT COUNT(*) FROM cronjob")
        existe = c.fetchone()[0]
        print("Registros existentes:", existe)

        if existe > 0:
            c.execute(
                "UPDATE cronjob SET `time` = %s, `active` = %s",
                (dt_result.strftime("%Y-%m-%d %H:%M:%S"), int(config.active))
            )
        else:
            c.execute(
                "INSERT INTO cronjob (`time`, `active`) VALUES (%s, %s)",
                (dt_result.strftime("%Y-%m-%d %H:%M:%S"), int(config.active))
            )

        conn.commit()
        conn.close()
        return {"mensagem": "Configuração de CronJob salva com sucesso!"}

    except Exception as e:
        print("❌ ERRO COMPLETO NO CRONJOB:")
        traceback.print_exc()
        raise HTTPException(500, f"Erro ao salvar configuração: {e}")


# GET - Buscar configuração atual
@router.get("/cronjob")
def listar_cronjob(token=Depends(verificar_token)):
    if token["nivel"] < 2:
        raise HTTPException(403, "Permissão negada")

    try:
        conn = get_connection()
        c = conn.cursor()

        # Busca o primeiro registro (mantém 1 único)
        c.execute("SELECT time, active FROM cronjob LIMIT 1")
        result = c.fetchone()
        conn.close()

        if not result:
            return {"time": None, "active": False}

        return {"time": result[0], "active": bool(result[1])}

    except Exception as e:
        raise HTTPException(500, f"Erro ao buscar configuração: {e}")
