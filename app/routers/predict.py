import io  # módulo para fluxos de dados em memória
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException  # utilitários do FastAPI (rotas, dependências, uploads, exceções)
from fastapi.responses import StreamingResponse  # resposta em streaming (bytes/arquivo)
from starlette.responses import JSONResponse  # resposta JSON (não usada diretamente aqui)
from ..config import MODEL_PATH, CONFIDENCE, IMG_SIZE, IMG_STATIC_DIR, IMG_CATRACA, VIDEO_DIR, CORES_CLASSES, ENCRYPTION_KEY  # configurações do app/modelo/paths/cores/chave
from ..database import get_connection  # função para abrir conexão com o banco
from ..utils import enviar_email_em_background, log_operation, verificar_e_enviar_alerta  # utilitários: e-mail assíncrono, logging, alerta
from ..auth import verificar_token  # dependência para validar token do usuário
from ultralytics import YOLO  # modelo YOLO para detecção
from cryptography.fernet import Fernet  # criptografia simétrica de arquivos
import torch, cv2, numpy as np, base64, tempfile, shutil, time, os, subprocess  # libs de IA/visão/FS/sistema
from datetime import datetime  # timestamps para nomes de arquivos e logs
import imageio_ffmpeg  # localiza binário do ffmpeg para conversão de vídeo


router = APIRouter()  # cria roteador do FastAPI
fernet = Fernet(ENCRYPTION_KEY)  # inicializa cifrador com chave do config


def draw_label(img, text, x, y, color):  # desenha fundo e texto de rótulo em (x,y)
    font = cv2.FONT_HERSHEY_SIMPLEX  # fonte do texto
    scale = 0.2  # escala do texto
    thickness = 1  # espessura dos traços
    w, h = cv2.getTextSize(text, font, scale, thickness)[0]  # mede o texto para dimensionar o retângulo
    cv2.rectangle(img, (x, y - h - 10), (x + w + 10, y), color, -1)  # retângulo de fundo preenchido
    cv2.putText(img, text, (x + 5, y - 5), font, scale, (0, 0, 0), thickness)  # escreve texto em preto sobre o fundo


