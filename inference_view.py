from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2, json, base64, numpy as np
from ultralytics import YOLO
import uvicorn
import traceback
import torch
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

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

# Verifica se há GPU disponível para rodar o modelo
dispositivo = "cuda" if torch.cuda.is_available() else "cpu"

# Caminho do modelo YOLOv11 convertido para TensorRT
modelo_path = "runs/detect/train10/weights/best.engine"

# Carregar modelo YOLO otimizado para inferência com SAHI
detection_model = AutoDetectionModel.from_pretrained(
    model_type="ultralytics",
    model_path=modelo_path,  # Usa o modelo treinado em TensorRT
    confidence_threshold=0.3,
    device=dispositivo
)

@app.websocket("/ws")
async def conexao_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Recebe frame base64 do cliente via WebSocket
            mensagem_recebida = await websocket.receive_text()
            dados_json = json.loads(mensagem_recebida)

            # Decodifica imagem do formato Base64 para um array NumPy
            frame_base64 = base64.b64decode(dados_json["frame"])
            array_bytes = np.frombuffer(frame_base64, np.uint8)
            frame_decodificado = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)

            # Aplicar inferência com SAHI
            result = get_sliced_prediction(
                frame_decodificado,
                detection_model,
                slice_height=256,  # Define tamanho dos cortes (ajustar conforme necessário)
                slice_width=256,
                overlap_height_ratio=0.2,
                overlap_width_ratio=0.2,
            )

            # Desenhar as detecções na imagem original
            for pred in result.object_prediction_list:
                x1, y1, x2, y2 = map(int, pred.bbox.to_xyxy())
                classe_detectada = pred.category.name
                confianca = pred.score.value

                # Definição de cores para cada classe detectada
                cores_classes = {
                    "helmet": (0, 255, 0),    # Verde
                    "glove": (255, 255, 0),   # Amarelo
                    "vest": (0, 165, 255),    # Laranja
                    "head": (255, 0, 0),     # Vermelho
                    "goggles": (128, 0, 128), # Roxo
                    "belt": (0, 255, 255),    # Ciano
                }

                cor_deteccao = cores_classes.get(classe_detectada, (0, 0, 255))

                # Aplica a detecção se a confiança for maior que 10%
                if confianca >= 0.10:
                    cv2.rectangle(frame_decodificado, (x1, y1), (x2, y2), cor_deteccao, 2)
                    cv2.putText(
                        frame_decodificado, 
                        f"{classe_detectada}: {confianca:.2f}",
                        (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        cor_deteccao,
                        1
                    )

            # Codifica o frame de volta para Base64
            _, buffer_codificado = cv2.imencode(".jpg", frame_decodificado)
            frame_enviado_base64 = base64.b64encode(buffer_codificado).decode("utf-8")

            # Envia o frame processado de volta para o cliente via WebSocket
            await websocket.send_text(json.dumps({"frame": frame_enviado_base64}))

    except Exception as e:
        print(f"Erro WebSocket: {e}")
        traceback.print_exc()
    finally:
        print("Cliente desconectado, aguardando novas conexões...")

# Inicia o servidor FastAPI
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)
