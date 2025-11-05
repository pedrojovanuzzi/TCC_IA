from datetime import datetime, timedelta  # utilitários de data/tempo para expiração do token
from fastapi import Depends, HTTPException, status  # Depends injeta dependências; HTTPException para erros HTTP; status (não utilizado aqui)
from fastapi.security import OAuth2PasswordBearer  # esquema OAuth2 com fluxo password para extrair token do header Authorization
from dotenv import load_dotenv  # carrega variáveis de ambiente do arquivo .env
import os  # acesso a variáveis de ambiente e utilidades do sistema
from jose import JWTError, jwt  # biblioteca JOSE para codificar/decodificar JWT e tratar erros

load_dotenv()  # carrega as variáveis definidas no .env para o ambiente de execução

SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # chave secreta usada para assinar/validar o JWT (deve estar no .env)
ALGORITHM = "HS256"  # algoritmo de assinatura do token (HMAC-SHA256)
EXPIRE_MINUTES = 60  # tempo de expiração do token em minutos

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")  # extrai o token Bearer do header e aponta a URL de obtenção do token

def criar_token(data: dict):  # cria e retorna um JWT assinado a partir de um payload
    to_encode = data.copy()  # copia o payload para não mutar o original
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)  # calcula horário UTC de expiração
    to_encode.update({"exp": expire})  # adiciona claim 'exp' (expiração) ao payload
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # assina e codifica o JWT com a SECRET_KEY e algoritmo definido

def verificar_token(token: str = Depends(oauth2_scheme)):  # valida o JWT recebido via OAuth2 (Authorization: Bearer <token>)
    try:  # tenta decodificar e validar o token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # decodifica o JWT e valida a assinatura/algoritmo
        user_id: int = payload.get("user_id")  # extrai o id do usuário do payload
        nivel: int = payload.get("nivel")  # extrai o nível/perfil de acesso do payload
        username: str = payload.get("username")  # 👈 aqui

        if user_id is None or username is None:  # valida presença de campos obrigatórios
            raise HTTPException(status_code=401, detail="Token inválido.")  # retorna 401 se o token não contiver os dados esperados

        return {"user_id": user_id, "nivel": nivel, "username": username}  # retorna um dicionário padronizado com dados do usuário autenticado

    except JWTError:  # trata erros de assinatura, expiração ou formato do JWT
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")  # retorna 401 informando token inválido/expirado
