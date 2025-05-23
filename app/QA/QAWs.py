import base64
import json
import os
import sys
import time
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import cv2
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import numpy as np
import torch
from ultralytics import YOLO
from cryptography.fernet import Fernet

from app.QA.QACsv import draw_label
from app.config import CORES_CLASSES, ENCRYPTION_KEY, IMG_REAL_TIME_DIR, IMG_SIZE, MODEL_PATH



fernet = Fernet(ENCRYPTION_KEY)


async def ws_root(websocket: WebSocket):
    await websocket.accept()
    model = YOLO(MODEL_PATH)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    last_saved = 0  # controle de tempo

    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            data = await websocket.receive_text()
            frame_bytes = base64.b64decode(json.loads(data)["frame"])
            img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)

            # Processa com o YOLO
            results = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=0.5, stream=True)
            for res in results:
                for box in res.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls_id = int(box.cls[0])
                    cls_name = model.names[cls_id]
                    color = CORES_CLASSES.get(cls_name, (255, 255, 255))
                    cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
                    draw_label(img, cls_name, x1, y1, color)

            # Cria imagem final codificada
            _, buf = cv2.imencode(".jpg", img)
            b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

            # Envia para o frontend
            await websocket.send_text(json.dumps({ "frame": b64 }))

            # Salva a cada 3 segundos
            now = time.time()
            if now - last_saved >= 3:
                try:
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                    filename = f"webcam_{time.strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
                    path = os.path.join(IMG_REAL_TIME_DIR, filename)
                    encrypted = fernet.encrypt(buf.tobytes())
                    with open(path, "wb") as f:
                        f.write(encrypted)
                    print(f"✅ Imagem da webcam salva: {path}")
                    last_saved = now
                except Exception as e:
                    print("❌ Erro ao salvar imagem da webcam:", e)

    except WebSocketDisconnect:
        print("🔌 WebSocket desconectado.")
    finally:
        await websocket.close()

if __name__ == "__main__":
    ws_root()