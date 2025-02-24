import traceback
from fastapi import FastAPI, File, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2, json, base64, numpy as np
from ultralytics import YOLO
import torch
from sahi.predict import get_sliced_prediction
from sahi.models.ultralytics import UltralyticsDetectionModel
from io import BytesIO
from starlette.responses import JSONResponse, FileResponse
import os
import tempfile
import shutil
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import time




BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

model_path_pt = os.path.join(BASE_DIR, "runs", "detect", "train13", "weights", "best.pt")
model_path_engine = os.path.join(BASE_DIR, "runs", "detect", "train13", "weights", "best.engine")

# Caminho para a pasta public/videos do React
REACT_PUBLIC_DIR = os.path.abspath(os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "videos"))
os.makedirs(REACT_PUBLIC_DIR, exist_ok=True)  # Cria a pasta se não existir

video_treinado_path = os.path.abspath(os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "video_treinado"))
img_statica = os.path.abspath(os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_statica"))
img_real_time = os.path.abspath(os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_real_time"))


if not os.path.exists(model_path_pt):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path_pt}")

if not os.path.exists(model_path_engine):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path_engine}")

print("Arquivos encontrados com sucesso!")



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

# Cores das classes para desenho
cores_classes = {
    "helmet": (0, 255, 0),    # Verde
    "glove": (255, 255, 0),   # Amarelo
    "belt": (0, 165, 255),    # Laranja
    "head": (255, 0, 0),      # Vermelho
    "glasses": (128, 0, 128), # Roxo
    "hands": (0, 255, 255)    # Ciano
}

confidence=0.327

@app.post("/predict")
async def inferencia_imagem(file: UploadFile = File(...)):
    try:
        # Carrega o modelo YOLOv8 com SAHI
        dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        modelo_yolo = UltralyticsDetectionModel(
            model_path=model_path_pt,  # Use .pt para SAHI funcionar
            confidence_threshold=confidence,
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

        # Desenha as detecções na imagem
        for obj in resultado.object_prediction_list:
            x1, y1, x2, y2 = map(int, obj.bbox.to_xyxy())
            classe_detectada = obj.category.name
            confianca = obj.score.value

            cor_deteccao = cores_classes.get(classe_detectada, (255, 255, 255))  # Branco se não estiver listado

            cv2.rectangle(imagem, (x1, y1), (x2, y2), cor_deteccao, 2)
            cv2.putText(imagem, f"{classe_detectada}: {confianca:.2f}", (x1, y1 - 5), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, cor_deteccao, 1)

        # Salvar a imagem já processada na pasta img_statica
        os.makedirs(img_statica, exist_ok=True)  # Garante que a pasta existe

        # Criar um nome de arquivo com timestamp para evitar conflitos
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]  # Formato YYYY-MM-DD_HH-MM-SS-mmm
        nome_arquivo = f"detectado_{timestamp}.jpg"
        caminho_imagem = os.path.join(img_statica, nome_arquivo)

        cv2.imwrite(caminho_imagem, imagem)  # Salva a imagem processada com os labels

        # Codifica a imagem processada para base64
        _, buffer_codificado = cv2.imencode(".jpg", imagem)
        imagem_base64 = base64.b64encode(buffer_codificado).decode("utf-8")

        return JSONResponse(content={"frame": imagem_base64, "path": caminho_imagem})

    except Exception as e:
        return JSONResponse(content={"erro": str(e)}, status_code=500)
    


