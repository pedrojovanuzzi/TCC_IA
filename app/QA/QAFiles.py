

import sys
from cryptography.fernet import Fernet
from datetime import datetime

import gc
import os
import time
from fastapi import APIRouter, Depends, HTTPException
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.auth import verificar_token
from app.config import ENCRYPTION_KEY, IMAGES_DIR
from app.schemas import DeleteFileRequest, DeleteRequest


router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

def delete_file(request: DeleteFileRequest, token=Depends(verificar_token)):
    path = os.path.join(IMAGES_DIR, request.folder, request.filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Arquivo não encontrado")
    os.remove(path)
    return {"success": True}

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
    return {"success": True, "deleted": deleted}

def list_gallery():
    result = []
    for folder in ["video_treinado", "img_statica", "img_real_time"]:
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


if __name__ == "__main__":
    list_gallery()