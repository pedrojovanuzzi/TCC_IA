from fastapi import FastAPI, File, UploadFile, WebSocket, HTTPException, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import cv2, json, base64, numpy as np
from ultralytics import YOLO
import torch
import subprocess
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
import imageio_ffmpeg
import subprocess

load_dotenv()
# Determinar se está rodando localmente
IS_LOCAL = os.getenv("LOCAL") == "true"

train = "train20"

# Definir caminho do modelo com base no ambiente
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
model_path_pt = os.path.join(BASE_DIR, "runs", "detect", train, "weights", "best.pt")
model_path_engine = os.path.join(BASE_DIR, "runs", "detect", train, "weights", "best.engine")

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

cores_classes = {
    "glasses": (128, 0, 128),
    "helmet": (0, 255, 0),
    "glove": (255, 255, 0),
    "hands": (0, 255, 255),
    "head": (255, 0, 0),
    "belt": (0, 165, 255),
    "no_glasses": (255, 0, 255),
    "no_belt": (0, 0, 255),
    "boots": (255, 128, 0),
    "no_boots": (128, 128, 128)
}
confidence = 0.6

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
        modelo_yolo = YOLO(model_path)
        conteudo_imagem = await file.read()
        array_bytes = np.frombuffer(conteudo_imagem, np.uint8)
        imagem = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)
        resultado = modelo_yolo.predict(imagem, imgsz=416, device=dispositivo, half=True, conf=confidence)[0]

        for caixa in resultado.boxes:
            x1, y1, x2, y2 = map(int, caixa.xyxy[0])
            classe = resultado.names[int(caixa.cls[0])]
            conf = float(caixa.conf[0])
            cor = cores_classes.get(classe, (255, 255, 255))
            cv2.rectangle(imagem, (x1, y1), (x2, y2), cor, 2)
            draw_label(imagem, f"{classe}: {conf:.2f}", x1, y1, cor)

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
    dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
    modelo_yolo = YOLO(model_path)

    os.makedirs(video_treinado_path, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    video_nome_processado = f"processado_{timestamp}.mp4"
    caminho_video_processado = os.path.abspath(os.path.join(video_treinado_path, video_nome_processado))

    temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    with open(temp_video.name, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    temp_video.close()

    cap = cv2.VideoCapture(temp_video.name)
    if not cap.isOpened():
        return JSONResponse(content={"erro": "Vídeo inválido"}, status_code=400)

    fps = int(cap.get(cv2.CAP_PROP_FPS))
    largura = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    altura = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if fps == 0 or largura == 0 or altura == 0:
        cap.release()
        return JSONResponse(content={"erro": "Propriedades inválidas"}, status_code=400)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    try:
        out = cv2.VideoWriter(caminho_video_processado, fourcc, fps, (largura, altura))
    except Exception as e:
        return JSONResponse(content={"erro": f"Erro ao criar VideoWriter: {str(e)}"}, status_code=500)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        resultado = modelo_yolo.predict(frame, imgsz=416, device=dispositivo, half=True, conf=confidence)[0]


        for caixa in resultado.boxes:
            x1, y1, x2, y2 = map(int, caixa.xyxy[0])
            classe = resultado.names[int(caixa.cls[0])]
            conf = float(caixa.conf[0])
            cor = cores_classes.get(classe, (255, 255, 255))
            cv2.rectangle(frame, (x1, y1), (x2, y2), cor, 2)
            draw_label(frame, f"{classe}: {conf:.2f}", x1, y1, cor)


        out.write(frame)

    cap.release()
    out.release()

    time.sleep(1)  # Tempo para garantir que o arquivo foi salvo corretamente

    # Caminho do vídeo convertido para H.264
    video_convertido = caminho_video_processado.replace(".mp4", "_web.mp4")
    caminho_ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()  # Pega o executável interno do FFmpeg

    cmd = [
        caminho_ffmpeg, "-i", caminho_video_processado, "-c:v", "libx264",
        "-preset", "fast", "-crf", "23", "-movflags", "+faststart", video_convertido
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Verifica se a conversão foi bem-sucedida e substitui o arquivo original
    if os.path.exists(video_convertido):
        os.remove(caminho_video_processado)  # Remove o vídeo original
        caminho_video_processado = video_convertido  # Atualiza o caminho do vídeo salvo

    try:
        os.remove(temp_video.name)
    except:
        pass

    # Retorna o caminho correto do vídeo salvo
    video_url = f"/videos/{os.path.basename(caminho_video_processado)}"
    return JSONResponse(content={"video_url": video_url, "path": caminho_video_processado})


@app.get("/api/rtsp-stream")
def rtsp_inferencia():
    modelo_yolo = YOLO(model_path)
    dispositivo = "cuda" if torch.cuda.is_available() else "cpu"

    # Substitua abaixo pelo link RTSP real da câmera Intelbras
    rtsp_url = "rtsp://usuario:senha@ip_da_camera:porta/caminho"

    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Não foi possível conectar à câmera")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            resultados = modelo_yolo.predict(frame, imgsz=416, device=dispositivo, half=True, conf=confidence)[0]

            for caixa in resultados.boxes:
                x1, y1, x2, y2 = map(int, caixa.xyxy[0])
                classe = modelo_yolo.names[int(caixa.cls[0])]
                conf = float(caixa.conf[0])
                cor = cores_classes.get(classe, (255, 255, 255))
                cv2.rectangle(frame, (x1, y1), (x2, y2), cor, 2)
                draw_label(frame, f"{classe}: {conf:.2f}", x1, y1, cor)

            # Aqui você pode salvar o frame, enviar por WebSocket, ou só exibir/salvar localmente
            cv2.imshow("Detecção em tempo real - RTSP", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        cap.release()
        cv2.destroyAllWindows()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
            resultados = modelo_yolo.predict(frame, imgsz=416, device=dispositivo, half=True, conf=confidence, stream=True)
            
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
            if agora - ultimo_save >= 3.0:
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
