from ultralytics import YOLO

# Carrega o modelo treinado (pode ser .pt ou um dos pré-treinados como 'yolov8n.pt')
model = YOLO("runs/detect/train7/weights/best.pt")  # ou o caminho do seu modelo .pt

# Roda a validação no dataset de teste (usa o split 'val' que está no YAML)
metrics = model.val(data="./dataset.yaml")

# Exibe os principais resultados
print("mAP50:", metrics.box.map50)      # média de precisão com IoU=0.50
print("mAP50-95:", metrics.box.map)     # média de precisão média entre IoU 0.50 e 0.95
