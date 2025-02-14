from ultralytics import YOLO
import os

#NANO yolov11n
#MEDIUM yolov11m

# TREINAMENTO DO ZERO
# Carregar modelo base pré-treinado (Transfer Learning)
model = YOLO("./yolo11m.pt")

#Treinamento Fine-Tuning
# Garante que o caminho do modelo seja absoluto
# script_dir = os.path.dirname(os.path.abspath(__file__))
# model_path = os.path.join(script_dir, "runs", "detect", "train7", "weights", "best.pt")

# # Confirma se o arquivo realmente existe
# if not os.path.exists(model_path):
#     raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# model.load(model_path)  # Usa pesos do YOLOv8n treinado

if __name__ == '__main__':
# Treinar o modelo com o novo dataset
    model.train(
        data="dataset.yaml",
        epochs=300,  # Ajuste conforme a convergência
        imgsz=640,  # Reduz o tamanho da imagem para mais velocidade
        batch=-1,  # RTX 3060 Ti suporta batch maior
        optimizer="AdamW",  # Convergência mais rápida que SGD
        device=0,  # Usa a GPU
        workers=4,  # Carregamento paralelo de imagens
        cache="disk",  # Evita leitura repetida do disco, acelera bastante
        patience=10,  # Para automaticamente se não melhorar por 10 epochs
        half=True,  # Usa precisão mista (Mixed Precision)
        amp=True  # Ativa Mixed Precision Training para menos uso de VRAM
    )

