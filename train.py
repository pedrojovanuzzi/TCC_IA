from ultralytics import YOLO
import os
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

# NANO yolov11n / MEDIUM yolov11m
# model = YOLO("./yolo11m.pt")


# Caminho do modelo treinado
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "runs", "detect", "train10", "weights", "best.pt")

# Confirma se o arquivo do modelo existe
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
        data="dataset.yaml",
        epochs=300,
        imgsz=640,
        batch=-1,
        optimizer="AdamW",
        device=0,
        workers=4,
        cache="disk",
        patience=10,
        half=True,
        amp=True
    )

# INFERÊNCIA USANDO SAHI EM TEMPO REAL (para WebSocket ou vídeo)
detection_model = AutoDetectionModel.from_pretrained(
    model_type="ultralytics",
    model_path=model_path,
    confidence_threshold=0.3,
    device="cuda"
)

print("Modelo pronto para inferência com SAHI!")
