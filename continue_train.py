from ultralytics import YOLO
import os

train = "train8"

# Caminho do modelo pausado
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "runs", "detect", train, "weights", "last.pt")

# Confirma se o arquivo do modelo existe
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# Treinamento do modelo (se necessário)
if __name__ == '__main__':
    YOLO(model_path).train(
        data="data.yaml",
        resume=True
    )

print("Modelo pronto para inferência com SAHI!")