@router.post("/predict")  # rota para inferência em imagem única
async def inferir(
    file: UploadFile = File(...),  # arquivo de imagem enviado
    camera_name: str = Form(...),  # nome da câmera vindo do frontend
    token=Depends(verificar_token)  # valida token e injeta dados do usuário
):
    # --- Configuração YOLO ---
    device = "cuda" if torch.cuda.is_available() else "cpu"  # escolhe GPU se disponível
    model = YOLO(MODEL_PATH)  # carrega o modelo YOLO do caminho configurado

    # --- Leitura do arquivo ---
    content = await file.read()  # lê bytes do upload
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)  # decodifica para imagem OpenCV (BGR)

    # --- Inferência ---
    result = model.predict(
        img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE  # roda predição com tamanho e confiança definidos
    )[0]  # pega o primeiro (e único) resultado

    # --- Conexão ao banco ---
    conn = get_connection()  # abre conexão com BD
    cursor = conn.cursor()  # cria cursor SQL

    # --- Gera nome e caminho da imagem ---
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]  # timestamp com milissegundos
    filename = f"detectado_{ts}.jpg"  # nome do arquivo de saída
    os.makedirs(IMG_STATIC_DIR, exist_ok=True)  # garante diretório existente
    path = os.path.join(IMG_STATIC_DIR, filename)  # caminho absoluto do arquivo

    # --- Classes consideradas seguras ---
    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}  # EPI válidos

    # --- Variável para controlar se houve risco ---
    houve_risco = False  # assume sem risco até provar o contrário

    # --- Processa resultados e grava no banco ---
    for box in result.boxes:  # itera cada detecção
        x1, y1, x2, y2 = map(int, box.xyxy[0])  # converte bbox para inteiros
        cls = model.names[int(box.cls[0])]  # nome da classe detectada
        conf = float(box.conf[0])  # confiança da detecção
        color = CORES_CLASSES.get(cls, (255, 255, 255))  # cor por classe (fallback branco)

        # desenha bounding box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)  # retângulo ao redor do objeto
        draw_label(img, f"{cls}:{conf:.2f}", x1, y1, color)  # rótulo com classe e confiança

        # ⚠️ marca risco se a classe não for segura
        if cls not in CLASSES_SEGURO:  # se não for EPI considerado seguro
            houve_risco = True  # ativa flag de risco

        # insere no banco
        cursor.execute("""  # insere registro da detecção
            INSERT INTO detections 
            (user_id, image_name, image_path, class_name, confidence,
             x1, y1, x2, y2, device, model_name, camera_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            token["user_id"],  # associa ao usuário autenticado
            filename,  # nome da imagem salva
            path,  # caminho do arquivo
            cls,  # classe detectada
            conf,  # confiança
            x1, y1, x2, y2,  # coordenadas do bbox
            device,  # dispositivo usado (cpu/cuda)
            "YOLO",  # nome do modelo
            camera_name  # origem/câmera
        ))

    # --- Finaliza gravação ---
    conn.commit()  # persiste inserts
    cursor.close()  # fecha cursor
    conn.close()  # fecha conexão

    # --- Salva e criptografa a imagem ---
    cv2.imwrite(path, img)  # grava imagem anotada
    with open(path, "rb") as f:  # abre para ler bytes
        data = f.read()  # lê conteúdo
    encrypted = fernet.encrypt(data)  # criptografa bytes
    with open(path, "wb") as f:  # reabre para escrita
        f.write(encrypted)  # sobrescreve com conteúdo criptografado

    # --- Loga operação ---
    log_operation(token["user_id"], f"Salvou e criptografou {filename} ({camera_name})")  # registra no log de auditoria

    # 🚨 Envia e-mail apenas se houver risco
    if houve_risco:  # se detectou item perigoso/ausência de EPI
        print(f"🚨 Risco detectado — enviando alerta por e-mail ({camera_name})")  # log no console
        enviar_email_em_background(result, path)  # dispara envio de e-mail em background
    else:
        print(f"✅ Nenhum risco detectado ({camera_name}) — e-mail não enviado")  # informa que não houve alerta

    # --- Retorna imagem processada ---
    ok, buf = cv2.imencode(".jpg", img)  # codifica imagem anotada em JPEG na memória
    if not ok:  # valida codificação
        raise HTTPException(500, "Falha ao codificar imagem")  # erro 500 se falhar

    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type="image/jpeg")  # responde com imagem em streaming


@router.post("/predict_catraca")  # rota para a catraca com vínculo a um user_id
async def inferir(
    file: UploadFile = File(...),  # imagem enviada
    camera_name: str = Form(...),  # câmera de origem
    user_id: int = Form(...),   # ID do funcionário informado pelo frontend
    token=Depends(verificar_token),  # autenticação via token
):
    device = "cuda" if torch.cuda.is_available() else "cpu"  # escolhe GPU se disponível
    model = YOLO(MODEL_PATH)  # carrega YOLO

    # --- 1️⃣ Conexão com o banco
    conn = get_connection()  # abre conexão
    cursor = conn.cursor()  # cursor simples

    # --- 2️⃣ Verifica se o usuário existe na tabela `users`
    cursor.execute("SELECT id, login FROM users WHERE id = %s", (user_id,))  # busca usuário por id
    user = cursor.fetchone()  # pega um único resultado

    if not user:  # se não encontrou
        cursor.close()  # fecha cursor
        conn.close()  # fecha conexão
        raise HTTPException(  # retorna 404
            status_code=404,
            detail=f"Usuário com ID {user_id} não encontrado."
        )

    user_login = user[1]  # nome de login do usuário
    print(f"🧍 Funcionário encontrado: {user_login} (id={user_id})")  # log informativo

    # --- 3️⃣ Lê a imagem recebida
    content = await file.read()  # lê bytes do upload
    img = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)  # converte para imagem BGR

    # --- 4️⃣ Executa YOLO
    result = model.predict(
        img, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE  # parâmetros de inferência
    )[0]  # resultado único

    # --- 5️⃣ Define caminho para salvar imagem
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")[:-3]  # timestamp
    filename = f"catraca_{ts}.jpg"  # nome do arquivo
    os.makedirs(IMG_CATRACA, exist_ok=True)  # garante diretório
    path = os.path.join(IMG_CATRACA, filename)  # compõe caminho

    # --- 6️⃣ Analisa classes detectadas
    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}  # classes de EPI aceitas
    houve_risco = False  # flag de risco

    for box in result.boxes:  # itera detecções
        x1, y1, x2, y2 = map(int, box.xyxy[0])  # bbox inteiro
        cls = model.names[int(box.cls[0])]  # classe pelo índice
        conf = float(box.conf[0])  # confiança float
        color = CORES_CLASSES.get(cls, (255, 255, 255))  # cor por classe

        # desenha no frame
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)  # box na imagem
        draw_label(img, f"{cls}:{conf:.2f}", x1, y1, color)  # rótulo

        # marca se houve risco
        if cls not in CLASSES_SEGURO:  # se classe não é segura
            houve_risco = True  # sinaliza risco

        # insere detecção no banco
        cursor.execute("""  # registra detecção vinculada ao user_id
            INSERT INTO detections
            (user_id, image_name, image_path, class_name, confidence,
             x1, y1, x2, y2, device, model_name, camera_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,  # funcionário na catraca
            filename,  # nome do arquivo
            path,  # caminho do arquivo
            cls,  # classe detectada
            conf,  # confiança
            x1, y1, x2, y2,  # bbox
            device,  # cpu/cuda
            "YOLO",  # modelo
            camera_name  # câmera
        ))

    conn.commit()  # persiste inserts
    cursor.close()  # fecha cursor
    conn.close()  # fecha conexão

    # --- 7️⃣ Salva imagem criptografada
    cv2.imwrite(path, img)  # grava imagem anotada
    with open(path, "rb") as f:  # abre para leitura
        enc = fernet.encrypt(f.read())  # criptografa bytes
    with open(path, "wb") as f:  # abre para escrita
        f.write(enc)  # sobrescreve com dados cifrados

    # --- 8️⃣ Loga operação
    log_operation(user_id, f"Funcionário {user_login} passou na catraca ({camera_name})")  # log de auditoria

    # --- 9️⃣ Se houve risco, envia alerta
    if houve_risco:  # se algum EPI faltou ou houve classe perigosa
        enviar_email_em_background(result, path)  # dispara e-mail de alerta

    # --- 🔟 Retorna imagem processada
    ok, buf = cv2.imencode(".jpg", img)  # codifica JPEG
    if not ok:  # valida codificação
        raise HTTPException(500, "Falha ao codificar imagem")  # erro 500

    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type="image/jpeg")  # responde imagem


