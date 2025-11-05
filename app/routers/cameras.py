from fastapi import APIRouter, Depends, HTTPException  # Importa classes e funções do FastAPI
from ..schemas import Camera, CameraOut  # Importa os modelos de entrada (Camera) e saída (CameraOut)
from ..database import get_connection  # Importa função para obter conexão com o banco de dados
from ..utils import log_operation  # Importa função para registrar logs de operações
from ..auth import verificar_token  # Importa função que verifica o token de autenticação

router = APIRouter()  # Cria um roteador para agrupar rotas relacionadas às câmeras

@router.get("/cameras", response_model=list[CameraOut])  # Define rota GET para listar todas as câmeras
def list_all():
    conn = get_connection(); c = conn.cursor()  # Abre conexão e cria cursor
    c.execute("SELECT id,name,ip FROM cameras")  # Executa consulta SQL para buscar câmeras
    rows = c.fetchall(); conn.close()  # Busca todos os resultados e fecha conexão
    return [{"id": r[0], "name": r[1], "ip": r[2]} for r in rows]  # Retorna lista de dicionários com dados das câmeras

@router.post("/cameras", response_model=CameraOut)  # Define rota POST para adicionar nova câmera
def add(cam: Camera, token=Depends(verificar_token)):  # Recebe dados da câmera e valida token
    conn = get_connection(); c = conn.cursor()  # Abre conexão e cria cursor
    c.execute("INSERT INTO cameras (name,ip) VALUES (%s,%s)", (cam.name, cam.ip))  # Insere nova câmera no banco
    conn.commit(); new_id = c.lastrowid; conn.close()  # Confirma transação, captura ID gerado e fecha conexão
    log_operation(token["user_id"], f"adicionou câmera {cam.name}")  # Registra operação no log com o usuário autenticado
    return {"id": new_id, **cam.dict()}  # Retorna objeto com ID e dados da câmera adicionada

@router.put("/cameras/{camera_id}", response_model=CameraOut)  # Define rota PUT para atualizar uma câmera
def update(camera_id: int, cam: Camera, token=Depends(verificar_token)):  # Recebe ID, dados da câmera e token
    conn = get_connection(); c = conn.cursor()  # Abre conexão e cria cursor
    c.execute("UPDATE cameras SET name=%s,ip=%s WHERE id=%s", (cam.name, cam.ip, camera_id))  # Atualiza dados da câmera no banco
    if c.rowcount == 0:  # Verifica se alguma linha foi afetada (ID inexistente)
        conn.close(); raise HTTPException(404, "Câmera não encontrada")  # Fecha conexão e lança erro 404
    conn.commit(); conn.close()  # Confirma alterações e fecha conexão
    log_operation(token["user_id"], f"atualizou câmera {cam.name}")  # Registra operação de atualização no log
    return {"id": camera_id, **cam.dict()}  # Retorna dados atualizados da câmera

@router.get("/cameras/{camera_id}", response_model=CameraOut)  # Define rota GET para buscar uma câmera específica
def get_by_id(camera_id: int):
    conn = get_connection(); c = conn.cursor()  # Abre conexão e cria cursor
    c.execute("SELECT id,name,ip FROM cameras WHERE id=%s", (camera_id,))  # Busca câmera pelo ID
    row = c.fetchone(); conn.close()  # Obtém resultado e fecha conexão
    if not row: raise HTTPException(404, "Câmera não encontrada")  # Se não encontrar, lança erro 404
    return {"id": row[0], "name": row[1], "ip": row[2]}  # Retorna os dados da câmera encontrada

@router.delete("/cameras/{camera_id}")  # Define rota DELETE para remover uma câmera
def delete(camera_id: int, token=Depends(verificar_token)):  # Recebe ID e token de autenticação
    conn = get_connection(); c = conn.cursor()  # Abre conexão e cria cursor
    c.execute("SELECT name FROM cameras WHERE id=%s", (camera_id,))  # Verifica se a câmera existe
    row = c.fetchone()  # Busca resultado
    if not row:  # Se não existir, lança erro
        conn.close(); raise HTTPException(404, "Câmera não encontrada")  # Fecha conexão e retorna erro 404
    c.execute("DELETE FROM cameras WHERE id=%s", (camera_id,)); conn.commit(); conn.close()  # Exclui câmera, confirma e fecha conexão
    log_operation(token["user_id"], f"removeu câmera {camera_id}")  # Registra exclusão no log
    return {"message": "Câmera removida com sucesso"}  # Retorna mensagem de sucesso
