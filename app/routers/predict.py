import io
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from starlette.responses import JSONResponse
from ..config import MODEL_PATH, CONFIDENCE, IMG_SIZE, IMG_STATIC_DIR, IMG_CATRACA, VIDEO_DIR, CORES_CLASSES, ENCRYPTION_KEY
from ..database import get_connection
from ..utils import enviar_email_em_background, log_operation, verificar_e_enviar_alerta
from ..auth import verificar_token
from ultralytics import YOLO
from cryptography.fernet import Fernet
import torch, cv2, numpy as np, base64, tempfile, shutil, time, os, subprocess
from datetime import datetime
import imageio_ffmpeg


router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

def draw_label(img, text, x, y, color):
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.2
    thickness = 1
    w, h = cv2.getTextSize(text, font, scale, thickness)[0]
    cv2.rectangle(img, (x, y - h - 10), (x + w + 10, y), color, -1)
    cv2.putText(img, text, (x + 5, y - 5), font, scale, (0, 0, 0), thickness)

@router.post("/predict")
async def inferir(file: UploadFile = File(...), token=Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)

    # lê o arquivo enviado
    content = await file.read()
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)

    # roda o modelo YOLO
    result = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]

    # --- conexão ao banco
    conn = get_connection()
    cursor = conn.cursor()

    # nome e caminho da imagem
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
    filename = f"detectado_{ts}.jpg"
    os.makedirs(IMG_STATIC_DIR, exist_ok=True)
    path = os.path.join(IMG_STATIC_DIR, filename)

    # desenha bounding boxes e registra no banco
    for box in result.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cls = model.names[int(box.cls[0])]
        conf = float(box.conf[0])
        color = CORES_CLASSES.get(cls, (255, 255, 255))
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
        draw_label(img, f"{cls}:{conf:.2f}", x1, y1, color)

        # insere registro no banco
        cursor.execute("""
            INSERT INTO detections 
            (user_id, image_name, image_path, class_name, confidence, x1, y1, x2, y2, device, model_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            token["user_id"],
            filename,
            path,
            cls,
            conf,
            x1, y1, x2, y2,
            device,
            "YOLO"
        ))

    conn.commit()
    cursor.close()
    conn.close()

    # salva imagem criptografada
    cv2.imwrite(path, img)
    with open(path, "rb") as f:
        data = f.read()
    encrypted = fernet.encrypt(data)
    with open(path, "wb") as f:
        f.write(encrypted)

    # loga e envia alerta
    log_operation(token["user_id"], f"Salvou e criptografou {filename}")
    enviar_email_em_background(result, path)

    # converte imagem processada para bytes
    ok, buf = cv2.imencode(".jpg", img)
    if not ok:
        raise HTTPException(500, "Falha ao codificar imagem")

    return StreamingResponse(
        io.BytesIO(buf.tobytes()),
        media_type="image/jpeg"
    )

@router.post("/predict_catraca")
async def inferir(file: UploadFile = File(...), token = Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)

    # lê o arquivo enviado
    content = await file.read()
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)

    # roda o modelo
    result = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
    for box in result.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cls = model.names[int(box.cls[0])]
        conf = float(box.conf[0])
        color = CORES_CLASSES.get(cls, (255, 255, 255))
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
        draw_label(img, f"{cls}:{conf:.2f}", x1, y1, color)

    # salva imagem criptografada
    os.makedirs(IMG_CATRACA, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
    filename = f"catraca_{ts}.jpg"
    path = os.path.join(IMG_CATRACA, filename)
    cv2.imwrite(path, img)
    with open(path, "rb") as f:
        data = f.read()
    encrypted = fernet.encrypt(data)
    with open(path, "wb") as f:
        f.write(encrypted)

    # loga operação no banco
    log_operation(token["user_id"], f"Salvou e criptografou {filename}")

    # 🚨 verifica e envia alerta se necessário
    enviar_email_em_background(result, path)

    # converte imagem processada para bytes e devolve como blob
    ok, buf = cv2.imencode(".jpg", img)
    if not ok:
        raise HTTPException(500, "Falha ao codificar imagem")
    
    return StreamingResponse(
        io.BytesIO(buf.tobytes()),
        media_type="image/jpeg"
    )


@router.post("/predict_video")
async def inferir_video(file: UploadFile = File(...), token=Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)

    # --- grava temporário ---
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    with open(tmp.name, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    tmp.close()

    cap = cv2.VideoCapture(tmp.name)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if fps == 0 or w == 0 or h == 0:
        cap.release()
        os.remove(tmp.name)
        raise HTTPException(400, "Vídeo inválido")

    os.makedirs(VIDEO_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    out_name = f"processado_{ts}.mp4"
    out_path = os.path.join(VIDEO_DIR, out_name)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

    # --- controle do alerta persistente ---
    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}
    alert_start = None
    alert_persistente = False
    duracao_limite = 5.0  # segundos consecutivos de alerta

    print(f"🎥 Iniciando processamento de vídeo ({fps} fps)...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        res = model.predict(frame, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
        classes_detectadas = {res.names[int(b.cls[0])] for b in res.boxes}
        classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}

        # desenha boxes
        for box in res.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = res.names[int(box.cls[0])]
            conf = float(box.conf[0])
            color = CORES_CLASSES.get(cls, (255, 255, 255))
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
            draw_label(frame, f"{cls}:{conf:.2f}", x1, y1, color)

        # monitora tempo do alerta
        if classes_perigosas:
            if alert_start is None:
                alert_start = datetime.now()
            else:
                duracao = (datetime.now() - alert_start).total_seconds()
                if duracao >= duracao_limite and not alert_persistente:
                    alert_persistente = True
                    print(f"🚨 Alerta persistente detectado ({duracao:.2f}s): {classes_perigosas}")
        else:
            alert_start = None  # reseta se não houver alerta

        out.write(frame)

    cap.release()
    out.release()
    os.remove(tmp.name)

    # --- conversão via ffmpeg ---
    web_path = out_path.replace(".mp4", "_web.mp4")
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([
        ffmpeg, "-i", out_path,
        "-c:v", "libx264", "-preset", "fast",
        "-crf", "23", "-movflags", "+faststart", web_path
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if os.path.exists(web_path):
        os.remove(out_path)
        out_path = web_path

    # --- criptografa ---
    with open(out_path, "rb") as f:
        vid_data = f.read()
    enc_vid = fernet.encrypt(vid_data)
    with open(out_path, "wb") as f:
        f.write(enc_vid)

    log_operation(token["user_id"], f"Salvou e criptografou vídeo {os.path.basename(out_path)}")

    # 🚨 se houve alerta persistente, envia o vídeo por e-mail
    if alert_persistente:
        try:
            print("📤 Enviando vídeo de alerta...")
            
            enviar_email_em_background(res, out_path)
        except Exception as e:
            print("❌ Falha ao enviar vídeo:", e)

    # --- descriptografa em memória para devolver ---
    dec_data = fernet.decrypt(enc_vid)
    return StreamingResponse(
        io.BytesIO(dec_data),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f"inline; filename={os.path.basename(out_path)}"
        }
    )