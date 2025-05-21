import cv2
import os
import time
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

url = os.getenv("MONITORINGFRAMES")

output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_frames")
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(url)
if not cap.isOpened():
    raise RuntimeError("Erro ao acessar a câmera RTSP.")

count = 0
intervalo_segundos = 1

print("[INFO] Capturando frames automaticamente... Pressione Ctrl+C para parar.")

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        img_name = f"frame_{count:04d}.jpg"
        cv2.imwrite(os.path.join(output_dir, img_name), frame)
        print(f"[SALVO] {img_name}")
        count += 1

        time.sleep(intervalo_segundos)

except KeyboardInterrupt:
    print("\n[INFO] Captura encerrada pelo usuário.")

cap.release()
