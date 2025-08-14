import os
from dotenv import load_dotenv

# Determina raiz do projeto (um nível acima de app/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Carrega .env da raiz
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

# Leitura e validação da ENCRYPTION_KEY
key_str = os.getenv("ENCRYPTION_KEY")
if not key_str:
    raise Exception("❌ ENCRYPTION_KEY não encontrada no .env")

key_bytes = key_str.encode()
# print(f"🔢 Comprimento da chave (bytes): {len(key_bytes)}")
if len(key_bytes) != 44:
    raise Exception(f"❌ ENCRYPTION_KEY inválida: comprimento esperado 44, obtido {len(key_bytes)}")

ENCRYPTION_KEY = key_bytes

# Outras configurações
IS_LOCAL = os.getenv("LOCAL") == "true"
TRAIN    = os.getenv("TRAIN", "train5")

MONITORINGFRAMES = os.getenv("MONITORINGFRAMES")

MODEL_PT    = os.path.join(BASE_DIR, "runs", "detect", TRAIN, "weights", "best.pt")
MODEL_E     = os.path.join(BASE_DIR, "runs", "detect", TRAIN, "weights", "best.engine")
MODEL_PATH  = MODEL_E if IS_LOCAL else MODEL_PT

VIDEO_DIR        = os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "video_treinado")
IMG_STATIC_DIR   = os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_statica")
IMG_REAL_TIME_DIR= os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_real_time")
IMAGES_DIR       = os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens")

CORES_CLASSES = {
    "glasses": (128,0,128),"helmet":(0,255,0),"glove":(255,255,0),
    "hands":(0,255,255),"head":(255,0,0),"belt":(0,165,255),
    "no_glasses":(255,0,255),"no_belt":(0,0,255),"boots":(255,128,0),
}

CONFIDENCE = 0.362
IMG_SIZE   = 1280
