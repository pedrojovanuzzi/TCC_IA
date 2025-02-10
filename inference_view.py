from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2, json, base64, asyncio, numpy as np
from ultralytics import YOLO

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("runs/detect/train3/weights/best.pt")

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_text()
            obj = json.loads(data)
            raw = base64.b64decode(obj["frame"])
            arr = np.frombuffer(raw, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            results = model(frame)
            for r in results:
                if not r.boxes: continue
                for b in r.boxes:
                    x1, y1, x2, y2 = map(int, b.xyxy[0])
                    c = model.names[int(b.cls[0])]
                    conf = float(b.conf[0])
                    color = (0,255,0) if c == "helmet" else (0,0,255)
                    cv2.rectangle(frame, (x1,y1), (x2,y2), color, 2)
                    cv2.putText(frame, f"{c}:{conf:.2f}", (x1,y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1)
            _, buf = cv2.imencode(".jpg", frame)
            enc = base64.b64encode(buf).decode("utf-8")
            await ws.send_text(json.dumps({"frame": enc}))
    except:
        pass
    finally:
        await ws.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
