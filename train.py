from ultralytics import YOLO


# NANO yolov12n / MEDIUM yolov11m
model_path = "./yolo11s.pt"

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
    data="dataset.yaml",
    epochs=300,
    imgsz=960,  # ⬆️ aumenta o input size para melhorar detecção de objetos pequenos
    batch=16,   # pode deixar -1 se quiser automático, mas 16 costuma ser bom
    optimizer='auto',
    device=0,
    half=True,
    amp=True,

    # 🔧 Aumenta a robustez com augmentações
    degrees=5,
    scale=0.5,
    translate=0.2,
    shear=2.0,
    perspective=0.0005,
    flipud=0.0,  # evitar virar de cabeça pra baixo
    fliplr=0.5,
    mosaic=1.0,
    mixup=0.1,

    # 🔬 Extra (se quiser forçar mais atenção em objetos pequenos)
    workers=4,
    close_mosaic=15,  # desativa mosaic nos últimos 15 epochs
    patience=50,
)
    

    # YOLO(model_path).train(
    #     data="dataset.yaml",
    #     epochs=300,
    #     imgsz=416,
    #     batch=-1,
    #     optimizer='auto',
    #     device=0,
    #     half=True,
    #     amp=True,
    # )