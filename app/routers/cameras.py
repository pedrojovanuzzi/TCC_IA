from fastapi import APIRouter, Depends, HTTPException
from ..schemas import Camera, CameraOut
from ..database import get_connection
from ..utils import log_operation
from ..auth import verificar_token

router = APIRouter()

@router.get("/cameras", response_model=list[CameraOut])
def list_all():
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT id,name,ip FROM cameras")
    rows = c.fetchall(); conn.close()
    return [{"id": r[0], "name": r[1], "ip": r[2]} for r in rows]

@router.post("/cameras", response_model=CameraOut)
def add(cam: Camera, token=Depends(verificar_token)):
    conn = get_connection(); c = conn.cursor()
    c.execute("INSERT INTO cameras (name,ip) VALUES (%s,%s)", (cam.name, cam.ip))
    conn.commit(); new_id = c.lastrowid; conn.close()
    log_operation(token["user_id"], f"adicionou câmera {cam.name}")
    return {"id": new_id, **cam.dict()}

@router.put("/cameras/{camera_id}", response_model=CameraOut)
def update(camera_id: int, cam: Camera, token=Depends(verificar_token)):
    conn = get_connection(); c = conn.cursor()
    c.execute("UPDATE cameras SET name=%s,ip=%s WHERE id=%s", (cam.name, cam.ip, camera_id))
    if c.rowcount == 0:
        conn.close(); raise HTTPException(404, "Câmera não encontrada")
    conn.commit(); conn.close()
    log_operation(token["user_id"], f"atualizou câmera {cam.name}")
    return {"id": camera_id, **cam.dict()}

@router.get("/cameras/{camera_id}", response_model=CameraOut)
def get_by_id(camera_id: int):
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT id,name,ip FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone(); conn.close()
    if not row: raise HTTPException(404, "Câmera não encontrada")
    return {"id": row[0], "name": row[1], "ip": row[2]}

@router.delete("/cameras/{camera_id}")
def delete(camera_id: int, token=Depends(verificar_token)):
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT name FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone()
    if not row:
        conn.close(); raise HTTPException(404, "Câmera não encontrada")
    c.execute("DELETE FROM cameras WHERE id=%s", (camera_id,)); conn.commit(); conn.close()
    log_operation(token["user_id"], f"removeu câmera {camera_id}")
    return {"message": "Câmera removida com sucesso"}
