# app/routers/files.py
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from app.database import get_connection
from app.utils import log_operation
from ..schemas import DecryptRequest, DeleteFileRequest, DeleteRequest
from ..config import IMAGES_DIR, ENCRYPTION_KEY
from ..auth import verificar_token
from cryptography.fernet import Fernet
import base64, os, time, gc
from datetime import datetime

router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

@router.get("/detections")
async def listar_detections(token=Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
   
    cursor.execute("""
        SELECT 
            d.class_name,
            d.confidence,
            d.device,
            d.camera_name,
            d.created_at,
            d.user_id,
            u.login AS employee_name
        FROM detections d
        LEFT JOIN users u ON u.id = d.user_id
        ORDER BY d.created_at DESC
        LIMIT 1000
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows



@router.delete("/delete")
def delete_file(request: DeleteFileRequest, token=Depends(verificar_token)):
    path = os.path.join(IMAGES_DIR, request.folder, request.filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Arquivo não encontrado")
    os.remove(path)
    log_operation(token["user_id"],f"Deletou um arquivo {request.filename}")
    return {"success": True}

@router.delete("/delete-batch")
async def delete_batch(request: DeleteRequest, token=Depends(verificar_token)):
    folder_path = os.path.join(IMAGES_DIR, request.folder)
    deleted = []
    for fn in request.filenames:
        p = os.path.join(folder_path, fn)
        if os.path.exists(p):
            for _ in range(5):
                try:
                    os.remove(p)
                    deleted.append(fn)
                    break
                except PermissionError:
                    time.sleep(0.1)
                    gc.collect()
    log_operation(token["user_id"],f"Deletou todos os arquivos da pasta {request.folder}")                
    return {"success": True, "deleted": deleted}

@router.get("/gallery")
def list_gallery():
    result = []
    for folder in ["video_treinado", "img_statica", "img_real_time", "img_catraca"]:
        p = os.path.join(IMAGES_DIR, folder)
        if os.path.isdir(p):
            files = []
            for f in os.listdir(p):
                fp = os.path.join(p, f)
                if os.path.isfile(fp):
                    files.append({
                        "name": f,
                        "date": datetime.fromtimestamp(os.path.getmtime(fp)).strftime("%d/%m/%Y %H:%M")
                    })
            result.append({"name": folder, "files": files})
    return {"folders": result}

@router.post("/decrypt_image")
def decrypt_image(
    req: DecryptRequest = Body(...),
    token=Depends(verificar_token),
    mode: str = "b64"
):
    path = os.path.join(IMAGES_DIR, req.folder, req.filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Arquivo não encontrado")

    data = open(path, "rb").read()
    try:
        dec = fernet.decrypt(data)
    except:
        raise HTTPException(400, "Falha na descriptografia")

    if mode == "blob":
        return StreamingResponse(BytesIO(dec), media_type="image/jpeg")
    else:
        b64 = base64.b64encode(dec).decode()
        return JSONResponse({"frame": b64})


@router.post("/decrypt_video")
def decrypt_video(
    req: DecryptRequest = Body(...),
    token=Depends(verificar_token),
    mode: str = "blob"  # padrão para vídeo é blob
):
    path = os.path.join(IMAGES_DIR, req.folder, req.filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Vídeo não encontrado")
    
    data = open(path, "rb").read()
    try:
        dec = fernet.decrypt(data)
    except:
        raise HTTPException(400, "Falha na descriptografia")

    if mode == "b64":
        # vídeo em base64 (cuidado: fica pesado)
        b64 = base64.b64encode(dec).decode()
        return JSONResponse({"video": b64})
    else:
        # padrão: streaming de bytes mp4
        return StreamingResponse(BytesIO(dec), media_type="video/mp4")