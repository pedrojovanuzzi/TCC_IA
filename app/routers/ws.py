import asyncio  # utilitários assíncronos
from datetime import datetime  # datas/horas para timestamps
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect  # roteador e tipos de WebSocket
from fastapi.websockets import WebSocketState  # enum de estados do WebSocket
import numpy as np  # arrays (para decodificar imagem)

from app.auth import verificar_token  # valida token JWT (versão app.auth)
from app.utils import enviar_email_em_background, verificar_e_enviar_alerta  # e-mail/alerta utilitários
from ..database import get_connection  # conexão com banco (import relativo)
from ..config import CONFIDENCE, MODEL_PATH, MODEL_PATH_LONG_DISTANCE, IOU, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE, ENCRYPTION_KEY  # configs do modelo e paths
from ultralytics import YOLO  # modelo YOLO
from cryptography.fernet import Fernet  # criptografia simétrica (Fernet)
import torch, cv2, json, os, time, base64  # GPU/visão/JSON/SO/tempo/Base64
from functools import lru_cache  # cache de função (memoization)
import os, cv2, time, json, base64, asyncio, multiprocessing as mp  # imports redundantes conforme original
from multiprocessing.synchronize import Event as MpEvent  # tipo Event do multiprocessing

router = APIRouter()  # instancia roteador FastAPI
fernet = Fernet(ENCRYPTION_KEY)  # inicializa cifrador com chave

READ_IDLE_TIMEOUT = 20.0   # segundos sem frame -> encerra  # timeout de leitura
QUEUE_MAXSIZE = 2         # evita backlog/latência  # tamanho máximo da fila

@lru_cache(maxsize=1)  # mantém instância do modelo em cache
def get_model(x: int = 0):  # seleciona pesos conforme x
    if(x == 1):  # usa modelo de longa distância
        print('Modelo Large')  # log
        return YOLO(MODEL_PATH_LONG_DISTANCE)  # carrega pesos long distance
    else:  # caso padrão
        print('Modelo Medium')  # log
        return YOLO(MODEL_PATH)  # carrega pesos medium
    

def draw_label(img, text, x, y, color):  # desenha fundo e texto no frame
    font = cv2.FONT_HERSHEY_SIMPLEX  # fonte do texto
    scale = IOU  # escala do texto (reutiliza IOU)
    thickness = 1  # espessura do texto
    (w, h), _ = cv2.getTextSize(text, font, scale, thickness)  # mede texto
    cv2.rectangle(img, (x, y - h - 4), (x + w + 4, y), color, -1)  # retângulo de fundo
    cv2.putText(img, text, (x + 2, y - 2), font, scale, (0, 0, 0), thickness)  # escreve texto

