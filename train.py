from ultralytics import YOLO

# Carregar modelo base pré-treinado (Transfer Learning)
model = YOLO("yolov8n.pt")

if __name__ == '__main__':
# Treinar o modelo com o novo dataset
    model.train(
        data="dataset.yaml",
        epochs=50, 
        batch=16, 
        imgsz=512, 
        device=0,
        workers=4,  # Melhor para Windows
        cache="disk", # Usa cache no disco, mais estável
        patience=10  # Para se não houver melhoria por 10 epochs
    )


