# app/routers/files.py
from io import BytesIO  # Importa BytesIO para manipular dados binários em memória
from fastapi import APIRouter, Depends, HTTPException, Body  # Importa classes e funções principais do FastAPI
from fastapi.responses import StreamingResponse, JSONResponse  # Importa tipos de resposta do FastAPI
from pydantic import BaseModel  # Importa o modelo base do Pydantic para validação de dados

from app.database import get_connection  # Importa função que retorna a conexão com o banco
from app.utils import log_operation  # Importa função para registrar logs de operações
from ..schemas import DecryptRequest, DeleteFileRequest, DeleteRequest  # Importa os modelos de requisição definidos
from ..config import IMAGES_DIR, ENCRYPTION_KEY  # Importa diretório de imagens e chave de criptografia
from ..auth import verificar_token  # Importa função para validação do token JWT
from cryptography.fernet import Fernet  # Importa o algoritmo de criptografia simétrica Fernet
import base64, os, time, gc  # Importa bibliotecas padrão de manipulação de arquivos e memória
from datetime import datetime  # Importa datetime para lidar com datas e horários

router = APIRouter()  # Cria o roteador de endpoints
fernet = Fernet(ENCRYPTION_KEY)  # Inicializa o objeto de criptografia com a chave definida

@router.get("/detections")  # Define endpoint para listar detecções recentes
async def listar_detections(token=Depends(verificar_token)):  # Requer autenticação via token
    conn = get_connection()  # Cria conexão com o banco
    cursor = conn.cursor(dictionary=True)  # Cria cursor com retorno em formato de dicionário
    
    # Consulta SQL para retornar até 1000 detecções recentes
    cursor.execute("""
        SELECT 
            d.class_name,
            d.confidence,
            d.device,
            d.camera_name,
            d.created_at,
            d.user_id,
            u.name AS employee_name
        FROM detections d
        LEFT JOIN users u ON u.id = d.user_id
        ORDER BY d.created_at DESC
        LIMIT 1000
    """)

    rows = cursor.fetchall()  # Recupera todos os registros
    cursor.close()  # Fecha o cursor
    conn.close()  # Fecha a conexão
    return rows  # Retorna a lista de detecções



@router.delete("/delete")  # Define endpoint para deletar arquivo individual
def delete_file(request: DeleteFileRequest, token=Depends(verificar_token)):  # Requer token de autenticação
    path = os.path.join(IMAGES_DIR, request.folder, request.filename)  # Monta o caminho completo do arquivo
    if not os.path.exists(path):  # Verifica se o arquivo existe
        raise HTTPException(404, "Arquivo não encontrado")  # Lança erro se o arquivo não for encontrado
    os.remove(path)  # Remove o arquivo do sistema
    log_operation(token["user_id"],f"Deletou um arquivo {request.filename}")  # Registra log da operação
    return {"success": True}  # Retorna sucesso


@router.delete("/delete-batch")  # Define endpoint para deletar múltiplos arquivos
async def delete_batch(request: DeleteRequest, token=Depends(verificar_token)):  # Recebe lista de arquivos e token
    folder_path = os.path.join(IMAGES_DIR, request.folder)  # Caminho da pasta alvo
    deleted = []  # Lista para armazenar os arquivos deletados
    for fn in request.filenames:  # Percorre a lista de nomes
        p = os.path.join(folder_path, fn)  # Monta o caminho completo do arquivo
        if os.path.exists(p):  # Verifica se existe
            for _ in range(5):  # Tenta deletar até 5 vezes (caso o arquivo esteja bloqueado)
                try:
                    os.remove(p)  # Remove o arquivo
                    deleted.append(fn)  # Adiciona à lista de deletados
                    break  # Sai do loop de tentativa
                except PermissionError:  # Se o arquivo estiver em uso
                    time.sleep(0.1)  # Aguarda um pouco antes de tentar novamente
                    gc.collect()  # Força coleta de lixo para liberar o arquivo
    log_operation(token["user_id"],f"Deletou todos os arquivos da pasta {request.folder}")  # Registra operação
    return {"success": True, "deleted": deleted}  # Retorna arquivos removidos


@router.get("/gallery")  # Endpoint para listar pastas e arquivos de imagens
def list_gallery():
    result = []  # Lista final com todas as pastas e seus arquivos
    for folder in ["video_treinado", "img_statica", "img_real_time", "img_catraca"]:  # Pastas alvo
        p = os.path.join(IMAGES_DIR, folder)  # Caminho da pasta
        if os.path.isdir(p):  # Verifica se a pasta existe
            files = []  # Lista de arquivos dentro da pasta
            for f in os.listdir(p):  # Percorre os arquivos da pasta
                fp = os.path.join(p, f)  # Caminho completo do arquivo
                if os.path.isfile(fp):  # Verifica se é um arquivo
                    files.append({
                        "name": f,  # Nome do arquivo
                        "date": datetime.fromtimestamp(os.path.getmtime(fp)).strftime("%d/%m/%Y %H:%M")  # Data de modificação
                    })
            result.append({"name": folder, "files": files})  # Adiciona pasta e arquivos ao resultado final
    return {"folders": result}  # Retorna estrutura JSON contendo todas as pastas


@router.post("/decrypt_image")  # Endpoint para descriptografar imagens
def decrypt_image(
    req: DecryptRequest = Body(...),  # Corpo da requisição contendo pasta e nome do arquivo
    token=Depends(verificar_token),  # Requer token
    mode: str = "b64"  # Define o modo de saída padrão (base64)
):
    path = os.path.join(IMAGES_DIR, req.folder, req.filename)  # Caminho do arquivo
    if not os.path.exists(path):  # Verifica se existe
        raise HTTPException(404, "Arquivo não encontrado")  # Retorna erro se não existir

    data = open(path, "rb").read()  # Lê os bytes do arquivo criptografado
    try:
        dec = fernet.decrypt(data)  # Descriptografa usando a chave Fernet
    except:
        raise HTTPException(400, "Falha na descriptografia")  # Lança erro se falhar

    if mode == "blob":  # Retorna imagem em formato binário (streaming)
        return StreamingResponse(BytesIO(dec), media_type="image/jpeg")
    else:  # Retorna imagem codificada em base64
        b64 = base64.b64encode(dec).decode()  # Converte bytes em string base64
        return JSONResponse({"frame": b64})  # Retorna como JSON


@router.post("/decrypt_video")  # Endpoint para descriptografar vídeos
def decrypt_video(
    req: DecryptRequest = Body(...),  # Corpo da requisição
    token=Depends(verificar_token),  # Requer autenticação
    mode: str = "blob"  # padrão para vídeo é blob
):
    path = os.path.join(IMAGES_DIR, req.folder, req.filename)  # Caminho do vídeo criptografado
    if not os.path.exists(path):  # Verifica existência
        raise HTTPException(404, "Vídeo não encontrado")  # Lança erro se não existir
    
    data = open(path, "rb").read()  # Lê bytes do vídeo
    try:
        dec = fernet.decrypt(data)  # Descriptografa conteúdo
    except:
        raise HTTPException(400, "Falha na descriptografia")  # Lança erro se falhar

    if mode == "b64":  # Retorna vídeo codificado em base64 (pode ser pesado)
        b64 = base64.b64encode(dec).decode()  # Codifica em base64
        return JSONResponse({"video": b64})  # Retorna como JSON
    else:  # Retorna streaming de vídeo (padrão)
        return StreamingResponse(BytesIO(dec), media_type="video/mp4")  # Envia como fluxo binário