@router.websocket("/ws")  # endpoint WS para frames base64
async def ws_root(websocket: WebSocket):  # handler do websocket
    await websocket.accept()  # aceita conexão

    # 🔐 Autenticação via token
    token = websocket.query_params.get("token")  # lê token da querystring
    if not token:  # sem token
        await websocket.close()  # fecha WS
        return  # encerra
    
    try:
        user = verificar_token(token)  # valida token e extrai payload
        user_id = user["user_id"]  # id do usuário autenticado
        print(f"✅ WebSocket autenticado: user_id={user_id}")  # log
    except Exception as e:
        print(f"❌ Erro ao validar token: {e}")  # log erro
        await websocket.close()  # fecha WS
        return  # encerra

    # 🔧 Configuração do modelo
    model = get_model()  # obtém modelo em cache
    device = "cuda" if torch.cuda.is_available() else "cpu"  # escolhe GPU/CPU
    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}  # classes seguras

    # ⏱️ Controle de alerta e gravação
    alert_start = None  # início do risco
    last_email_sent_at = 0.0  # último envio de e-mail
    duracao_limite = 5.0  # risco contínuo mínimo
    cooldown_envio = 10.0  # intervalo entre e-mails
    tempo_seguro_inicio = None  # início de período seguro
    tempo_limite_seguro = 0  # janela para normalização
    ultimo_persist = time.time()  # controle de persistência
    intervalo_segundos = 10.0  # Salvar a cada 10 segundos  # período de persistência

    try:
        while websocket.client_state == WebSocketState.CONNECTED:  # loop enquanto conectado
             # 📦 Recebe o pacote JSON enviado do frontend
            message = await websocket.receive_text()  # lê string JSON

            # Converte o texto em dicionário
            data = json.loads(message)  # parse JSON

            # Extrai o nome da câmera e o frame
            camera_name = data.get("camera_name", "cam_desconhecida")  # nome da câmera
            frame_b64 = data.get("frame")  # frame em base64

            # ❗ Se não houver frame, ignora este ciclo
            if not frame_b64:  # sem frame
                continue  # próximo loop

            # 🔄 Decodifica imagem Base64 → bytes → OpenCV Mat
            frame_bytes = base64.b64decode(frame_b64)  # base64 -> bytes
            img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)  # bytes -> imagem

            # 🎯 YOLO detecta objetos
            results = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]  # inferência
            classes_detectadas = {results.names[int(b.cls[0])] for b in results.boxes}  # classes no frame
            classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}  # não seguras

            # 🔲 Desenha boxes na imagem
            for box in results.boxes:  # itera detecções
                x1, y1, x2, y2 = map(int, box.xyxy[0])  # bbox
                cls_id = int(box.cls[0])  # id da classe
                cls_name = results.names[cls_id]  # nome da classe
                conf = float(box.conf[0])  # confiança
                color = CORES_CLASSES.get(cls_name, (255, 255, 255))  # cor por classe
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)  # desenha box
                draw_label(img, f"{cls_name}:{conf:.2f}", x1, y1, color)  # escreve rótulo

            agora = time.time()  # timestamp atual

            # ⚠️ Controle de alertas persistentes
            if classes_perigosas:  # se há risco
                tempo_seguro_inicio = None  # reseta seguro
                if alert_start is None:  # inicia medição
                    alert_start = agora  # marca início
                tempo_risco = agora - alert_start  # duração do risco
                pode_enviar_primeiro = tempo_risco >= duracao_limite  # passou limiar?
                pode_reenviar = (last_email_sent_at == 0.0) or ((agora - last_email_sent_at) >= cooldown_envio)  # cooldown
                if pode_enviar_primeiro and pode_reenviar:  # envia alerta
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)  # garante pasta
                    alert_path = os.path.join(IMG_REAL_TIME_DIR, f"alerta_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg")  # nomeia arquivo
                    ok, buf = cv2.imencode(".jpg", img)  # codifica JPEG
                    if ok:  # sucesso
                        with open(alert_path, "wb") as f:  # abre arquivo
                            f.write(fernet.encrypt(buf.tobytes()))  # grava cifrado
                        try:
                            enviar_email_em_background(results, alert_path)  # e-mail em background
                            last_email_sent_at = agora  # atualiza cooldown
                            await _safe_ws_send_text(websocket, {  # notifica cliente
                                "alerta": True,
                                "mensagem": f"🚨 Alerta detectado ({', '.join(classes_perigosas)})"
                            })  # fim payload
                        except Exception as e:
                            print("❌ Falha ao enviar e-mail de alerta:", e)  # log erro
            else:  # sem risco
                alert_start = None  # reseta medição
                if tempo_seguro_inicio is None:  # inicia seguro
                    tempo_seguro_inicio = agora  # marca início
                elif (agora - tempo_seguro_inicio) >= tempo_limite_seguro:  # já normalizou
                    last_email_sent_at = 0.0  # zera cooldown
                    tempo_seguro_inicio = None  # reseta
                    await _safe_ws_send_text(websocket, {  # avisa normalização
                        "alerta": False,
                        "mensagem": "✅ Situação normalizada"
                    })  # fim payload

            # 💾 Grava todas as detecções a cada 10 s
            if (agora - ultimo_persist) >= intervalo_segundos:  # checa janela
                try:
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)  # garante pasta
                    snap_name = f"ws_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg"  # nome snapshot
                    snap_path = os.path.join(IMG_REAL_TIME_DIR, snap_name)  # caminho snapshot

                    ok, buf = cv2.imencode(".jpg", img)  # codifica JPEG
                    if ok:  # sucesso
                        with open(snap_path, "wb") as f:  # abre arquivo
                            f.write(fernet.encrypt(buf.tobytes()))  # grava cifrado

                        conn = get_connection()  # abre conexão BD
                        cur = conn.cursor()  # cria cursor

                        # 🔹 Cria um registro para cada detecção do frame atual
                        for box in sorted(results.boxes, key=lambda b: float(b.conf[0]), reverse=True):  # ordena por conf
                            x1, y1, x2, y2 = map(int, box.xyxy[0])  # bbox
                            cls_name = results.names[int(box.cls[0])]  # classe
                            conf = float(box.conf[0])  # confiança
                            cur.execute("""  # insere detecção
                            INSERT INTO detections
                            (user_id, image_name, image_path, class_name, confidence, x1, y1, x2, y2, device, model_name, camera_name)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            user_id,          # ID do usuário logado (via token)  # parâmetro
                            snap_name,        # nome da imagem (ex: ws_2025-10-13_12-00-00.jpg)  # parâmetro
                            snap_path,        # caminho criptografado  # parâmetro
                            cls_name,         # classe detectada (ex: helmet)  # parâmetro
                            conf,             # confiança da detecção  # parâmetro
                            x1, y1, x2, y2,   # coordenadas do objeto detectado  # parâmetro
                            device,           # CPU ou GPU usada  # parâmetro
                            "YOLO",           # modelo  # parâmetro
                            camera_name     # 🔸 nome da câmera ("cam_ws", por exemplo)  # parâmetro
                        ))  # fim execute

                        conn.commit()  # commit
                        cur.close()  # fecha cursor
                        conn.close()  # fecha conexão

                        print(f"💾 {len(results.boxes)} detecções salvas ({snap_name})")  # log persistência

                    ultimo_persist = agora  # atualiza marcador
                except Exception as e:
                    print(f"❌ Erro ao salvar detecções: {e}")  # log erro

            # 🔁 Envia frame processado de volta
            ok, buf = cv2.imencode(".jpg", img)  # codifica imagem
            if ok:  # sucesso
                await websocket.send_bytes(buf.tobytes())  # envia bytes JPEG

            await asyncio.sleep(0.02)  # pequena pausa (limita CPU)

    except WebSocketDisconnect:
        print("🔌 WebSocket desconectado.")  # log desconexão
    finally:
        if websocket.application_state == WebSocketState.CONNECTED:  # se ainda conectado
            await websocket.close()  # fecha WS



async def _safe_ws_send_text(ws: WebSocket, payload: dict):  # envia texto ao WS se conectado
    if ws.application_state == WebSocketState.CONNECTED:  # verifica estado
        await ws.send_text(json.dumps(payload))  # envia JSON como texto

def capture_proc(ip: str, q: mp.Queue, stop: MpEvent = mp.Event()):  # processo separado para capturar frames
    """Roda em PROCESSO separado. Lê frames e joga na fila."""  # docstring da função
    cap = cv2.VideoCapture(ip, cv2.CAP_FFMPEG)  # abre stream com backend FFMPEG

    # Tenta aplicar timeouts nativos (OpenCV >= 4.8/4.9 + FFMPEG build)
    try:
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # reduz buffer interno
        # Se sua build suportar:
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)   # 5s para abrir  # timeout de abertura
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)   # 5s por leitura  # timeout de leitura
    except Exception:
        pass  # ignora se não suportado

    last_put = 0.0  # último envio à fila
    try:
        while not stop.is_set():  # roda até sinal de parada
            ret, frame = cap.read()  # lê frame da câmera
            if not ret:  # falha/queda do stream
                # pequena espera para evitar tight loop quando o stream cai
                time.sleep(0.05)  # dorme 50ms
                continue  # tenta de novo

            # Mantém no máx 1-2 itens na fila (drop de frames antigos)
            if q.qsize() >= QUEUE_MAXSIZE:  # fila cheia
                try:
                    q.get_nowait()  # descarta o mais antigo
                except Exception:
                    pass  # ignora falha
            try:
                q.put_nowait(frame)  # insere frame atual
                last_put = time.time()  # atualiza timestamp
            except Exception:
                # fila cheia inesperadamente
                time.sleep(0.01)  # espera 10ms e tenta novamente
    finally:
        cap.release()  # libera recursos de captura


@router.websocket("/ws/camera/{camera_id}")  # endpoint WS por câmera cadastrada
async def ws_cam(ws: WebSocket, camera_id: int):  # handler de WS da câmera
    await ws.accept()  # aceita conexão

    # 🔒 Token via query string
    token = ws.query_params.get("token")  # obtém token
    if not token:  # sem token
        print("❌ Nenhum token recebido.")  # log
        await ws.close()  # fecha WS
        return  # encerra

    # ✅ Verifica o token manualmente
    try:
        user = verificar_token(token)  # valida token
        user_id = user["user_id"]  # id do usuário
        print(f"🔑 Token válido — user_id={user_id}")  # log
    except Exception as e:
        print(f"❌ Token inválido: {e}")  # log erro
        await ws.close()  # fecha WS
        return  # encerra

    # 🔍 Busca IP e nome da câmera
    conn = get_connection()  # abre conexão
    c = conn.cursor()  # cursor
    c.execute("SELECT ip, name FROM cameras WHERE id=%s", (camera_id,))  # consulta câmera
    row = c.fetchone()  # obtém resultado
    conn.close()  # fecha conexão

    if not row:  # câmera não encontrada
        await _safe_ws_send_text(ws, {"erro": "Câmera não encontrada"})  # notifica
        await ws.close()  # fecha WS
        return  # encerra

    ip, camera_name = row  # IP e nome da câmera

    model = get_model(1)  # usa modelo long distance
    device = "cuda" if torch.cuda.is_available() else "cpu"  # escolhe dispositivo

    # 🎥 Captura em processo separado
    q: mp.Queue = mp.Queue(maxsize=QUEUE_MAXSIZE)  # fila de frames
    stop = mp.Event()  # evento de parada
    proc = mp.Process(target=capture_proc, args=(ip, q, stop), daemon=True)  # processo de captura
    proc.start()  # inicia processo

    last_frame_ts = time.time()  # tempo do último frame
    last_save_ts = 0.0  # não usado explicitamente (mantido)
    last_db_ts = 0.0  # último commit no BD
    intervalo_db = 10.0  # segundos entre gravações  # período de persistência

    # Configuração de segurança e alerta
    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}  # EPIs válidos
    alert_start = None  # início do risco contínuo
    alerta_enviado = False  # previne reenvios
    duracao_limite = 5.0  # segundos de risco contínuo  # limiar

    try:
        while True:  # loop principal
            try:
                frame = await asyncio.get_running_loop().run_in_executor(None, lambda: q.get(True, 0.5))  # busca da fila
                last_frame_ts = time.time()  # atualiza heartbeat
            except Exception:
                if (time.time() - last_frame_ts) > READ_IDLE_TIMEOUT:  # sem frames por muito tempo
                    await _safe_ws_send_text(ws, {"erro": "timeout_stream"})  # informa timeout
                    break  # encerra loop
                continue  # tenta novamente

            # ---------- INFERÊNCIA ----------
            results = model.predict(  # roda YOLO
                frame, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE, iou=IOU, agnostic_nms=True
            )[0]  # primeiro resultado
            classes_detectadas = {results.names[int(b.cls[0])] for b in results.boxes}  # classes detectadas
            classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}  # não seguras

            # ---------- DESENHA ----------
            for b in results.boxes:  # itera boxes
                x1, y1, x2, y2 = map(int, b.xyxy[0])  # bbox
                cls_id = int(b.cls[0])  # id da classe
                name = model.names[cls_id]  # nome da classe
                col = CORES_CLASSES.get(name, (255, 255, 255))  # cor por classe
                conf = float(b.conf[0])  # confiança
                cv2.rectangle(frame, (x1, y1), (x2, y2), col, 1)  # desenha retângulo
                draw_label(frame, f"{name}:{conf:.2f}", x1, y1, col)  # escreve rótulo

            # ---------- ALERTA PERSISTENTE ----------
            if classes_perigosas:  # se há risco
                if alert_start is None:  # inicia contagem
                    alert_start = time.time()  # marca início
                elif (time.time() - alert_start) >= duracao_limite and not alerta_enviado:  # risco persistiu
                    alerta_enviado = True  # evita reenvio imediato
                    print(f"🚨 Alerta persistente na câmera {camera_name} ({camera_id}): {classes_perigosas}")  # log
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)  # garante pasta
                    filename = f"alerta_cam{camera_id}_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg"  # nome do arquivo
                    path = os.path.join(IMG_REAL_TIME_DIR, filename)  # caminho final
                    ok, buf = cv2.imencode(".jpg", frame)  # codifica JPEG
                    if ok:  # sucesso
                        with open(path, "wb") as f:  # abre arquivo
                            f.write(fernet.encrypt(buf.tobytes()))  # grava cifrado
                        # 📧 Envia e-mail em background
                        enviar_email_em_background(results, path)  # dispara e-mail
                        await _safe_ws_send_text(ws, {  # notifica cliente
                            "alerta": True,
                            "mensagem": f"🚨 Alerta da câmera {camera_name} ({', '.join(classes_perigosas)}). E-mail enviado!"
                        })  # fim payload
            else:  # sem risco
                alert_start = None  # reseta contagem
                alerta_enviado = False  # libera próximo envio

            # ---------- 💾 SALVA DETECÇÕES NO BANCO A CADA 10s ----------
            now = time.time()  # tempo atual
            if (now - last_db_ts) >= intervalo_db:  # janela atingida
                try:
                    conn = get_connection()  # abre conexão BD
                    cur = conn.cursor()  # cursor
                    os.makedirs(IMG_REAL_TIME_DIR, exist_ok=True)  # garante pasta
                    filename_db = f"det_cam{camera_id}_{datetime.now():%Y-%m-%d_%H-%M-%S}.jpg"  # nome snapshot
                    path_db = os.path.join(IMG_REAL_TIME_DIR, filename_db)  # caminho
                    ok, buf = cv2.imencode(".jpg", frame)  # codifica JPEG
                    if ok:  # sucesso
                        with open(path_db, "wb") as f:  # abre arquivo
                            f.write(fernet.encrypt(buf.tobytes()))  # grava cifrado

                        for b in results.boxes:  # insere cada detecção
                            x1, y1, x2, y2 = map(int, b.xyxy[0])  # bbox
                            cls_name = results.names[int(b.cls[0])]  # classe
                            conf = float(b.conf[0])  # confiança
                            cur.execute("""  # insert SQL
                                INSERT INTO detections
                                (user_id, image_name, image_path, class_name, confidence,
                                 x1, y1, x2, y2, device, model_name, camera_name)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                user_id,           # ✅ vem do token  # parâmetro
                                filename_db,       # nome do arquivo  # parâmetro
                                path_db,           # caminho  # parâmetro
                                cls_name,          # classe  # parâmetro
                                conf,              # confiança  # parâmetro
                                x1, y1, x2, y2,    # bbox  # parâmetro
                                device,            # cpu/cuda  # parâmetro
                                "YOLO",            # modelo  # parâmetro
                                camera_name        # nome da câmera  # parâmetro
                            ))  # fim execute
                        conn.commit()  # commit
                    cur.close()  # fecha cursor
                    conn.close()  # fecha conexão
                    last_db_ts = now  # atualiza janela
                    print(f"💾 Detecções da câmera {camera_name} salvas no banco.")  # log
                except Exception as e:
                    print(f"❌ Erro ao salvar detecções no banco: {e}")  # log erro

            # ---------- ENVIA FRAME ----------
            ok, buf = cv2.imencode(".jpg", frame)  # codifica frame
            if ok:  # sucesso
                await ws.send_bytes(buf.tobytes())  # envia bytes JPEG

            await asyncio.sleep(0.02)  # pequena pausa

    except WebSocketDisconnect:
        print(f"🔌 Câmera {camera_id}: conexão encerrada.")  # log desconexão
    finally:
        if stop:  # se evento existe
            stop.set()  # sinaliza parada ao processo
        if proc and proc.is_alive():  # se processo ativo
            proc.terminate()  # encerra processo
            proc.join(timeout=1.0)  # aguarda término
        if ws.application_state == WebSocketState.CONNECTED:  # se ainda conectado
            await _safe_ws_send_text(ws, {"erro": "conexao_encerrada"})  # avisa cliente
            await ws.close()  # fecha WS
