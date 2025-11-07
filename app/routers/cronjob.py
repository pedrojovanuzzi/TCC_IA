# app/routers/cronjob.py
from fastapi import APIRouter, Body, Depends, HTTPException  # Importa classes e funções essenciais do FastAPI
from pydantic import BaseModel, EmailStr  # Importa o BaseModel e o tipo EmailStr para validação de dados
from database import get_connection  # Função para obter conexão com o banco de dados
from auth import verificar_token  # Função de autenticação que valida o token do usuário
from datetime import datetime, timedelta  # Importa funções para manipulação de datas e intervalos
import re, traceback  # 're' para expressões regulares e 'traceback' para exibir erros detalhados

router = APIRouter()  # Cria o roteador para agrupar rotas relacionadas ao cronjob



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


@router.post("/cronjob")  # Define a rota HTTP POST para /api/cronjob
def salvar_cronjob(
    config: dict = Body(...),  # Indica que o corpo da requisição virá em formato JSON (será convertido em dicionário Python)
    token=Depends(verificar_token)  # Extrai e valida o token JWT antes de processar a rota
):
    # 🔐 Verifica se o usuário tem nível de permissão suficiente (mínimo nível 2)
    if token["nivel"] < 2:
        raise HTTPException(403, "Permissão negada")  # Retorna erro 403 se não tiver permissão

    try:
        # 🧩 Extrai os valores do JSON recebido (corpo da requisição)
        time_str = config["time"]    # Texto do intervalo, ex: "10D 2H 30M"
        active = config["active"]    # Booleano indicando se o cronjob está ativo
        email = config["email"]      # E-mail para notificações

        # 🧠 Converte o texto de tempo em data real (exemplo: "10D 2H" → datetime futuro)
        dt_result = parse_time_string(time_str)
        print(f"⏰ Próxima execução agendada para: {dt_result}")  # Exibe no terminal a data calculada

        # 🗄️ Abre conexão com o banco de dados
        conn = get_connection()
        c = conn.cursor()  # Cria cursor para executar comandos SQL

        # 🔍 Verifica se já existe um registro na tabela 'cronjob'
        c.execute("SELECT COUNT(*) FROM cronjob")  # Executa contagem
        existe = c.fetchone()[0]  # Obtém resultado da contagem

        # 🧾 Se já existir, faz UPDATE
        if existe > 0:
            c.execute(
                "UPDATE cronjob SET time=%s, active=%s, interval_text=%s, email=%s",
                (
                    dt_result.strftime("%Y-%m-%d %H:%M:%S"),  # Converte datetime para string
                    int(active),  # Converte True/False em 1/0 (para salvar no banco)
                    time_str,  # Salva texto original do intervalo
                    email,  # Salva e-mail informado
                ),
            )

        # ➕ Se não existir, faz INSERT
        else:
            c.execute(
                "INSERT INTO cronjob (time, active, interval_text, email) VALUES (%s, %s, %s, %s)",
                (
                    dt_result.strftime("%Y-%m-%d %H:%M:%S"),  # Data formatada
                    int(active),  # Converte booleano para inteiro
                    time_str,  # Texto original (ex: "10D 2H")
                    email,  # E-mail informado
                ),
            )

        # 💾 Confirma as alterações no banco
        conn.commit()

        # 🔒 Fecha a conexão
        conn.close()

        # ✅ Retorna resposta de sucesso em JSON
        return {"mensagem": "Configuração salva com sucesso!"}

    # ⚠️ Captura qualquer erro ocorrido durante o processo
    except Exception as e:
        print("❌ ERRO NO CRONJOB:")  # Mostra aviso de erro no console
        traceback.print_exc()  # Exibe rastreamento detalhado do erro
        raise HTTPException(500, f"Erro ao salvar configuração: {e}")  # Retorna erro 500 com descrição


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
