from ultralytics import YOLO
import os
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

# NANO yolov11n / MEDIUM yolov11m
model = YOLO("./yolo11m.pt")

# Garante que o caminho do modelo seja absoluto
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "runs", "detect", "train9", "weights", "best.pt")

# Confirma se o arquivo realmente existe
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Arquivo não encontrado: {model_path}")

# Carregar modelo treinado
model.load(model_path)

if __name__ == '__main__':
    # Treinar o modelo com o novo dataset
    model.train(
        data="dataset.yaml",
        epochs=300,  # Ajuste conforme necessário
        imgsz=640,  # Tamanho da imagem
        batch=-1,  # RTX 3060 Ti suporta batch maior
        optimizer="AdamW",  # Convergência mais rápida que SGD
        device=0,  # Usa GPU
        workers=4,  # Carregamento paralelo
        cache="disk",  # Otimiza a leitura de disco
        patience=10,  # Early stopping
        half=True,  # Mixed Precision
        amp=True  # Ativa Mixed Precision Training
    )

    # INFERÊNCIA USANDO SAHI
    detection_model = AutoDetectionModel.from_pretrained(
        model_type="ultralytics",
        model_path=model_path,  # Usa o modelo treinado
        confidence_threshold=0.3,
        device="cuda"  # Usa GPU
    )

    # Teste com uma imagem
    image_path = "path/to/your/test_image.jpg"  # Substitua pelo caminho real da imagem
    result = get_sliced_prediction(
        image_path,
        detection_model,
        slice_height=256,  # Define tamanho dos cortes (ajustar conforme necessário)
        slice_width=256,
        overlap_height_ratio=0.2,
        overlap_width_ratio=0.2,
    )

    # Salvar e visualizar o resultado
    output_dir = os.path.join(script_dir, "sahi_results")
    os.makedirs(output_dir, exist_ok=True)
    result.export_visuals(export_dir=output_dir)

    print(f"Resultados salvos em {output_dir}")
