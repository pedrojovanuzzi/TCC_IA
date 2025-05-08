from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..database import get_connection
from ..config import MODEL_PATH, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE, ENCRYPTION_KEY
from ultralytics import YOLO
from cryptography.fernet import Fernet
import torch, cv2, json, os, time

router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

@router.websocket("/ws/camera/{camera_id}")
async def ws_cam(ws: WebSocket, camera_id: int):
    await ws.accept()
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT ip FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone(); conn.close()
    if not row:
        await ws.send_text(json.dumps({"erro":"não encontrada"}))
        await ws.close()
        return
    cap = cv2.VideoCapture(row[0])
    if not cap.isOpened():
        await ws.send_text(json.dumps({"erro":"não conectou"}))
        await ws.close()
        return
    model = YOLO(MODEL_PATH)
    last = 0
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            res = model.predict(frame, imgsz=IMG_SIZE, device=dev, half=True)[0]
            for b in res.boxes:
                x1, y1, x2, y2 = map(int, b.xyxy[0])
                name = model.names[int(b.cls[0])]
                col = CORES_CLASSES.get(name, (255,255,255))
                cv2.rectangle(frame, (x1,y1),(x2,y2), col, 1)
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
            encrypted_frame = fernet.encrypt(buf.tobytes())
            await ws.send_text(json.dumps({"frame": encrypted_frame.hex()}))
    except WebSocketDisconnect:
        pass
    finally:
        cap.release()
        await ws.close()
        