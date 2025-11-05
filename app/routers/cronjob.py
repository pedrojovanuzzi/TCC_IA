# app/routers/cronjob.py
from fastapi import APIRouter, Depends, HTTPException  # Importa classes e funções essenciais do FastAPI
from pydantic import BaseModel, EmailStr  # Importa o BaseModel e o tipo EmailStr para validação de dados
from database import get_connection  # Função para obter conexão com o banco de dados
from auth import verificar_token  # Função de autenticação que valida o token do usuário
from datetime import datetime, timedelta  # Importa funções para manipulação de datas e intervalos
import re, traceback  # 're' para expressões regulares e 'traceback' para exibir erros detalhados

router = APIRouter()  # Cria o roteador para agrupar rotas relacionadas ao cronjob

# ✅ Inclui o campo 'email'
class CronJobConfig(BaseModel):  # Define o modelo de dados esperado na requisição POST
    time: str  # Intervalo de tempo informado em formato textual (ex: '10D 2H 30M')
    active: bool  # Define se o cronjob está ativo
    email: EmailStr  # Email que receberá notificações (validação automática pelo Pydantic)


def parse_time_string(time_str: str) -> datetime:  # Converte string de tempo em data futura
    """Converte '10D 2H 30M' → datetime"""
    pattern = r'(\d+)\s*([DHMS])'  # Expressão regular que captura número + unidade de tempo (D, H, M, S)
    matches = re.findall(pattern, time_str.upper())  # Extrai as correspondências ignorando maiúsculas/minúsculas

    delta_kwargs = {'days': 0, 'hours': 0, 'minutes': 0, 'seconds': 0}  # Inicializa dicionário de intervalos
    for value, unit in matches:  # Itera sobre cada par valor/unidade encontrado
        value = int(value)  # Converte o valor para inteiro
        if unit == 'D':  # Se unidade for dias
            delta_kwargs['days'] += value  # Soma ao total de dias
        elif unit == 'H':  # Se unidade for horas
            delta_kwargs['hours'] += value  # Soma ao total de horas
        elif unit == 'M':  # Se unidade for minutos
            delta_kwargs['minutes'] += value  # Soma ao total de minutos
        elif unit == 'S':  # Se unidade for segundos
            delta_kwargs['seconds'] += value  # Soma ao total de segundos

    return datetime.now() + timedelta(**delta_kwargs)  # Retorna a data atual somada ao intervalo


@router.post("/cronjob")  # Define rota POST para salvar ou atualizar o cronjob
def salvar_cronjob(config: CronJobConfig, token=Depends(verificar_token)):  # Recebe os dados e o token de autenticação
    if token["nivel"] < 2:  # Verifica se o usuário tem nível de permissão suficiente
        raise HTTPException(403, "Permissão negada")  # Retorna erro 403 caso não tenha permissão

    try:
        conn = get_connection()  # Abre conexão com o banco de dados
        c = conn.cursor()  # Cria o cursor para executar comandos SQL

        dt_result = parse_time_string(config.time)  # Converte o tempo em data real
        print(f"⏰ Próxima execução agendada para: {dt_result}")  # Exibe no log o horário da próxima execução

        # Verifica se já existe um registro
        c.execute("SELECT COUNT(*) FROM cronjob")  # Conta quantos registros já existem
        existe = c.fetchone()[0]  # Armazena o resultado da contagem

        if existe > 0:  # Caso já exista registro, atualiza
            c.execute(
                "UPDATE cronjob SET time=%s, active=%s, interval_text=%s, email=%s",
                (
                    dt_result.strftime("%Y-%m-%d %H:%M:%S"),  # Converte datetime em string
                    int(config.active),  # Converte booleano em inteiro (1/0)
                    config.time,  # Salva texto do intervalo
                    config.email,  # Salva o email
                ),
            )
        else:  # Caso não exista, insere novo registro
            c.execute(
                "INSERT INTO cronjob (time, active, interval_text, email) VALUES (%s, %s, %s, %s)",
                (
                    dt_result.strftime("%Y-%m-%d %H:%M:%S"),  # Data formatada
                    int(config.active),  # Valor booleano convertido
                    config.time,  # Intervalo original
                    config.email,  # Email informado
                ),
            )

        conn.commit()  # Confirma alterações no banco
        conn.close()  # Fecha conexão
        return {"mensagem": "Configuração salva com sucesso!"}  # Retorna resposta de sucesso

    except Exception as e:  # Captura qualquer erro durante o processo
        print("❌ ERRO NO CRONJOB:")  # Mensagem de erro no terminal
        traceback.print_exc()  # Mostra rastreamento detalhado do erro
        raise HTTPException(500, f"Erro ao salvar configuração: {e}")  # Retorna erro 500


@router.get("/cronjob")  # Define rota GET para listar configuração do cronjob
def listar_cronjob(token=Depends(verificar_token)):  # Recebe token de autenticação
    if token["nivel"] < 2:  # Verifica nível de acesso
        raise HTTPException(403, "Permissão negada")  # Bloqueia usuários não autorizados

    try:
        conn = get_connection()  # Conecta ao banco de dados
        c = conn.cursor()  # Cria cursor SQL
        c.execute("SELECT time, active, interval_text, email FROM cronjob LIMIT 1")  # Busca única configuração
        result = c.fetchone()  # Obtém resultado
        conn.close()  # Fecha conexão

        if not result:  # Se não houver registro, retorna vazio
            return {"time": "", "active": False, "email": ""}

        dt_exec, ativo, intervalo, email = result  # Desestrutura os campos retornados
        return {
            "time": intervalo or "",  # Retorna texto do intervalo
            "active": bool(ativo),  # Converte inteiro em booleano
            "email": email or "",  # Retorna email salvo
        }

    except Exception as e:  # Trata exceções durante leitura
        print("❌ ERRO AO BUSCAR CONFIGURAÇÃO DO CRONJOB:")  # Loga erro no console
        traceback.print_exc()  # Exibe rastreamento completo
        raise HTTPException(500, f"Erro ao buscar configuração: {e}")  # Retorna erro 500
