from ultralytics import YOLO


# TREINAMENTO DO ZERO
# Carregar modelo base pré-treinado (Transfer Learning)
# model = YOLO("yolov8n.pt")

# if __name__ == '__main__':
# # Treinar o modelo com o novo dataset
#     model.train(
#         data="dataset.yaml",
#         epochs=30, 
#         batch=16, 
#         imgsz=512, 
#         device=0,
#         workers=4,  # Melhor para Windows
#         cache="disk", # Usa cache no disco, mais estável
#         patience=20  # Para se não houver melhoria por 20 epochs
#     )


#Treinamento Fine-Tuning
model = YOLO("./runs/train4/weights/best.pt")

if __name__ == '__main__':
# Treinar o modelo com o novo dataset
    model.train(
        data="dataset.yaml",
        epochs=30, 
        batch=16, 
        imgsz=512, 
        device=0,
        workers=4,  # Melhor para Windows
        cache="disk", # Usa cache no disco, mais estável
        patience=20  # Para se não houver melhoria por 20 epochs
    )