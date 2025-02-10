from ultralytics import YOLO

# Carregar modelo base pré-treinado (Transfer Learning)
model = YOLO("yolov8n.pt")

# Treinar o modelo com o novo dataset
model.train(
    data="dataset.yaml",
    epochs=30, 
    batch=16, 
    imgsz=512, 
    device=0, 
    workers=2,  # Melhor para Windows
    cache="disk"  # Usa cache no disco, mais estável
)


