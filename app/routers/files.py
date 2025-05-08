from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import JSONResponse
from ..schemas import DeleteFileRequest, DeleteRequest
from ..config import IMAGES_DIR
from ..auth import verificar_token
import os, time, gc
from datetime import datetime

router = APIRouter()

@router.delete("/delete")
def delete_file(request: DeleteFileRequest, token = Depends(verificar_token)):
    folder = os.path.join(IMAGES_DIR, request.folder)
    path   = os.path.join(folder, request.filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Arquivo não encontrado")
    os.remove(path)
    return {"success": True}

@router.delete("/delete-batch")
async def delete_batch(request: DeleteRequest, token = Depends(verificar_token)):
    folder = os.path.join(IMAGES_DIR, request.folder)
    deleted = []
    for fn in request.filenames:
        path = os.path.join(folder, fn)
        if os.path.exists(path):
            for _ in range(5):
                try:
                    os.remove(path)
                    deleted.append(fn)
                    break
                except PermissionError:
                    time.sleep(0.1)
                    gc.collect()
    return {"success": True, "deleted": deleted}

@router.get("/gallery")
def list_gallery():
    result = []
    for folder in ["video_treinado", "img_statica", "img_real_time"]:
        p = os.path.join(IMAGES_DIR, folder)
        if os.path.isdir(p):
            files = []
            for f in os.listdir(p):
                fp = os.path.join(p, f)
                if os.path.isfile(fp):
                    files.append({"name": f, "date": datetime.fromtimestamp(os.path.getmtime(fp)).strftime("%d/%m/%Y %H:%M")})
            result.append({"name": folder, "files": files})
    return {"folders": result}
