from ultralytics import YOLO
import os

train = "train24"

# Caminho do modelo pausado
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "runs", "detect", train, "weights", "last.pt")

# Confirma se o arquivo do modelo existe
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
        data="dataset.yaml",
        epochs=300,
        imgsz=416,
        batch=32,
        optimizer='auto',
        device=0,
        cache="disk",
        patience=50,
        half=True,
        amp=True,
        resume=True,
        project="runs/detect",  # Define a pasta principal
    )

print("Modelo pronto para inferência com SAHI!")
