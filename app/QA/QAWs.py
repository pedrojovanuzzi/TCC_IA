import asyncio
import base64
import json
import multiprocessing
import os
import sys
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import websockets  # <-- importante

from fastapi.websockets import WebSocketState
import uvicorn
import cv2
import numpy as np
import torch
from ultralytics import YOLO
from cryptography.fernet import Fernet

# Ajuste para importar seus próprios módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.QA.QACsv import draw_label
from app.config import CORES_CLASSES, ENCRYPTION_KEY, IMG_REAL_TIME_DIR, IMG_SIZE, MODEL_PATH

fernet = Fernet(ENCRYPTION_KEY)
app = FastAPI()


async def webcam_client():
    uri = "ws://localhost:3001/ws"
    async with websockets.connect(uri, max_size=None) as ws:
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("❌ Erro ao acessar a webcam.")
            return

        print("🎥 Enviando frames para o servidor...")
        while True:
            ret, frame = cap.read()
            if not ret:
                print("❌ Falha ao capturar frame.")
                break

            # Codifica em JPEG + base64
            _, buffer = cv2.imencode(".jpg", frame)
            b64_frame = base64.b64encode(buffer).decode("utf-8")

            # Envia para o servidor
            await ws.send(json.dumps({ "frame": b64_frame }))

            # Espera resposta do servidor
            resposta = await ws.recv()
            processed = json.loads(resposta)["frame"]

            # Decodifica e mostra
            img_bytes = base64.b64decode(processed)
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            result_frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            cv2.imshow("Frame Processado", result_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()

@app.websocket("/ws")
async def ws_root(websocket: WebSocket):
    await websocket.accept()
    model = YOLO(MODEL_PATH)
    device = "cuda" if torch.cuda.is_available() else "cpu"

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

    except WebSocketDisconnect:
        print("🔌 WebSocket desconectado.")
    finally:
        await websocket.close()

def start_server():
    import uvicorn
    uvicorn.run("QAWs:app", host="0.0.0.0", port=3001, reload=False)


if __name__ == "__main__":

    server_proc = multiprocessing.Process(target=start_server)
    server_proc.start()

    time.sleep(2)  # aguarda o servidor subir

    asyncio.run(webcam_client())

    server_proc.terminate()