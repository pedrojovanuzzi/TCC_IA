from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..database import get_connection
from ..config import MODEL_PATH, IMG_REAL_TIME_DIR, CORES_CLASSES, IMG_SIZE
from ultralytics import YOLO
import torch, cv2, json, os, time
from ..utils import log_operation

router = APIRouter()

@router.websocket("/ws/camera/{camera_id}")
async def ws_cam(ws:WebSocket, camera_id:int):
    await ws.accept()
    conn=get_connection();c=conn.cursor();c.execute("SELECT ip FROM cameras WHERE id=%s",(camera_id,));r=c.fetchone();conn.close()
    if not r: await ws.send_text(json.dumps({"erro":"não encontrada"})); await ws.close(); return
    cap=cv2.VideoCapture(r[0])
    if not cap.isOpened(): await ws.send_text(json.dumps({"erro":"não conectou"})); await ws.close(); return
    m=YOLO(MODEL_PATH);last=0;dev="cuda" if torch.cuda.is_available() else "cpu"
    try:
        while True:
            ret,frame=cap.read(); 
            if not ret: break
            res=m.predict(frame,imgsz=IMG_SIZE,device=dev,half=True)[0]
            for b in res.boxes:
                x1,y1,x2,y2=map(int,b.xyxy[0]);cname=m.names[int(b.cls[0])];col=CORES_CLASSES.get(cname,(255,255,255))
                cv2.rectangle(frame,(x1,y1),(x2,y2),col,1)
            now=time.time()
            if now-last>=3:
                os.makedirs(IMG_REAL_TIME_DIR,exist_ok=True)
                fn=f"cam{camera_id}_{time.strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
                cv2.imwrite(os.path.join(IMG_REAL_TIME_DIR,fn),frame)
                last=now
            _,buf=cv2.imencode(".jpg",frame)
            await ws.send_text(json.dumps({"frame":buf.tobytes().hex()}))
    except WebSocketDisconnect:
        pass
    finally:
        cap.release(); await ws.close()
