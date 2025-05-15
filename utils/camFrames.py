import cv2
import os
import time

script_dir = os.path.dirname(os.path.abspath(__file__))

output_dir = os.path.join(script_dir, "dataset_frames")
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Erro ao acessar a câmera.")

count = 0
intervalo_segundos = 1  # salva uma imagem a cada 1 segundo

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
