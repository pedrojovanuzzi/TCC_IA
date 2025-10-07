import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import numpy as np
from ..database import get_connection
from ..config import CONFIDENCE, MODEL_PATH, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE, ENCRYPTION_KEY
from ultralytics import YOLO
from cryptography.fernet import Fernet
import torch, cv2, json, os, time, base64
from functools import lru_cache
import os, cv2, time, json, base64, asyncio, multiprocessing as mp
from multiprocessing.synchronize import Event as MpEvent

router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

READ_IDLE_TIMEOUT = 20.0   # segundos sem frame -> encerra
QUEUE_MAXSIZE = 2         # evita backlog/latência

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
            # Recebe frame como bytes (Blob vindo do React)
            frame_bytes = await websocket.receive_bytes()
            
            # Decodifica para imagem OpenCV
            img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)

            # Faz a predição
            results = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=0.5, stream=True)
            for res in results:
                for box in res.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls_id = int(box.cls[0])
                    cls_name = model.names[cls_id]
                    conf = float(box.conf[0])
                    color = CORES_CLASSES.get(cls_name, (255, 255, 255))
                    cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
                    draw_label(img, f"{cls_name}:{conf:.2f}", x1, y1, color)

            # Converte imagem processada para JPEG (bytes)
            _, buf = cv2.imencode(".jpg", img)

            # Envia os bytes de volta (não mais base64/JSON)
            await websocket.send_bytes(buf.tobytes())

            # A cada 3s salva a imagem criptografada
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

async def _safe_ws_send_text(ws: WebSocket, payload: dict):
    if ws.application_state == WebSocketState.CONNECTED:
        await ws.send_text(json.dumps(payload))

def capture_proc(ip: str, q: mp.Queue, stop: MpEvent = mp.Event()):
    """Roda em PROCESSO separado. Lê frames e joga na fila."""
    cap = cv2.VideoCapture(ip, cv2.CAP_FFMPEG)

    # Tenta aplicar timeouts nativos (OpenCV >= 4.8/4.9 + FFMPEG build)
    try:
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        # Se sua build suportar:
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)   # 5s para abrir
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)   # 5s por leitura
    except Exception:
        pass

    last_put = 0.0
    try:
        while not stop.is_set():
            ret, frame = cap.read()
            if not ret:
                # pequena espera para evitar tight loop quando o stream cai
                time.sleep(0.05)
                continue

            # Mantém no máx 1-2 itens na fila (drop de frames antigos)
            if q.qsize() >= QUEUE_MAXSIZE:
                try:
                    q.get_nowait()
                except Exception:
                    pass
            try:
                q.put_nowait(frame)
                last_put = time.time()
            except Exception:
                # fila cheia inesperadamente
                time.sleep(0.01)
    finally:
        cap.release()


@router.websocket("/ws/camera/{camera_id}")
async def ws_cam(ws: WebSocket, camera_id: int):
    await ws.accept()

    # Busca IP no banco
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT ip FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        await _safe_ws_send_text(ws, {"erro": "não encontrada"})
        if ws.application_state == WebSocketState.CONNECTED:
            await ws.close()
        return
    ip = row[0]

    model = get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Captura em processo separado
    q: mp.Queue = mp.Queue(maxsize=QUEUE_MAXSIZE)
    stop = mp.Event()
    proc = mp.Process(target=capture_proc, args=(ip, q, stop), daemon=True)
    proc.start()

    last_frame_ts = time.time()
    last_save_ts = 0.0

    try:
        while True:
            try:
                frame = await asyncio.get_running_loop().run_in_executor(
                    None, lambda: q.get(True, 0.5)
                )
                last_frame_ts = time.time()
            except Exception:
                if (time.time() - last_frame_ts) > READ_IDLE_TIMEOUT:
                    await _safe_ws_send_text(ws, {
                        "erro": "timeout_stream",
                        "detalhe": f"Sem frames há {READ_IDLE_TIMEOUT:.0f}s"
                    })
                    break
                continue

            # ---------- INFERÊNCIA ----------
            results = model.predict(
                frame,
                imgsz=IMG_SIZE,
                device=device,
                half=True,
                conf=CONFIDENCE,
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

            # ---------- SAVE CRIPTO a cada 3s ----------
            now = time.time()
            if (now - last_save_ts) >= 3.0:
                os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                filename = f"cam{camera_id}_{time.strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
                path = os.path.join(IMG_REAL_TIME_DIR, filename)
                ok, buf = cv2.imencode(".jpg", frame)
                if ok:
                    encrypted = fernet.encrypt(buf.tobytes())
                    with open(path, "wb") as f:
                        f.write(encrypted)
                last_save_ts = now

            # ---------- ENVIO WS (binário) ----------
            ok, buf = cv2.imencode(".jpg", frame)
            if not ok:
                await asyncio.sleep(0.001)
                continue
            try:
                await ws.send_bytes(buf.tobytes())
            except WebSocketDisconnect:
                break
            await asyncio.sleep(0.001)

    except WebSocketDisconnect:
        pass
    finally:
        try:
            if 'stop' in locals() and stop is not None:
                stop.set()
        except Exception:
            pass

        try:
            if 'proc' in locals() and proc is not None and proc.is_alive():
                proc.terminate()
                proc.join(timeout=1.0)
                if proc.is_alive():
                    try:
                        proc.kill()
                    except Exception:
                        pass
        except Exception:
            pass

        # avisa o front se ainda estiver aberto
        from starlette.websockets import WebSocketState
        if ws.application_state == WebSocketState.CONNECTED:
            try:
                await _safe_ws_send_text(ws, {
                    "erro": "conexao_encerrada",
                    "mensagem": "A conexão com o servidor foi encerrada."
                })
            except Exception:
                pass
            try:
                await ws.close()
            except Exception:
                pass
