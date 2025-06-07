import asyncio
import base64
from datetime import datetime, timedelta
import hashlib
from io import BytesIO
import sys
import os
from types import SimpleNamespace
import cv2
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
import numpy as np
import torch
from ultralytics import YOLO
from app.config import CONFIDENCE, CORES_CLASSES, ENCRYPTION_KEY, IMAGES_DIR, IMG_SIZE, IMG_STATIC_DIR, MODEL_PATH
from app.utils import log_operation
from fastapi import Body, Depends, File, HTTPException, UploadFile
from app.auth import ALGORITHM, EXPIRE_MINUTES, SECRET_KEY, criar_token, verificar_token
from app.database import get_connection
from app.schemas import DecryptRequest, TokenRequest
from cryptography.fernet import Fernet
from jose import JWTError, jwt



fernet = Fernet(ENCRYPTION_KEY)

def draw_label(img, text, x, y, color):
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.2
    thickness = 1
    w, h = cv2.getTextSize(text, font, scale, thickness)[0]
    cv2.rectangle(img, (x, y - h - 10), (x + w + 10, y), color, -1)
    cv2.putText(img, text, (x + 5, y - 5), font, scale, (0, 0, 0), thickness)

async def inferir(file: UploadFile = File(...), token = Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)
    content = await file.read()
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
    result = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
    for box in result.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cls = model.names[int(box.cls[0])]
        conf = float(box.cls[0])
        color = CORES_CLASSES.get(cls, (255, 255, 255))
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
        draw_label(img, f"{cls}:{conf:.2f}", x1, y1, color)
    os.makedirs(IMG_STATIC_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
    filename = f"detectado_{ts}.jpg"
    path = os.path.join(IMG_STATIC_DIR, filename)
    cv2.imshow("Resultado da Inferência", img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    cv2.imwrite(path, img)
    with open(path, "rb") as f:
        data = f.read()
    encrypted = fernet.encrypt(data)
    with open(path, "wb") as f:
        f.write(encrypted)
    _, buf = cv2.imencode(".jpg", img)
    frame_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
    log_operation(token["user_id"], f"Salvou e criptografou {filename}")
    return JSONResponse({"frame": frame_b64, "path": path})


def decrypt_image(req: DecryptRequest = Body(...), token=Depends(verificar_token)):
    path = os.path.join(IMAGES_DIR, req.folder, req.filename)
    print(f"[DEBUG] Procurando arquivo em: {path}")
    if not os.path.exists(path):
        raise HTTPException(404, "Arquivo não encontrado")
    data = open(path, "rb").read()
    print(path)
    try:
        dec = fernet.decrypt(data)
    except:
        raise HTTPException(400, "Falha na descriptografia")
    b64 = base64.b64encode(dec).decode()
    img_array = np.frombuffer(dec, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    cv2.imshow("Imagem Descriptografada", img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    return JSONResponse({"frame": b64})

class DummyUploadFile(UploadFile):
    def __init__(self, file_path: str):
        filename = os.path.basename(file_path)
        with open(file_path, "rb") as f:
            content = f.read()
        file_stream = BytesIO(content)
        super().__init__(filename=filename, file=file_stream)

if __name__ == "__main__":
    json = {
        "folder": "img_statica",
        "filename": "detectado_2025-05-23_08-40-32-765.jpg"
    }
    req = DecryptRequest(**json)
    decrypt_image(req)