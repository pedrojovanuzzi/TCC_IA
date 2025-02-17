from fastapi import FastAPI, File, UploadFile
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

# Carrega o modelo YOLOv8 com SAHI
dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
modelo_yolo = UltralyticsDetectionModel(
    model_path="../runs/detect/train12/weights/best.pt",  # Use .pt para SAHI funcionar
    confidence_threshold=0.5,
    device=dispositivo
)

@app.post("/predict")
async def inferencia_imagem(file: UploadFile = File(...)):
    try:
        # Lê a imagem enviada
        conteudo_imagem = await file.read()
        array_bytes = np.frombuffer(conteudo_imagem, np.uint8)
        imagem = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)

        # Faz a inferência com SAHI
        resultado = get_sliced_prediction(
            image=imagem,
            detection_model=modelo_yolo,
            slice_height=256,
            slice_width=256,
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

# Inicia o servidor FastAPI
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
