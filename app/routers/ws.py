import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import numpy as np

from app.auth import verificar_token
from app.utils import enviar_email_em_background, verificar_e_enviar_alerta
from ..database import get_connection
from ..config import CONFIDENCE, MODEL_PATH, MODEL_PATH_LONG_DISTANCE, IOU, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE, ENCRYPTION_KEY
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
def get_model(x: int = 0):
    if(x == 1):
        print('Modelo Large')
        return YOLO(MODEL_PATH_LONG_DISTANCE)
    else:
        print('Modelo Medium')
        return YOLO(MODEL_PATH)
    

def draw_label(img, text, x, y, color):
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = IOU
    thickness = 1
    (w, h), _ = cv2.getTextSize(text, font, scale, thickness)
    cv2.rectangle(img, (x, y - h - 4), (x + w + 4, y), color, -1)
    cv2.putText(img, text, (x + 2, y - 2), font, scale, (0, 0, 0), thickness)

@router.websocket("/ws")
async def ws_root(websocket: WebSocket):
    await websocket.accept()

    token = websocket.query_params.get("token")
    print(f"🧩 Token recebido: {token[:40]}..." if token else "❌ Nenhum token recebido")

    if not token:
        print("❌ Nenhum token — fechando socket")
        await websocket.close()
        return
    
    try:
        user = verificar_token(token)  # sua função padrão
        user_id = user["user_id"]
        print(f"✅ Token válido para user_id={user_id}")
    except Exception as e:
        print(f"❌ Erro ao validar token: {e}")
        await websocket.close()
        return

    model = get_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}

    alert_start = None
    last_email_sent_at = 0.0
    duracao_limite = 5.0
    cooldown_envio = 10.0
    tempo_seguro_inicio = None
    tempo_limite_seguro = 0

    # controle de persistência periódica
    ultimo_persist = time.time()
    intervalo_segundos = 10.0  # salvar a cada 10s

    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            frame_bytes = await websocket.receive_bytes()
            img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)

            results = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
            classes_detectadas = {results.names[int(b.cls[0])] for b in results.boxes}
            classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}

            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_id = int(box.cls[0])
                cls_name = results.names[cls_id]
                conf = float(box.conf[0])
                color = CORES_CLASSES.get(cls_name, (255, 255, 255))
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
                draw_label(img, f"{cls_name}:{conf:.2f}", x1, y1, color)

            agora = time.time()

            # envio de alertas
            if classes_perigosas:
                tempo_seguro_inicio = None
                if alert_start is None:
                    alert_start = agora
                tempo_risco = agora - alert_start
                pode_enviar_primeiro = (tempo_risco >= duracao_limite)
                pode_reenviar = (last_email_sent_at == 0.0) or ((agora - last_email_sent_at) >= cooldown_envio)
                if pode_enviar_primeiro and pode_reenviar:
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                    alert_path = os.path.join(IMG_REAL_TIME_DIR, f"alerta_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg")
                    ok, buf = cv2.imencode(".jpg", img)
                    if ok:
                        with open(alert_path, "wb") as f:
                            f.write(fernet.encrypt(buf.tobytes()))
                        try:
                            enviar_email_em_background(results, alert_path)
                            last_email_sent_at = agora
                            await _safe_ws_send_text(websocket, {
                                "alerta": True,
                                "mensagem": f"🚨 Alerta detectado ({', '.join(classes_perigosas)}). E-mail enviado!"
                            })
                        except Exception as e:
                            print("❌ Falha ao enviar e-mail de alerta:", e)
            else:
                alert_start = None
                if tempo_seguro_inicio is None:
                    tempo_seguro_inicio = agora
                elif (agora - tempo_seguro_inicio) >= tempo_limite_seguro:
                    last_email_sent_at = 0.0
                    tempo_seguro_inicio = None
                    await _safe_ws_send_text(websocket, {
                        "alerta": False,
                        "mensagem": "✅ Situação normalizada."
                    })

            # 🔸 persistência no banco a cada 10s
            if (agora - ultimo_persist) >= intervalo_segundos:
                try:
                    # salva snapshot criptografado para registrar image_name/path
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                    snap_name = f"ws_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg"
                    snap_path = os.path.join(IMG_REAL_TIME_DIR, snap_name)
                    ok, buf = cv2.imencode(".jpg", img)
                    if ok:
                        with open(snap_path, "wb") as f:
                            f.write(fernet.encrypt(buf.tobytes()))

                        # insere TODAS as detecções do frame no banco
                        conn = get_connection()
                        cur = conn.cursor()
                        dados = []
                        for box in results.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            cls_name = results.names[int(box.cls[0])]
                            conf = float(box.conf[0])
                            dados.append((
                                user_id,
                                snap_name,
                                snap_path,
                                cls_name,
                                conf,
                                x1, y1, x2, y2,
                                device,
                                "YOLO"
                            ))

                        if dados:
                            cur.executemany("""
                                INSERT INTO detections
                                (user_id, image_name, image_path, class_name, confidence, x1, y1, x2, y2, device, model_name)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, dados)
                            conn.commit()
                        cur.close()
                        conn.close()

                    ultimo_persist = agora
                except Exception as e:
                    # não derruba o WS por falha ao persistir
                    print("❌ Falha ao persistir detecções (WS):", e)

            # retorna frame processado
            ok, buf = cv2.imencode(".jpg", img)
            if ok:
                await websocket.send_bytes(buf.tobytes())

            await asyncio.sleep(0.02)

    except WebSocketDisconnect:
        print("🔌 WebSocket desconectado.")
    finally:
        if websocket.application_state == WebSocketState.CONNECTED:
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

    # 🔍 Busca IP da câmera
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT ip FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone()
    conn.close()

    if not row:
        await _safe_ws_send_text(ws, {"erro": "Câmera não encontrada"})
        await ws.close()
        return

    ip = row[0]
    model = get_model(1)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # 🎥 Captura em processo separado
    q: mp.Queue = mp.Queue(maxsize=QUEUE_MAXSIZE)
    stop = mp.Event()
    proc = mp.Process(target=capture_proc, args=(ip, q, stop), daemon=True)
    proc.start()

    last_frame_ts = time.time()
    last_save_ts = 0.0
    last_db_ts = 0.0  # 💾 controle de gravação no banco
    intervalo_db = 10.0  # segundos entre gravações

    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}
    alert_start = None
    alerta_enviado = False
    duracao_limite = 5.0

    try:
        while True:
            try:
                frame = await asyncio.get_running_loop().run_in_executor(None, lambda: q.get(True, 0.5))
                last_frame_ts = time.time()
            except Exception:
                if (time.time() - last_frame_ts) > READ_IDLE_TIMEOUT:
                    await _safe_ws_send_text(ws, {"erro": "timeout_stream"})
                    break
                continue

            # ---------- INFERÊNCIA ----------
            results = model.predict(
                frame, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE, iou=IOU, agnostic_nms=True
            )[0]
            classes_detectadas = {results.names[int(b.cls[0])] for b in results.boxes}
            classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}

            # ---------- DESENHA ----------
            for b in results.boxes:
                x1, y1, x2, y2 = map(int, b.xyxy[0])
                cls_id = int(b.cls[0])
                name = model.names[cls_id]
                col = CORES_CLASSES.get(name, (255, 255, 255))
                conf = float(b.conf[0])
                cv2.rectangle(frame, (x1, y1), (x2, y2), col, 1)
                draw_label(frame, f"{name}:{conf:.2f}", x1, y1, col)

            # ---------- ALERTA PERSISTENTE ----------
            if classes_perigosas:
                if alert_start is None:
                    alert_start = time.time()
                elif (time.time() - alert_start) >= duracao_limite and not alerta_enviado:
                    alerta_enviado = True
                    print(f"🚨 Alerta persistente na câmera {camera_id}: {classes_perigosas}")
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                    filename = f"alerta_cam{camera_id}_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg"
                    path = os.path.join(IMG_REAL_TIME_DIR, filename)
                    ok, buf = cv2.imencode(".jpg", frame)
                    if ok:
                        with open(path, "wb") as f:
                            f.write(fernet.encrypt(buf.tobytes()))
                        enviar_email_em_background(results, path)
                        await _safe_ws_send_text(ws, {
                            "alerta": True,
                            "mensagem": f"🚨 Alerta da câmera {camera_id} ({', '.join(classes_perigosas)}). E-mail enviado!"
                        })
            else:
                alert_start = None
                alerta_enviado = False

            # ---------- SALVA FRAME CRIPTOGRAFADO A CADA 3s ----------
            now = time.time()
            if (now - last_save_ts) >= 3.0:
                os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                filename = f"cam{camera_id}_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg"
                path = os.path.join(IMG_REAL_TIME_DIR, filename)
                ok, buf = cv2.imencode(".jpg", frame)
                if ok:
                    with open(path, "wb") as f:
                        f.write(fernet.encrypt(buf.tobytes()))
                last_save_ts = now

            # ---------- 💾 SALVA DETECÇÕES NO BANCO A CADA 10s ----------
            if (now - last_db_ts) >= intervalo_db:
                try:
                    conn = get_connection()
                    cur = conn.cursor()
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)
                    filename_db = f"det_cam{camera_id}_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg"
                    path_db = os.path.join(IMG_REAL_TIME_DIR, filename_db)
                    ok, buf = cv2.imencode(".jpg", frame)
                    if ok:
                        with open(path_db, "wb") as f:
                            f.write(fernet.encrypt(buf.tobytes()))
                        for b in results.boxes:
                            x1, y1, x2, y2 = map(int, b.xyxy[0])
                            cls_name = results.names[int(b.cls[0])]
                            conf = float(b.conf[0])
                            cur.execute("""
                                INSERT INTO detections
                                (user_id, image_name, image_path, class_name, confidence, x1, y1, x2, y2, device, model_name)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                1,  # ou associe a user_id real
                                filename_db,
                                path_db,
                                cls_name,
                                conf,
                                x1, y1, x2, y2,
                                device,
                                "YOLO"
                            ))
                        conn.commit()
                    cur.close()
                    conn.close()
                    last_db_ts = now
                    print(f"💾 Detecções da câmera {camera_id} salvas no banco.")
                except Exception as e:
                    print(f"❌ Erro ao salvar detecções no banco: {e}")

            # ---------- ENVIA FRAME ----------
            ok, buf = cv2.imencode(".jpg", frame)
            if ok:
                await ws.send_bytes(buf.tobytes())

            await asyncio.sleep(0.02)

    except WebSocketDisconnect:
        print(f"🔌 Câmera {camera_id}: conexão encerrada.")
    finally:
        if stop:
            stop.set()
        if proc and proc.is_alive():
            proc.terminate()
            proc.join(timeout=1.0)
        if ws.application_state == WebSocketState.CONNECTED:
            await _safe_ws_send_text(ws, {"erro": "conexao_encerrada"})
            await ws.close()