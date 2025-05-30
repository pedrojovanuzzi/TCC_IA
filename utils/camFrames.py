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

print("[INFO] Capturando frames automaticamente... Pressione 'q' para sair.")

last_time = time.time()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Mostra a imagem na janela
    cv2.imshow("Captura da Câmera", frame)

    # Salva frame a cada X segundos
    if time.time() - last_time >= intervalo_segundos:
        img_name = f"frame_{count:04d}.jpg"
        cv2.imwrite(os.path.join(output_dir, img_name), frame)
        print(f"[SALVO] {img_name}")
        count += 1
        last_time = time.time()

    # Sai ao pressionar 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
