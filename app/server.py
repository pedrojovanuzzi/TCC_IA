from fastapi import FastAPI, File, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2, json, base64, numpy as np
from ultralytics import YOLO
import torch
from sahi.predict import get_sliced_prediction
from sahi.models.ultralytics import UltralyticsDetectionModel
from io import BytesIO
from starlette.responses import JSONResponse


# Inicializa o aplicativo FastAPI
app = FastAPI()

# Configuração do middleware para permitir CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_path_pt = "../runs/detect/train13/weights/best.pt";
model_path_engine = "../runs/detect/train13/weights/best.engine";

@app.post("/predict")
async def inferencia_imagem(file: UploadFile = File(...)):
    try:
        # Carrega o modelo YOLOv8 com SAHI
        dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        modelo_yolo = UltralyticsDetectionModel(
        model_path=model_path_pt,  # Use .pt para SAHI funcionar
        confidence_threshold=0.5,
        device=dispositivo
)
        # Lê a imagem enviada
        conteudo_imagem = await file.read()
        array_bytes = np.frombuffer(conteudo_imagem, np.uint8)
        imagem = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)

        # Faz a inferência com SAHI
        resultado = get_sliced_prediction(
            image=imagem,
            detection_model=modelo_yolo,
            slice_height=640,
            slice_width=640,
            overlap_height_ratio=0.2,
            overlap_width_ratio=0.2
        )

        # Cores das classes para desenho
        cores_classes = {
            "helmet": (0, 255, 0),    # Verde
            "glove": (255, 255, 0),   # Amarelo
            "belt": (0, 165, 255),    # Laranja
            "head": (255, 0, 0),      # Vermelho
            "glasses": (128, 0, 128), # Roxo
            "hands": (0, 255, 255)    # Ciano
        }

        # Desenha as detecções na imagem
        for obj in resultado.object_prediction_list:
            x1, y1, x2, y2 = map(int, obj.bbox.to_xyxy())
            classe_detectada = obj.category.name
            confianca = obj.score.value

            cor_deteccao = cores_classes.get(classe_detectada, (255, 255, 255))  # Branco se não estiver listado

            cv2.rectangle(imagem, (x1, y1), (x2, y2), cor_deteccao, 2)
            cv2.putText(imagem, f"{classe_detectada}: {confianca:.2f}", (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, cor_deteccao, 1)

        # Codifica a imagem processada para base64
        _, buffer_codificado = cv2.imencode(".jpg", imagem)
        imagem_base64 = base64.b64encode(buffer_codificado).decode("utf-8")

        return JSONResponse(content={"frame": imagem_base64})

    except Exception as e:
        return JSONResponse(content={"erro": str(e)}, status_code=500)

@app.websocket("/ws")
async def conexao_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        # Carrega o modelo YOLO treinado
        # modelo_yolo = YOLO("runs/detect/train7/weights/best.pt").to("cuda")
        modelo_yolo = YOLO(model_path_engine)
        while True:
            mensagem_recebida = await websocket.receive_text()
            dados_json = json.loads(mensagem_recebida)
            
            frame_base64 = base64.b64decode(dados_json["frame"])
            array_bytes = np.frombuffer(frame_base64, np.uint8)
            frame_decodificado = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)
            dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
            resultados = modelo_yolo.predict(frame_decodificado, imgsz=640, device=dispositivo, half=True, conf=0.5)
            for resultado in resultados:
                if not resultado.boxes:
                    continue
                for caixa in resultado.boxes:
                    x1, y1, x2, y2 = map(int, caixa.xyxy[0])
                    classe_detectada = modelo_yolo.names[int(caixa.cls[0])]
                    confianca = float(caixa.conf[0])

                    cores_classes = {

                        "helmet": (0, 255, 0),    # Verde
                        "glove": (255, 255, 0),   # Amarelo
                        "belt": (0, 165, 255),    # Laranja
                        "head": (255, 0, 0),     # Vermelho
                        "glasses": (128, 0, 128), # Roxo
                        "hands": (0, 255, 255),    # Ciano
                    }

                    print(classe_detectada);

                    cor_deteccao = cores_classes.get(classe_detectada)

                    if confianca >= 0.00:
                        cv2.rectangle(frame_decodificado, (x1, y1), (x2, y2), cor_deteccao, 2)
                        cv2.putText(frame_decodificado, f"{classe_detectada}: {confianca:.2f}", (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, cor_deteccao, 1)

            _, buffer_codificado = cv2.imencode(".jpg", frame_decodificado)
            frame_enviado_base64 = base64.b64encode(buffer_codificado).decode("utf-8")

            await websocket.send_text(json.dumps({"frame": frame_enviado_base64}))
    except Exception as e:
        print(f"Erro WebSocket: {e}")
        traceback.print_exc()
    finally:
        print("Cliente desconectado, aguardando novas conexões...")


# Inicia o servidor FastAPI
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)