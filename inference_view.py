from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2, json, base64, asyncio
from ultralytics import YOLO

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("runs/detect/train2/weights/best.pt")
cap = cv2.VideoCapture(0)

async def detect_and_stream(ws: WebSocket):
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        results = model(frame)
        detections = []
        for r in results:
            if not hasattr(r, "boxes") or r.boxes is None:
                continue
            for b in r.boxes:
                if not hasattr(b, "cls") or not hasattr(b, "xyxy") or not hasattr(b, "conf"):
                    continue
                x1, y1, x2, y2 = map(int, b.xyxy[0])
                cid = int(b.cls[0])
                conf = float(b.conf[0])
                cname = model.names[cid]
                detections.append({"class": cname, "confidence": conf, "bbox": [x1, y1, x2, y2]})
                c = (0,255,0) if cname == "helmet" else (0,0,255)
                cv2.rectangle(frame, (x1,y1), (x2,y2), c, 2)
                cv2.putText(frame, f"{cname}: {conf:.2f}", (x1,y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, c, 2)
        _, buffer = cv2.imencode(".jpg", frame)
        frame64 = base64.b64encode(buffer).decode("utf-8")
        data = {"detections": detections, "frame": frame64}
        try:
            await ws.send_text(json.dumps(data))
        except Exception as e:
            print("Erro:", e)
        await asyncio.sleep(0.03)

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        await detect_and_stream(ws)
    finally:
        cap.release()
        await ws.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
