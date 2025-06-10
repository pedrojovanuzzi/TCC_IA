from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import numpy as np
from ..database import get_connection
from ..config import MODEL_PATH, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE, ENCRYPTION_KEY
from ultralytics import YOLO
from cryptography.fernet import Fernet
import torch, cv2, json, os, time, base64

router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

def draw_label(img, text, x, y, color):
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.4
    thickness = 1
    (w, h), _ = cv2.getTextSize(text, font, scale, thickness)
    cv2.rectangle(img, (x, y - h - 4), (x + w + 4, y), color, -1)
    cv2.putText(img, text, (x + 2, y - 2), font, scale, (0, 0, 0), thickness)

@router.websocket("/ws")
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


@router.websocket("/ws/camera/{camera_id}")
async def ws_cam(ws: WebSocket, camera_id: int):
    await ws.accept()
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT ip FROM cameras WHERE id=%s", (camera_id,)); row = c.fetchone(); conn.close()
    if not row:
        await ws.send_text(json.dumps({"erro":"não encontrada"})); await ws.close(); return
    cap = cv2.VideoCapture(row[0])
    if not cap.isOpened():
        await ws.send_text(json.dumps({"erro":"não conectou"})); await ws.close(); return
    model = YOLO(MODEL_PATH)
    last = 0
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        while True:

            ret, frame = cap.read()
            if not ret: break
            res = model.predict(frame, imgsz=IMG_SIZE, device=dev, half=True)[0]
            for b in res.boxes:
                x1,y1,x2,y2 = map(int, b.xyxy[0])
                name = model.names[int(b.cls[0])]
                col = CORES_CLASSES.get(name,(255,255,255))
                conf = float(b.conf[0])
                cv2.rectangle(frame,(x1,y1),(x2,y2),col,1)
                draw_label(frame, f"{name}:{conf:.2f}", x1, y1, col)

            now = time.time()
            if now - last >= 3:
                os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                fn = f"cam{camera_id}_{time.strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
                path = os.path.join(IMG_REAL_TIME_DIR, fn)
                _, buf = cv2.imencode(".jpg", frame)
                encrypted = fernet.encrypt(buf.tobytes())
                with open(path, "wb") as f:
                    f.write(encrypted)
                last = now

            _, buf = cv2.imencode(".jpg", frame)
            frame_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
            await ws.send_text(json.dumps({"frame": frame_b64}))
    except WebSocketDisconnect:
        pass
    finally:
        cap.release()
        await ws.close()

