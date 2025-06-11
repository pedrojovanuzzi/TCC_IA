from ultralytics import YOLO
from multiprocessing import freeze_support

def export_model():
    model = YOLO("../runs/detect/train3/weights/best.pt")
    
    # Exporta para formato TensorRT (.engine)
    model.export(format="engine", device="cuda")  # usa GPU para exportar

if __name__ == "__main__":
    freeze_support()  # necessário no Windows
    export_model()
