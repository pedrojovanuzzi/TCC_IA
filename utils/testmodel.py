from ultralytics import YOLO
from multiprocessing import freeze_support

def run_validation():
    # Carrega o modelo
    model = YOLO("../runs/detect/train14/weights/best.pt")

    # Executa a validação
    metrics = model.val(data="./dataset.yaml")

    # Exibe os resultados
    print("mAP50:", metrics.box.map50)
    print("mAP50-95:", metrics.box.map)

if __name__ == "__main__":
    freeze_support()  # Necessário no Windows
    run_validation()
