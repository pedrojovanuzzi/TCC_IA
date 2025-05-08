from ultralytics import YOLO


# NANO yolov12n / MEDIUM yolov11m
model_path = "./yolo12s.pt"

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
        data="dataset.yaml",
        epochs=300,
        imgsz=640,
        batch=-1,
        optimizer='auto',
        device=0,
        half=True,
        amp=True,
    )


