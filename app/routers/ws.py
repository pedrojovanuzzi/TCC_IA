import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import numpy as np
from ..database import get_connection
from ..config import MODEL_PATH, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE, ENCRYPTION_KEY
from ultralytics import YOLO
from cryptography.fernet import Fernet
import torch, cv2, json, os, time, base64
from functools import lru_cache
import os, cv2, time, json, base64, asyncio, multiprocessing as mp
from multiprocessing.synchronize import Event as MpEvent

router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

READ_IDLE_TIMEOUT = 8.0   # segundos sem frame -> encerra
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

    # Busca IP no banco e fecha conexão imediatamente (evita lock prolongado)
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT ip FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone()
    conn.close()  # <--- fecha já aqui
    if not row:
        await _safe_ws_send_text(ws, {"erro": "não encontrada"})
        if ws.application_state == WebSocketState.CONNECTED:
            await ws.close()
        return
    ip = row[0]

    # Prepara modelo fora da captura
    model = get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Cria fila/processo de captura
    q: mp.Queue = mp.Queue(maxsize=QUEUE_MAXSIZE)
    stop = mp.Event()
    proc = mp.Process(target=capture_proc, args=(ip, q, stop), daemon=True)
    proc.start()

    last_frame_ts = time.time()
    last_save_ts = 0.0

    try:
        while True:
            # espera por um frame com timeout (não bloqueia seu servidor)
            try:
                frame = await asyncio.get_running_loop().run_in_executor(
                    None, lambda: q.get(True, 0.5)  # 500ms timeout por poll
                )
                last_frame_ts = time.time()
            except Exception:
                # Sem novo frame no período de poll; verifica timeout total
                if (time.time() - last_frame_ts) > READ_IDLE_TIMEOUT:
                    await _safe_ws_send_text(ws, {
                        "erro": "timeout_stream",
                        "detalhe": f"Sem frames há {READ_IDLE_TIMEOUT:.0f}s"
                    })
                    break
                # segue tentando
                continue

            # ---------- INFERÊNCIA ----------
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

            # ---------- ENVIO WS ----------
            ok, buf = cv2.imencode(".jpg", frame)
            if not ok:
                await asyncio.sleep(0.001)
                continue
            frame_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
            try:
                await _safe_ws_send_text(ws, {"frame": frame_b64})
            except WebSocketDisconnect:
                break
            await asyncio.sleep(0.001)

    except WebSocketDisconnect:
        pass
    finally:
    # 1) Para o processo de captura (se existir)
        try:
            if 'stop' in locals() and stop is not None:
                stop.set()
        except Exception:
            pass

    try:
        if 'proc' in locals() and proc is not None and proc.is_alive():
            proc.terminate()
            proc.join(timeout=1.0)
            # Se ainda estiver vivo, tenta matar de vez
            if proc.is_alive():
                try:
                    proc.kill()  # Python 3.7+; no Windows funciona
                except Exception:
                    pass
    except Exception:
        pass

    # 2) Se o WS ainda estiver conectado, avisa o front e fecha
    from starlette.websockets import WebSocketState
    if ws.application_state == WebSocketState.CONNECTED:
        try:
            await ws.send_text(json.dumps({
                "erro": "conexao_encerrada",
                "mensagem": "A conexão com o servidor foi encerrada."
            }))
        except Exception:
            pass
        try:
            await ws.close()
        except Exception:
            pass
