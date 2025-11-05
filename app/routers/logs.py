from fastapi import APIRouter, Depends  # Importa o roteador e o sistema de dependências do FastAPI
from ..database import get_connection  # Importa função responsável por conectar ao banco de dados
from ..auth import verificar_token  # Importa função que verifica o token de autenticação do usuário
from starlette.responses import JSONResponse  # Importa o tipo de resposta JSON

router = APIRouter()  # Cria o roteador para agrupar as rotas deste módulo

@router.get("/logs")  # Define o endpoint GET /logs
def get_logs(token=Depends(verificar_token)):  # Função protegida por autenticação
    conn = get_connection()  # Abre conexão com o banco de dados
    cur = conn.cursor()  # Cria cursor para executar comandos SQL
    cur.execute("SELECT id, user, operacao, date FROM register ORDER BY id DESC LIMIT 100")  # Busca os 100 últimos registros
    dados = [{"id": r[0], "user_id": r[1], "operacao": r[2], "date": r[3].isoformat()} for r in cur.fetchall()]  # Formata os resultados em lista de dicionários
    conn.close()  # Fecha a conexão com o banco
    return JSONResponse(content=dados)  # Retorna os logs no formato JSON
