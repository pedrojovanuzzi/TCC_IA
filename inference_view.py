from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2, json, base64, numpy as np
from ultralytics import YOLO
import uvicorn

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

# Carrega o modelo YOLO treinado
modelo_yolo = YOLO("runs/detect/train3/weights/best.pt")

@app.websocket("/ws")
async def conexao_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            mensagem_recebida = await websocket.receive_text()
            dados_json = json.loads(mensagem_recebida)
            
            # Decodifica a imagem base64
            frame_base64 = base64.b64decode(dados_json["frame"])
            array_bytes = np.frombuffer(frame_base64, np.uint8)
            frame_decodificado = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)

            # Executa a detecção com o YOLO
            resultados = modelo_yolo(frame_decodificado)
            for resultado in resultados:
                if not resultado.boxes:
                    continue
                for caixa in resultado.boxes:
                    x1, y1, x2, y2 = map(int, caixa.xyxy[0])
                    classe_detectada = modelo_yolo.names[int(caixa.cls[0])]
                    confianca = float(caixa.conf[0])

                    # Define a cor do retângulo baseado na classe detectada
                    cor_deteccao = (0, 255, 0) if classe_detectada == "helmet" else (0, 0, 255)

                    # Se a confiança for >= 0.50, desenha a detecção
                    if confianca >= 0.50:
                        cv2.rectangle(frame_decodificado, (x1, y1), (x2, y2), cor_deteccao, 2)
                        cv2.putText(
                            frame_decodificado,
                            f"{classe_detectada}: {confianca:.2f}",
                            (x1, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            cor_deteccao,
                            1
                        )

            # Codifica a imagem novamente para enviar pelo WebSocket
            _, buffer_codificado = cv2.imencode(".jpg", frame_decodificado)
            frame_enviado_base64 = base64.b64encode(buffer_codificado).decode("utf-8")

            # Envia o frame processado de volta ao cliente
            await websocket.send_text(json.dumps({"frame": frame_enviado_base64}))
    except Exception:
        pass
    finally:
        await websocket.close()

# Inicia o servidor FastAPI
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)
