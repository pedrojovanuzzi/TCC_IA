from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import numpy as np
from ..database import get_connection
from ..config import MODEL_PATH, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE, ENCRYPTION_KEY
from ultralytics import YOLO
from cryptography.fernet import Fernet
import torch, cv2, json, os, time, base64
from functools import lru_cache

router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

@lru_cache(maxsize=1)
def get_model():
    print("📦 Carregando YOLO...")
    return YOLO(MODEL_PATH)

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
    model = get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    last_saved = 0

    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            data = await websocket.receive_text()
            frame_bytes = base64.b64decode(json.loads(data)["frame"])
            img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)

            results = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=0.5, stream=True)
            for res in results:
                for box in res.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls_id = int(box.cls[0])
                    cls = model.names[int(box.cls[0])]
                    conf = float(box.conf[0])
                    cls_name = model.names[cls_id]
                    color = CORES_CLASSES.get(cls_name, (255, 255, 255))
                    cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
                    draw_label(img, f"{cls}:{conf:.2f}", x1, y1, color)

            _, buf = cv2.imencode(".jpg", img)
            b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
            await websocket.send_text(json.dumps({ "frame": b64 }))

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
    c.execute("SELECT ip FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone(); conn.close()
    if not row:
        await ws.send_text(json.dumps({"erro": "não encontrada"})); await ws.close(); return

    cap = cv2.VideoCapture(row[0])
    if not cap.isOpened():
        await ws.send_text(json.dumps({"erro": "não conectou"})); await ws.close(); return

    model = get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    last = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret: break

            results = model.predict(
                frame,
                imgsz=IMG_SIZE,
                device=device,
                half=True,
                conf=0.1,
                iou=0.4,
                agnostic_nms=True
            )[0]

            for b in results.boxes:
                x1, y1, x2, y2 = map(int, b.xyxy[0])
                cls_id = int(b.cls[0])
                name = model.names[cls_id]
                col = CORES_CLASSES.get(name, (255, 255, 255))
                conf = float(b.conf[0])
                cv2.rectangle(frame, (x1, y1), (x2, y2), col, 1)
                draw_label(frame, f"{name}:{conf:.2f}", x1, y1, col)

            now = time.time()
            if now - last >= 3:
                os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                filename = f"cam{camera_id}_{time.strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
                path = os.path.join(IMG_REAL_TIME_DIR, filename)
                _, buf = cv2.imencode(".jpg", frame)
                encrypted = fernet.encrypt(buf.tobytes())
                with open(path, "wb") as f:
                    f.write(encrypted)
                last = now

            _, buf = cv2.imencode(".jpg", frame)
            frame_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
            await ws.send_text(json.dumps({ "frame": frame_b64 }))

    except WebSocketDisconnect:
        pass
    finally:
        cap.release()
        await ws.close()