@app.post("/predict_video")
async def inferencia_video(file: UploadFile = File(...)):
    try:
        print("Recebendo vídeo para processamento...")

        dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        modelo_yolo = UltralyticsDetectionModel(
            model_path=model_path_pt,
            confidence_threshold=confidence,
            device=dispositivo
        )

        # Criar nome único para o vídeo processado
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        video_nome_processado = f"processado_{timestamp}.mp4"
        caminho_video_processado = os.path.join(video_treinado_path, video_nome_processado)

        # Salvar o vídeo temporário
        temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        with open(temp_video.name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"Arquivo salvo temporariamente: {temp_video.name}")

        # Abrir vídeo com OpenCV
        cap = cv2.VideoCapture(temp_video.name)
        if not cap.isOpened():
            raise Exception("Erro ao abrir o vídeo. O arquivo pode estar corrompido ou em formato não suportado.")

        fps = int(cap.get(cv2.CAP_PROP_FPS))
        largura = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        altura = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        print(f"FPS: {fps}, Largura: {largura}, Altura: {altura}")

        if fps == 0 or largura == 0 or altura == 0:
            raise Exception("Erro ao obter propriedades do vídeo. O vídeo pode estar corrompido.")

        # Configurar FPS e codec
        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        out = cv2.VideoWriter(caminho_video_processado, fourcc, fps, (largura, altura))

        print("Iniciando processamento do vídeo...")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("Finalizando processamento: todos os frames foram lidos.")
                break

            # Inferência YOLOv8 + SAHI
            resultado = get_sliced_prediction(
                image=frame,
                detection_model=modelo_yolo,
                slice_height=640,
                slice_width=640,
                overlap_height_ratio=0.2,
                overlap_width_ratio=0.2
            )

            # Desenha as detecções na imagem
            for obj in resultado.object_prediction_list:
                x1, y1, x2, y2 = map(int, obj.bbox.to_xyxy())
                classe_detectada = obj.category.name
                confianca = obj.score.value
                cor_deteccao = cores_classes.get(classe_detectada, (255, 255, 255))

                cv2.rectangle(frame, (x1, y1), (x2, y2), cor_deteccao, 2)
                cv2.putText(frame, f"{classe_detectada}: {confianca:.2f}", (x1, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, cor_deteccao, 1)

            # Escreve o frame processado no vídeo final
            out.write(frame)

        cap.release()
        out.release()

        # Remove o vídeo temporário original
        os.remove(temp_video.name)
        print(f"Vídeo processado salvo em: {caminho_video_processado}")

        video_url = f"/videos/{video_nome_processado}"
        return JSONResponse(content={"video_url": video_url})

    except Exception as e:
        print("Erro durante o processamento do vídeo:")
        traceback.print_exc()
        return JSONResponse(content={"erro": str(e)}, status_code=500)

@app.websocket("/ws")
async def conexao_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        # Carrega o modelo YOLO treinado
        modelo_yolo = YOLO(model_path_engine)

        # Garante que a pasta img_real_time existe
        os.makedirs(img_real_time, exist_ok=True)

        # Variável para controlar o tempo da última captura
        ultimo_tempo = time.time()

        while True:
            mensagem_recebida = await websocket.receive_text()
            dados_json = json.loads(mensagem_recebida)

            # Verifica se passou 1 segundo desde o último frame processado
            tempo_atual = time.time()
            if tempo_atual - ultimo_tempo < 1.0:
                continue  # Ignora o frame atual e espera o próximo

            # Atualiza o tempo da última captura
            ultimo_tempo = tempo_atual

            # Decodifica a imagem do WebSocket
            frame_base64 = base64.b64decode(dados_json["frame"])
            array_bytes = np.frombuffer(frame_base64, np.uint8)
            frame_decodificado = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)

            dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
            resultados = modelo_yolo.predict(
                frame_decodificado, imgsz=640, device=dispositivo, half=True, conf=confidence, stream=True
            )

            for resultado in resultados:
                if not resultado.boxes:
                    continue
                for caixa in resultado.boxes:
                    x1, y1, x2, y2 = map(int, caixa.xyxy[0])
                    classe_detectada = modelo_yolo.names[int(caixa.cls[0])]
                    confianca = float(caixa.conf[0])

                    cor_deteccao = cores_classes.get(classe_detectada, (255, 255, 255))

                    if confianca >= 0.00:
                        cv2.rectangle(frame_decodificado, (x1, y1), (x2, y2), cor_deteccao, 2)
                        cv2.putText(
                            frame_decodificado, f"{classe_detectada}: {confianca:.2f}",
                            (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, cor_deteccao, 1
                        )

            # Salva apenas o frame processado (1 por segundo)
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]  # Formato YYYY-MM-DD_HH-MM-SS-mmm
            nome_arquivo = f"{timestamp}.jpg"
            caminho_arquivo = os.path.join(img_real_time, nome_arquivo)

            cv2.imwrite(caminho_arquivo, frame_decodificado)

            # Codifica a imagem processada para enviar de volta via WebSocket
            _, buffer_codificado = cv2.imencode(".jpg", frame_decodificado)
            frame_enviado_base64 = base64.b64encode(buffer_codificado).decode("utf-8")

            await websocket.send_text(json.dumps({"frame": frame_enviado_base64, "path": caminho_arquivo}))

    except Exception as e:
        print(f"Erro WebSocket: {e}")
        traceback.print_exc()
    finally:
        print("Cliente desconectado, aguardando novas conexões...")

        
# Inicia o servidor FastAPI
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)