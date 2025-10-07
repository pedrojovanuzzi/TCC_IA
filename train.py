from ultralytics import YOLO


# NANO yolov12n / MEDIUM yolov11m
model_path = "./yolo12l.pt"

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
        data="data.yaml",
        epochs=300,
        imgsz=640,
        batch=16,
        optimizer='auto',
        device=0,
        half=True,
        amp=True,
    )
    




