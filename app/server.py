from fastapi import FastAPI, File, UploadFile, WebSocket, HTTPException, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
from datetime import datetime
import time
import gc
from pydantic import BaseModel
import socket
from dotenv import load_dotenv
import requests


load_dotenv()
# Determinar se está rodando localmente
IS_LOCAL = os.getenv("LOCAL") == "true"

# Definir caminho do modelo com base no ambiente
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
model_path_pt = os.path.join(BASE_DIR, "runs", "detect", "train14", "weights", "best.pt")
model_path_engine = os.path.join(BASE_DIR, "runs", "detect", "train14", "weights", "best.engine")

# Escolher qual modelo usar
model_path = model_path_engine if IS_LOCAL else model_path_pt

# Debugging: Imprimir status do ambiente
print(f"🔹 Hostname: {socket.gethostname()}")
print(f"🔹 Variável LOCAL: {os.getenv('LOCAL')}")
print(f"🔹 Rodando em Localhost? {'SIM' if IS_LOCAL else 'NÃO'}")
print(f"✅ Usando modelo: {model_path}")


# Verificar se o modelo existe
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# Outras variáveis do projeto
video_treinado_path = os.path.abspath(os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "video_treinado"))
img_statica = os.path.abspath(os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_statica"))
img_real_time = os.path.abspath(os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_real_time"))
IMAGES_DIR = os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens")

# Print para verificar qual modelo foi carregado
print(f"✅ Usando modelo: {model_path}")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/api/videos", StaticFiles(directory=video_treinado_path), name="videos")

cores_classes = {"helmet": (0, 255, 0), "glove": (255, 255, 0), "belt": (0, 165, 255), "head": (255, 0, 0), "glasses": (128, 0, 128), "hands": (0, 255, 255)}
confidence = 0.5

class DeleteFileRequest(BaseModel):
    folder: str
    filename: str


class DeleteRequest(BaseModel):
    folder: str
    filenames: list[str]

@app.delete("/api/delete-batch")
async def delete_batch(request: DeleteRequest):
    if not request.folder or not request.filenames:
        raise HTTPException(status_code=400, detail="Pasta ou arquivos não informados")
    deleted_files = []
    for filename in request.filenames:
        file_path = os.path.join(IMAGES_DIR, request.folder, filename)
        if os.path.exists(file_path):
            for _ in range(5):
                try:
                    os.remove(file_path)
                    deleted_files.append(filename)
                    break
                except PermissionError:
                    time.sleep(1)
                    gc.collect()
    return {"success": True, "deleted": deleted_files}


@app.delete("/api/delete")
def delete_file(request: DeleteFileRequest):
    folder_path = os.path.join(IMAGES_DIR, request.folder)
    file_path = os.path.join(folder_path, request.filename)
    
    if os.path.exists(file_path):
        os.remove(file_path)
        return JSONResponse(content={"success": True, "message": "Arquivo excluído com sucesso."})
    else:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")


@app.get("/api/gallery")
def list_folders():
    try:
        folders = []
        for folder in ["video_treinado", "img_statica", "img_real_time"]:
            folder_path = os.path.join(IMAGES_DIR, folder)
            if os.path.exists(folder_path) and os.path.isdir(folder_path):
                files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
                folders.append({"name": folder, "files": files})
        return JSONResponse(content={"folders": folders})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# Função para desenhar rótulos com fundo colorido
def draw_label(imagem, text, x, y, color):
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.0  # Aumentar fonte
    thickness = 2
    (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)

    # Criar fundo atrás do texto
    cv2.rectangle(
        imagem,
        (x, y - text_height - 10),
        (x + text_width + 10, y),
        color,
        -1  # Preenchimento total
    )

    # Adicionar o texto na imagem (cor preta para melhor visibilidade)
    cv2.putText(
        imagem,
        text,
        (x + 5, y - 5),
        font,
        font_scale,
        (0, 0, 0),  # Texto preto
        thickness
    )


@app.post("/api/predict")
async def inferencia_imagem(file: UploadFile = File(...)):
    try:
        dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        modelo_yolo = UltralyticsDetectionModel(model_path=model_path_pt, confidence_threshold=confidence, device=dispositivo)
        conteudo_imagem = await file.read()
        array_bytes = np.frombuffer(conteudo_imagem, np.uint8)
        imagem = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)
        resultado = get_sliced_prediction(
            image=imagem,
            detection_model=modelo_yolo,
            slice_height=256,  # Aumentar tamanho do slice para capturar mais contexto
            slice_width=256,
            overlap_height_ratio=0.2,  # Reduzir sobreposição para evitar duplicações
            overlap_width_ratio=0.2
        )
        for obj in resultado.object_prediction_list:
            x1, y1, x2, y2 = map(int, obj.bbox.to_xyxy())
            classe_detectada = obj.category.name
            confianca = obj.score.value
            cor_deteccao = cores_classes.get(classe_detectada, (255, 255, 255))
            cv2.rectangle(imagem, (x1, y1), (x2, y2), cor_deteccao, 2)
            draw_label(imagem, f"{classe_detectada}: {confianca:.2f}", x1, y1, cor_deteccao)
        os.makedirs(img_statica, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
        nome_arquivo = f"detectado_{timestamp}.jpg"
        caminho_imagem = os.path.join(img_statica, nome_arquivo)
        cv2.imwrite(caminho_imagem, imagem)
        _, buffer_codificado = cv2.imencode(".jpg", imagem)
        imagem_base64 = base64.b64encode(buffer_codificado).decode("utf-8")
        return JSONResponse(content={"frame": imagem_base64, "path": caminho_imagem})
    except Exception as e:
        return JSONResponse(content={"erro": str(e)}, status_code=500)

@app.post("/api/predict_video")
async def inferencia_video(file: UploadFile = File(...)):
    try:
        dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        modelo_yolo = UltralyticsDetectionModel(model_path=model_path_pt, confidence_threshold=confidence, device=dispositivo)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        video_nome_processado = f"processado_{timestamp}.mp4"
        os.makedirs(video_treinado_path, exist_ok=True)
        caminho_video_processado = os.path.join(video_treinado_path, video_nome_processado)
        temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        with open(temp_video.name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        temp_video.close()
        cap = cv2.VideoCapture(temp_video.name)
        if not cap.isOpened():
            raise Exception("Erro ao abrir o vídeo.")
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        largura = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        altura = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if fps == 0 or largura == 0 or altura == 0:
            cap.release()
            raise Exception("Erro nas propriedades do vídeo.")
        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        out = cv2.VideoWriter(caminho_video_processado, fourcc, fps, (largura, altura))
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            resultado = get_sliced_prediction(
                image=frame,
                detection_model=modelo_yolo,
                slice_height=256,  # Aumentar tamanho do slice para capturar mais contexto
                slice_width=256,
                overlap_height_ratio=0.2,  # Reduzir sobreposição para evitar duplicações
                overlap_width_ratio=0.2
            )
            for obj in resultado.object_prediction_list:
                x1, y1, x2, y2 = map(int, obj.bbox.to_xyxy())
                classe_detectada = obj.category.name
                confianca = obj.score.value
                cor_deteccao = cores_classes.get(classe_detectada, (255, 255, 255))
                cv2.rectangle(frame, (x1, y1), (x2, y2), cor_deteccao, 2)
                draw_label(frame, f"{classe_detectada}: {confianca:.2f}", x1, y1, cor_deteccao)
            out.write(frame)
        cap.release()
        out.release()
        time.sleep(1)
        cv2.destroyAllWindows()
        os.remove(temp_video.name)
        video_url = f"/videos/{video_nome_processado}"
        return JSONResponse(content={"video_url": video_url})
    except Exception as e:
        return JSONResponse(content={"erro": str(e)}, status_code=500)

@app.websocket("/api/ws")
async def conexao_websocket(websocket: WebSocket):
    await websocket.accept()
    modelo_yolo = YOLO(model_path)
    ultimo_save = 0
    try:
        while True:
            mensagem = await websocket.receive_text()
            dados = json.loads(mensagem)
            frame_base64 = base64.b64decode(dados["frame"])
            array_bytes = np.frombuffer(frame_base64, np.uint8)
            frame = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)
            dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
            resultados = modelo_yolo.predict(frame, imgsz=640, device=dispositivo, half=True, conf=confidence, stream=True)
            
            for res in resultados:
                if not res.boxes:
                    continue
                for caixa in res.boxes:
                    x1, y1, x2, y2 = map(int, caixa.xyxy[0])
                    classe = modelo_yolo.names[int(caixa.cls[0])]
                    conf = float(caixa.conf[0])
                    cor = cores_classes.get(classe, (255, 255, 255))
                    cv2.rectangle(frame, (x1, y1), (x2, y2), cor, 2)
                    draw_label(frame, f"{classe}: {conf:.2f}", x1, y1, cor)

            agora = time.time()
            if agora - ultimo_save >= 1.0:
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
                os.makedirs(img_real_time, exist_ok=True)
                nome_arquivo = f"{timestamp}.jpg"
                caminho = os.path.join(img_real_time, nome_arquivo)
                cv2.imwrite(caminho, frame)
                ultimo_save = agora

            _, buffer = cv2.imencode(".jpg", frame)
            frame_saida = base64.b64encode(buffer).decode("utf-8")
            await websocket.send_text(json.dumps({"frame": frame_saida}))

    except WebSocketDisconnect:
        print("Cliente WebSocket desconectado.")
    except Exception as e:
        print(f"Erro no WebSocket: {e}")
    finally:
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
