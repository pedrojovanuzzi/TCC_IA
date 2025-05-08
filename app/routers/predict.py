from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from starlette.responses import JSONResponse
from ..config import MODEL_PATH, CONFIDENCE, IMG_SIZE, IMG_STATIC_DIR, VIDEO_DIR, IMG_REAL_TIME_DIR, IMAGES_DIR, CORES_CLASSES, ENCRYPTION_KEY
from ..database import get_connection
from ..utils import log_operation
from ..auth import verificar_token
from ultralytics import YOLO
import torch, cv2, numpy as np, base64, tempfile, shutil, time, os, io
import imageio_ffmpeg, subprocess
from datetime import datetime
from cryptography.fernet import Fernet

router = APIRouter()
fernet = Fernet(ENCRYPTION_KEY)

def draw_label(img,text,x,y,color):
    f = cv2.FONT_HERSHEY_SIMPLEX; s = 0.2; t = 1
    w,h = cv2.getTextSize(text,f,s,t)[0]
    cv2.rectangle(img,(x,y-h-10),(x+w+10,y),color,-1)
    cv2.putText(img,text,(x+5,y-5),f,s,(0,0,0),t)

@router.post("/predict")
async def inferir(file: UploadFile = File(...), token = Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)
    content = await file.read()
    img = cv2.imdecode(np.frombuffer(content,np.uint8),cv2.IMREAD_COLOR)
    result = model.predict(img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
    for box in result.boxes:
        x1,y1,x2,y2 = map(int, box.xyxy[0])
        cls = model.names[int(box.cls[0])]
        conf = float(box.conf[0])
        col = CORES_CLASSES.get(cls,(255,255,255))
        cv2.rectangle(img,(x1,y1),(x2,y2),col,1)
        draw_label(img,f"{cls}:{conf:.2f}",x1,y1,col)
    os.makedirs(IMG_STATIC_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
    filename = f"detectado_{ts}.jpg"
    path = os.path.join(IMG_STATIC_DIR, filename)
    cv2.imwrite(path, img)
    with open(path, "rb") as f:
        encrypted = fernet.encrypt(f.read())
    with open(path, "wb") as f:
        f.write(encrypted)
    token_bytes = base64.b64encode(encrypted).decode("utf-8")
    log_operation(token["user_id"], f"Salvou Foto {filename}")
    return JSONResponse({"frame": token_bytes, "path": path})

@router.post("/decrypt_image")
async def decrypt_image(path: str, token = Depends(verificar_token)):
    if not os.path.exists(path):
        raise HTTPException(404, "Arquivo não encontrado")
    with open(path, "rb") as f:
        encrypted = f.read()
    try:
        decrypted = fernet.decrypt(encrypted)
    except:
        raise HTTPException(400, "Falha na descriptografia")
    return JSONResponse({"frame": base64.b64encode(decrypted).decode("utf-8")})

@router.post("/predict_video")
async def inferir_video(file: UploadFile = File(...), token = Depends(verificar_token)):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    out_name = f"processado_{ts}.mp4"
    out_path = os.path.join(VIDEO_DIR, out_name)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    with open(tmp.name, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    cap = cv2.VideoCapture(tmp.name)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    w   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if fps == 0 or w == 0 or h == 0:
        cap.release()
        raise HTTPException(400, "Vídeo inválido")
    os.makedirs(VIDEO_DIR, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))
    while True:
        ret, frame = cap.read()
        if not ret: break
        res = model.predict(frame, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]
        for box in res.boxes:
            x1,y1,x2,y2 = map(int, box.xyxy[0])
            cls = model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            col = CORES_CLASSES.get(cls,(255,255,255))
            cv2.rectangle(frame,(x1,y1),(x2,y2),col,1)
            draw_label(frame,f"{cls}:{conf:.2f}",x1,y1,col)
        out.write(frame)
    cap.release()
    out.release()
    os.remove(tmp.name)
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    web_path = out_path.replace(".mp4","_web.mp4")
    subprocess.run([ffmpeg_exe, "-i", out_path, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-movflags", "+faststart", web_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if os.path.exists(web_path):
        os.remove(out_path)
        out_path = web_path
    log_operation(token["user_id"], f"Salvou Video {out_name}")
    return JSONResponse({"video_url": f"/videos/{os.path.basename(out_path)}", "path": out_path})
