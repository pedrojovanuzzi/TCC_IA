from fastapi import APIRouter, Depends
from ..database import get_connection
from ..auth import verificar_token
from starlette.responses import JSONResponse

router = APIRouter()

@router.get("/logs")
def get_logs(token=Depends(verificar_token)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, user, operacao FROM register ORDER BY id DESC LIMIT 100")
    dados = [{"id": r[0], "user_id": r[1], "operacao": r[2]} for r in cur.fetchall()]
    conn.close()
    return JSONResponse(content=dados)
