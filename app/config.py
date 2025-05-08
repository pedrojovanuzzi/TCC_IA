import os
import socket
from dotenv import load_dotenv
from base64 import urlsafe_b64decode

load_dotenv()
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IS_LOCAL  = os.getenv("LOCAL") == "true"
TRAIN     = os.getenv("TRAIN", "train7")
MODEL_PT  = os.path.join(BASE_DIR, "runs", "detect", TRAIN, "weights", "best.pt")
MODEL_E   = os.path.join(BASE_DIR, "runs", "detect", TRAIN, "weights", "best.engine")
MODEL_PATH= MODEL_E if IS_LOCAL else MODEL_PT
VIDEO_DIR = os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "video_treinado")
IMG_STATIC_DIR   = os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_statica")
IMG_REAL_TIME_DIR= os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens", "img_real_time")
IMAGES_DIR       = os.path.join(BASE_DIR, "frontend", "tcc_frontend", "public", "imagens")
CORES_CLASSES = {
    "glasses": (128,0,128),"helmet":(0,255,0),"glove":(255,255,0),
    "hands":(0,255,255),"head":(255,0,0),"belt":(0,165,255),
    "no_glasses":(255,0,255),"no_belt":(0,0,255),"boots":(255,128,0),
}
CONFIDENCE = 0.5
IMG_SIZE   = 640
ENCRYPTION_KEY = os.getenv("6nGI2Rp9DQszezo-txX9KReN3mHqKOMpSlWlVHQuQ2o=")