@router.post("/predict_video")  # rota para processar vídeo e registrar detecções periódicas
async def inferir_video(
    file: UploadFile = File(...),  # arquivo de vídeo enviado
    camera_name: str = Form(...),  # nome da câmera (metadado)
    token=Depends(verificar_token)  # autenticação
):
    device = "cuda" if torch.cuda.is_available() else "cpu"  # escolhe GPU quando possível
    model = YOLO(MODEL_PATH)  # carrega YOLO

    # --- grava temporário ---
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")  # cria arquivo temporário persistente
    with open(tmp.name, "wb") as buf:  # abre para escrita binária
        shutil.copyfileobj(file.file, buf)  # copia stream do upload para o arquivo temp
    tmp.close()  # fecha descritor

    cap = cv2.VideoCapture(tmp.name)  # abre vídeo com OpenCV
    fps = int(cap.get(cv2.CAP_PROP_FPS))  # frames por segundo
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))  # largura
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))  # altura

    if fps == 0 or w == 0 or h == 0:  # valida propriedades básicas
        cap.release()  # libera recurso
        os.remove(tmp.name)  # apaga temporário
        raise HTTPException(400, "Vídeo inválido")  # erro de requisição

    os.makedirs(VIDEO_DIR, exist_ok=True)  # garante diretório de saída
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")  # timestamp para nome
    out_name = f"processado_{ts}.mp4"  # nome do arquivo de saída
    out_path = os.path.join(VIDEO_DIR, out_name)  # caminho final

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")  # codec mp4v
    out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))  # writer de vídeo de saída

    # ⚙️ classes seguras e controle de alerta
    CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}  # classes consideradas seguras
    alert_start = None  # marca início de alerta contínuo
    alert_persistente = False  # se alerta já persistiu por tempo limite
    duracao_limite = 5.0  # segundos para considerar persistência
    houve_risco = False  # ✅ flag para e-mail

    print(f"🎥 Processando vídeo ({fps} fps)...")  # log informativo

    conn = get_connection()  # conexão com BD
    cursor = conn.cursor()  # cursor simples

    frame_interval = int(fps * 10)  # salvar a cada ~10s de vídeo
    frame_count = 0  # contador de frames

    while True:  # loop de leitura de frames
        ret, frame = cap.read()  # lê próximo frame
        if not ret:  # fim do vídeo
            break  # encerra loop
        frame_count += 1  # incrementa contador

        res = model.predict(frame, imgsz=IMG_SIZE, device=device, half=True, conf=CONFIDENCE)[0]  # executa YOLO no frame
        classes_detectadas = {res.names[int(b.cls[0])] for b in res.boxes}  # set de classes presentes
        classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}  # classes não seguras

        # se houver classes perigosas em qualquer frame → marca risco
        if classes_perigosas:  # encontrou algo não seguro
            houve_risco = True  # ativa flag global

        # Desenha boxes
        for box in res.boxes:  # para cada detecção
            x1, y1, x2, y2 = map(int, box.xyxy[0])  # bbox inteiro
            cls = res.names[int(box.cls[0])]  # nome da classe
            conf = float(box.conf[0])  # confiança
            color = CORES_CLASSES.get(cls, (255, 255, 255))  # cor por classe
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)  # desenha retângulo
            draw_label(frame, f"{cls}:{conf:.2f}", x1, y1, color)  # rótulo da box

        # 🚨 alerta persistente visual
        if classes_perigosas:  # se ainda há perigo neste frame
            if alert_start is None:  # começa a contar
                alert_start = datetime.now()  # registra início
            else:
                duracao = (datetime.now() - alert_start).total_seconds()  # calcula duração
                if duracao >= duracao_limite and not alert_persistente:  # passou do limite
                    alert_persistente = True  # marca como persistente
                    print(f"🚨 Alerta persistente ({duracao:.2f}s): {classes_perigosas}")  # log no console
        else:
            alert_start = None  # zera cronômetro de persistência

        out.write(frame)  # grava frame anotado no vídeo de saída

        # 💾 salva no banco a cada 10s
        if frame_count % frame_interval == 0:  # checkpoint temporal
            tempo_segundos = frame_count / fps  # tempo corrente do vídeo
            tempo_formatado = str(datetime.utcfromtimestamp(tempo_segundos).strftime("%H:%M:%S"))  # HH:MM:SS
            print(f"💾 Salvando detecções ({tempo_formatado})...")  # log

            for box in res.boxes:  # registra cada detecção atual
                x1, y1, x2, y2 = map(int, box.xyxy[0])  # bbox
                cls = res.names[int(box.cls[0])]  # classe
                conf = float(box.conf[0])  # confiança

                cursor.execute("""  # insere snapshot de detecções periódicas
                    INSERT INTO detections
                    (user_id, image_name, image_path, class_name, confidence,
                     x1, y1, x2, y2, device, model_name, camera_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    token["user_id"],  # ID do usuário autenticado
                    out_name,  # nome do vídeo processado
                    out_path,  # caminho do arquivo de vídeo
                    cls,  # classe detectada
                    conf,  # confiança
                    x1, y1, x2, y2,  # bbox
                    device,  # cpu/cuda
                    "YOLO",  # nome do modelo
                    camera_name        # nome da câmera
                ))
            conn.commit()  # commit periódico

    cap.release()  # libera leitor de vídeo
    out.release()  # finaliza writer
    os.remove(tmp.name)  # remove arquivo temporário original

    # --- converte e criptografa ---
    web_path = out_path.replace(".mp4", "_web.mp4")  # path para versão otimizada web
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()  # localiza executável ffmpeg
    subprocess.run([  # converte com H.264 e faststart
        ffmpeg, "-i", out_path,
        "-c:v", "libx264", "-preset", "fast",
        "-crf", "23", "-movflags", "+faststart", web_path
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)  # suprime stdout/stderr no console
    if os.path.exists(web_path):  # se conversão OK
        os.remove(out_path)  # remove original
        out_path = web_path  # passa a usar o web.mp4

    with open(out_path, "rb") as f:  # lê bytes do vídeo final
        vid_data = f.read()  # carrega em memória
    enc_vid = fernet.encrypt(vid_data)  # criptografa vídeo
    with open(out_path, "wb") as f:  # abre para escrita
        f.write(enc_vid)  # salva vídeo cifrado

    log_operation(token["user_id"], f"Salvou e criptografou vídeo {os.path.basename(out_path)} ({camera_name})")  # log de auditoria

    # 🚨 só envia se houve risco
    if houve_risco:  # se algum frame teve classe perigosa
        try:
            print(f"📤 Enviando alerta por e-mail ({camera_name})...")  # log do envio
            enviar_email_em_background(res, out_path)  # envia alerta com caminho do vídeo
        except Exception as e:
            print(f"❌ Falha ao enviar vídeo: {e}")  # log de erro de envio
    else:
        print(f"✅ Nenhum risco detectado ({camera_name}) — e-mail não enviado")  # informa ausência de alerta

    cursor.close()  # fecha cursor
    conn.close()  # fecha conexão

    # --- retorna vídeo descriptografado ---
    dec_data = fernet.decrypt(enc_vid)  # descriptografa bytes para retornar
    return StreamingResponse(  # responde com vídeo mp4
        io.BytesIO(dec_data),
        media_type="video/mp4",
        headers={"Content-Disposition": f"inline; filename={os.path.basename(out_path)}"}  # sugere exibição inline
    )  # fim da resposta
