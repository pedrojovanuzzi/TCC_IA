from ultralytics import YOLO
import os

# TREINAMENTO DO ZERO
# Carregar modelo base pré-treinado (Transfer Learning)
# model = YOLO("yolov8n.pt")

#Treinamento Fine-Tuning
# Garante que o caminho do modelo seja absoluto
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "runs", "detect", "train5", "weights", "best.pt")

# Confirma se o arquivo realmente existe
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# Carrega o modelo
model = YOLO(model_path)

if __name__ == '__main__':
# Treinar o modelo com o novo dataset
    model.train(
        data="dataset.yaml",
        epochs=100,
        imgsz=768,
        batch=16,
        augment=True,  # Ativa data augmentation
        mosaic=1.0,  # Mistura imagens para variação
        hsv_h=0.015,  # Ajusta matiz
        hsv_s=0.7,  # Ajusta saturação
        hsv_v=0.4,  # Ajusta brilho
        scale=0.5,  # Permite objetos menores no dataset
        device=0,
        workers=4,  # Melhor para Windows
        cache="disk", # Usa cache no disco, mais estável
        patience=20  # Para se não houver melhoria por 20 epochs
    )
