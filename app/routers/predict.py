from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from starlette.responses import JSONResponse
from ..config import (
    MODEL_PATH, CONFIDENCE, IMG_SIZE,
    IMG_STATIC_DIR, VIDEO_DIR,
    CORES_CLASSES, ENCRYPTION_KEY
)
from ..database import get_connection
from ..utils import log_operation
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
async def inferir(file: UploadFile = File(...), token = Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)
    content = await file.read()
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)

    result = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
    for box in result.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cls = model.names[int(box.cls[0])]
        conf = float(box.conf[0])
        color = CORES_CLASSES.get(cls, (255, 255, 255))
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
        draw_label(img, f"{cls}:{conf:.2f}", x1, y1, color)

    os.makedirs(IMG_STATIC_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
    filename = f"detectado_{ts}.jpg"
    path = os.path.join(IMG_STATIC_DIR, filename)
    cv2.imwrite(path, img)  # salva em claro

    # criptografa apenas o arquivo salvo
    with open(path, "rb") as f:
        data = f.read()
    encrypted = fernet.encrypt(data)
    with open(path, "wb") as f:
        f.write(encrypted)

    # resposta continua com frame em claro
    _, buf = cv2.imencode(".jpg", img)
    frame_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

    log_operation(token["user_id"], f"Salvou e criptografou {filename}")
    return JSONResponse({"frame": frame_b64, "path": path})

@router.post("/predict_video")
async def inferir_video(file: UploadFile = File(...), token = Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    with open(tmp.name, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
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

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        res = model.predict(frame, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
        for box in res.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            color = CORES_CLASSES.get(cls, (255, 255, 255))
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
            draw_label(frame, f"{cls}:{conf:.2f}", x1, y1, color)
        out.write(frame)

    cap.release()
    out.release()
    os.remove(tmp.name)

    # converte para web
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

    # criptografa apenas o arquivo de vídeo
    with open(out_path, "rb") as f:
        vid_data = f.read()
    enc_vid = fernet.encrypt(vid_data)
    with open(out_path, "wb") as f:
        f.write(enc_vid)

    video_url = f"/videos/{os.path.basename(out_path)}"
    log_operation(token["user_id"], f"Salvou e criptografou vídeo {os.path.basename(out_path)}")
    return JSONResponse({"video_url": video_url, "path": out_path})
