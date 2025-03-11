from ultralytics import YOLO
import os
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

train = "train15"

# Caminho do modelo treinado
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "runs", "detect", train, "weights", "best.pt")

# Confirma se o arquivo do modelo existe
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
        data="dataset.yaml",
        epochs=300,
        imgsz=416,
        batch=-1,
        optimizer='auto',
        device=0,
        cache="disk",
        patience=50,
        half=True,
        amp=True,
    )


print("Modelo pronto para inferência com SAHI!")
