# Importa a classe principal YOLO da biblioteca ultralytics
from ultralytics import YOLO

# Caminho do modelo pré-treinado que será usado como base (aqui, YOLOv12 Large)
# Observação: modelos Large são bem pesados; se quiser mais velocidade, teste yolo12m.pt (Medium) ou yolo12s.pt (Small)
model_path = "./yolo12n.pt"

# Verifica se o script está sendo executado diretamente (evita reexecução em imports)
if __name__ == '__main__':

    # Cria uma instância do modelo YOLO a partir do arquivo .pt indicado
    model = YOLO(model_path)

    # Inicia o processo de treinamento com parâmetros otimizados
    model.train(
        data="data.yaml",     # Caminho do arquivo que define classes e paths do dataset
        epochs=600,           # Diminui para 100 nas primeiras execuções (testar desempenho)
        imgsz=640,            # Reduz resolução para acelerar o processamento
        batch=0,              # Usa lote de 8 imagens (ideal para 12GB de VRAM da 4070 Ti)
        workers=8,            # Usa 8 threads de CPU para carregar dados em paralelo
        cache='disk',           # Faz cache do dataset (imagens já redimensionadas ficam salvas)
        optimizer='auto',     # Deixa o YOLO escolher o melhor otimizador (AdamW geralmente)
        device=0,             # GPU 0 (sua 4070 Ti)
        half=True,            # Usa half precision (FP16), consumindo metade da VRAM
        amp=True,             # Ativa Mixed Precision (treino automático com FP16/FP32)
        verbose=True,         # Mostra logs detalhados durante o treino
    )
