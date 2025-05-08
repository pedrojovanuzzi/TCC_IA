import mysql.connector
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
from dotenv import load_dotenv
import hashlib
from contextlib import asynccontextmanager
from fastapi import Body
from auth import criar_token
from auth import verificar_token

load_dotenv()
# Determinar se está rodando localmente
IS_LOCAL = os.getenv("LOCAL") == "true"

train = "train7"

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria usuário admin ao iniciar
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users WHERE login = %s", ("admin",))
        existe = cursor.fetchone()[0]

        if existe == 0:
            import hashlib
            senha = os.getenv("ADMIN_PASSWORD")
            senha_hash = hashlib.sha256(senha.encode()).hexdigest()

            cursor.execute("INSERT INTO users (login, password, nivel) VALUES (%s, %s, 3)", ("admin", senha_hash))
            conn.commit()
            print("✅ Usuário admin criado com sucesso.")
        else:
            print("🔒 Usuário admin já existe. Nenhuma ação necessária.")

        conn.close()
    except Exception as e:
        print(f"❌ Erro ao criar usuário admin: {e}")

    yield  # Aqui libera para o app continuar rodando


class TokenRequest(BaseModel):
    username: str
    password: str


app = FastAPI(lifespan=lifespan)
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
}

confidence = 0.5
img_size = 640

class DeleteFileRequest(BaseModel):
    folder: str
    filename: str

class DeleteRequest(BaseModel):
    folder: str
    filenames: list[str]

class Camera(BaseModel):
    name: str
    ip: str

class CameraOut(Camera):
    id: int




def get_connection():
    import os
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME")

    # print("🔎 DEBUG VARIÁVEIS DE AMBIENTE:")
    # print("HOST:", host)
    # print("USER:", user)
    # print("PASSWORD:", f"(vazio)" if password == "" else password)
    # print("DATABASE:", database)

    if not all([host, user, password is not None, database]):
        raise Exception("❌ Variáveis de ambiente do banco não configuradas corretamente")

    import mysql.connector
    return mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database
    )

def log_operation(user_id: int, operacao: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO register (`user`, operacao) VALUES (%s, %s)",
        (user_id, operacao),
    )
    conn.commit()
    conn.close()


@app.post("/api/token")
def login(data: dict = Body(...), token: dict = Depends(verificar_token)):
    login = data.get("username")
    password = data.get("password")
    if not login or not password:
        raise HTTPException(status_code=400, detail="Login e senha obrigatórios")

    senha_hash = hashlib.sha256(password.encode()).hexdigest()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, nivel FROM users WHERE login = %s AND password = %s", (login, senha_hash))
    row = cursor.fetchone()
    conn.close()

    if row:
        token = criar_token({"user_id": row[0], "nivel": row[1]})
        return {"access_token": token, "token_type": "bearer"}
    else:
        raise HTTPException(status_code=401, detail="Login ou senha inválidos")


@app.get("/api/users")
def listar_usuarios(token=Depends(verificar_token)):
    if token["nivel"] < 3:
        raise HTTPException(status_code=403, detail="Permissão negada.")
    conn = get_connection(); cursor = conn.cursor()
    cursor.execute("SELECT id, login, nivel FROM users WHERE login != 'admin'")
    users = [{"id": r[0], "login": r[1], "nivel": r[2]} for r in cursor.fetchall()]
    conn.close()
    return users

@app.post("/api/users")
def criar_usuario(user: dict = Body(...), token: dict = Depends(verificar_token) ):
    login = user.get("login")
    password = user.get("password")
    nivel = user.get("nivel", 1)  # padrão 1 se não vier

    # validações básicas
    if not login or not password:
        raise HTTPException(status_code=400, detail="Login e senha obrigatórios.")
    if not isinstance(nivel, int) or nivel < 1 or nivel > 3:
        raise HTTPException(status_code=400, detail="Nível inválido. Deve ser 1, 2 ou 3.")

    senha_hash = hashlib.sha256(password.encode()).hexdigest()
    conn = get_connection()
    cursor = conn.cursor()

    # inclui o nível na tabela
    cursor.execute(
        "INSERT INTO users (login, password, nivel) VALUES (%s, %s, %s)",
        (login, senha_hash, nivel)
    )
    conn.commit()
    conn.close()
    
    log_operation(
        token["user_id"],
        f"criou usuário '{login}' com nível {nivel}"
    )
    return {"success": True, "login": login, "nivel": nivel}

