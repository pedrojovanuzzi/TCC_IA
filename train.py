from ultralytics import YOLO
import os
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

# NANO yolov12n / MEDIUM yolov11m
model_path = "./yolo12m.pt"

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
        data="dataset.yaml",
        epochs=300,
        imgsz=416,
        batch=-1,
        optimizer='auto',
        device=0,
        patience=50,
        half=True,
        amp=True,
    )


print("Modelo pronto para inferência com SAHI!")