@app.delete("/api/users/{user_id}")
def deletar_usuario(
    user_id: int,
    token: dict = Depends(verificar_token)
):
    conn = get_connection()
    cursor = conn.cursor()
    # 1) buscar o login para usar no log
    cursor.execute("SELECT login FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    login_a_deletar = row[0]

    # 2) deletar o usuário
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    conn.commit()
    conn.close()

    # 3) logar usando o login
    log_operation(
        token["user_id"],
        f"deletou usuário '{login_a_deletar}' (id={user_id})"
    )
    return {"success": True}



@app.put("/api/users/{user_id}")
def atualizar_usuario(user_id: int, data: dict = Body(...),token: dict = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor()

    login = data.get("login")
    password = data.get("password")
    nivel = data.get("nivel")

    updates = []
    values = []

    if login:
        updates.append("login = %s")
        values.append(login)

    if password:
        import hashlib
        senha_hash = hashlib.sha256(password.encode()).hexdigest()
        updates.append("password = %s")
        values.append(senha_hash)

    if nivel is not None:
        updates.append("nivel = %s")
        values.append(nivel)

    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar.")

    values.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
    cursor.execute(query, values)
    conn.commit()
    conn.close()
    log_operation(
    token["user_id"],
    f"atualizou usuario '{login}' com nível {nivel}"
)
    return {"success": True}


@app.get("/api/cameras", response_model=list[CameraOut])
def list_cameras():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, ip FROM cameras")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "name": row[1], "ip": row[2]} for row in rows]

@app.post("/api/cameras", response_model=CameraOut)
def add_camera(camera: Camera, token: dict = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO cameras (name, ip) VALUES (%s, %s)", (camera.name, camera.ip))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    log_operation(
    token["user_id"],
    f"adicionou câmera {camera.name}"
    )
    return {"id": new_id, **camera.dict()}

@app.put("/api/cameras/{camera_id}", response_model=CameraOut)
def update_camera(camera_id: int, camera: Camera, token: dict = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE cameras SET name = %s, ip = %s WHERE id = %s", (camera.name, camera.ip, camera_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Câmera não encontrada")
    conn.commit()
    conn.close()
    log_operation(
    token["user_id"],
    f"atualizou câmera {camera.name}"
    )
    return {"id": camera_id, **camera.dict()}

@app.get("/api/cameras/{camera_id}", response_model=CameraOut)
def get_camera_by_id(camera_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, ip FROM cameras WHERE id = %s", (camera_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "name": row[1], "ip": row[2]}
    else:
        raise HTTPException(status_code=404, detail="Câmera não encontrada")


@app.delete("/api/cameras/{camera_id}")
def delete_camera(camera_id: int, token: dict = Depends(verificar_token)):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, ip FROM cameras WHERE id = %s", (camera_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    camera_deletada = row[0]
    
    cursor.execute("DELETE FROM cameras WHERE id = %s", (camera_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Câmera não encontrada")
    conn.commit()
    conn.close()
    log_operation(
    token["user_id"],
    f"removeu câmera {camera_deletada}"
    )
    return {"message": "Câmera removida com sucesso"}


@app.websocket("/api/ws/camera/{camera_id}")
async def conexao_websocket_camera(websocket: WebSocket, camera_id: int):
    await websocket.accept()
    # Buscar IP da câmera no banco
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ip FROM cameras WHERE id = %s", (camera_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        await websocket.send_text(json.dumps({"erro": "Câmera não encontrada no banco."}))
        await websocket.close()
        return
    ip = row[0]
    rtsp_url = ip
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        await websocket.send_text(json.dumps({"erro": "Não foi possível conectar à câmera."}))
        await websocket.close()
        return
    dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
    modelo_yolo = YOLO(model_path)
    ultimo_save = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            resultados = modelo_yolo.predict(frame, imgsz=img_size, device=dispositivo, half=True)[0]
            for caixa in resultados.boxes:
                x1, y1, x2, y2 = map(int, caixa.xyxy[0])
                classe = modelo_yolo.names[int(caixa.cls[0])]
                conf = float(caixa.conf[0])
                cor = cores_classes.get(classe, (255, 255, 255))
                cv2.rectangle(frame, (x1, y1), (x2, y2), cor, 1)
                draw_label(frame, f"{classe}: {conf:.2f}", x1, y1, cor)        
            # 🧠 Salvar a cada 3 segundos
            agora = time.time()
            if agora - ultimo_save >= 3.0:
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
                os.makedirs(img_real_time, exist_ok=True)
                nome_arquivo = f"cam{camera_id}_{timestamp}.jpg"
                caminho = os.path.join(img_real_time, nome_arquivo)
                cv2.imwrite(caminho, frame)
                ultimo_save = agora
            _, buffer = cv2.imencode(".jpg", frame)
            frame_saida = base64.b64encode(buffer).decode("utf-8")
            await websocket.send_text(json.dumps({"frame": frame_saida}))
    except Exception as e:
        print(f"Erro na câmera {camera_id}: {e}")
    finally:
        cap.release()
        await websocket.close()





@app.delete("/api/delete-batch")
async def delete_batch(request: DeleteRequest, token: dict = Depends(verificar_token)):
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
    log_operation(
    token["user_id"],
    f"Deletou todas as imagens da pasta {request.folder}"
    )
    return {"success": True, "deleted": deleted_files}


@app.delete("/api/delete")
def delete_file(request: DeleteFileRequest, token: dict = Depends(verificar_token)):
    folder_path = os.path.join(IMAGES_DIR, request.folder)
    file_path = os.path.join(folder_path, request.filename)
    
    if os.path.exists(file_path):
        os.remove(file_path)
        log_operation(
        token["user_id"],
        f"Deletou o arquivo {request.filename}"
        )
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
                files = []
                for f in os.listdir(folder_path):
                    path = os.path.join(folder_path, f)
                    if os.path.isfile(path):
                        mtime = os.path.getmtime(path)
                        files.append({
                            "name": f,
                            "date": datetime.fromtimestamp(mtime).strftime("%d/%m/%Y %H:%M")
                        })
                folders.append({"name": folder, "files": files})
        return JSONResponse(content={"folders": folders})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)



# Função para desenhar rótulos com fundo colorido
def draw_label(imagem, text, x, y, color):
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.2  # Aumentar fonte
    thickness = 1
    (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)

    # Criar fundo atrás do texto
    cv2.rectangle(
        imagem,
        (x, y - text_height - 10),
        (x + text_width + 10, y),
        color,
        -1  # -1 Preenchimento total
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
async def inferencia_imagem(file: UploadFile = File(...), token: dict = Depends(verificar_token)):
    try:
        dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
        modelo_yolo = YOLO(model_path)
        conteudo_imagem = await file.read()
        array_bytes = np.frombuffer(conteudo_imagem, np.uint8)
        imagem = cv2.imdecode(array_bytes, cv2.IMREAD_COLOR)
        resultado = modelo_yolo.predict(imagem, imgsz=img_size, device=dispositivo, half=True, conf=confidence)[0]

        for caixa in resultado.boxes:
            x1, y1, x2, y2 = map(int, caixa.xyxy[0])
            classe = resultado.names[int(caixa.cls[0])]
            conf = float(caixa.conf[0])
            cor = cores_classes.get(classe, (255, 255, 255))
            cv2.rectangle(imagem, (x1, y1), (x2, y2), cor, 1)
            draw_label(imagem, f"{classe}: {conf:.2f}", x1, y1, cor)

        os.makedirs(img_statica, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]
        nome_arquivo = f"detectado_{timestamp}.jpg"
        caminho_imagem = os.path.join(img_statica, nome_arquivo)
        cv2.imwrite(caminho_imagem, imagem)
        _, buffer_codificado = cv2.imencode(".jpg", imagem)
        imagem_base64 = base64.b64encode(buffer_codificado).decode("utf-8")
        log_operation(
        token["user_id"],
        f"Salvou Foto {nome_arquivo}"
        )
        return JSONResponse(content={"frame": imagem_base64, "path": caminho_imagem})
    except Exception as e:
        return JSONResponse(content={"erro": str(e)}, status_code=500)



@app.post("/api/predict_video")
async def inferencia_video(file: UploadFile = File(...), token: dict = Depends(verificar_token)):
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

        resultado = modelo_yolo.predict(frame, imgsz=img_size, device=dispositivo, half=True, conf=confidence)[0]


        for caixa in resultado.boxes:
            x1, y1, x2, y2 = map(int, caixa.xyxy[0])
            classe = resultado.names[int(caixa.cls[0])]
            conf = float(caixa.conf[0])
            cor = cores_classes.get(classe, (255, 255, 255))
            cv2.rectangle(frame, (x1, y1), (x2, y2), cor, 1)
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

    log_operation(
    token["user_id"],
    f"Salvou Video {video_nome_processado}"
    )
    
    # Retorna o caminho correto do vídeo salvo
    video_url = f"/videos/{os.path.basename(caminho_video_processado)}"
    return JSONResponse(content={"video_url": video_url, "path": caminho_video_processado})


@app.websocket("/api/ws")
async def conexao_websocket(websocket: WebSocket , token: dict = Depends(verificar_token)):
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
            resultados = modelo_yolo.predict(frame, imgsz=img_size, device=dispositivo, half=True, conf=confidence, stream=True)
            log_operation(
            token["user_id"],
            f"Utilizou o Websocket"
            )
            for res in resultados:
                if not res.boxes:
                    continue
                for caixa in res.boxes:
                    x1, y1, x2, y2 = map(int, caixa.xyxy[0])
                    classe = modelo_yolo.names[int(caixa.cls[0])]
                    conf = float(caixa.conf[0])
                    cor = cores_classes.get(classe, (255, 255, 255))
                    cv2.rectangle(frame, (x1, y1), (x2, y2), cor, 1)
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
