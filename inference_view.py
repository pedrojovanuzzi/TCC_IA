import cv2
from ultralytics import YOLO

# Carregar o modelo treinado
model = YOLO("runs/detect/train2/weights/best.pt")

# Inicializar a webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Fazer inferência
    results = model(frame)

    # Listas para armazenar bounding boxes
    heads = []
    helmets = []

    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])  # Coordenadas da bounding box
            class_id = int(box.cls[0])  # ID da classe detectada
            confidence = float(box.conf[0])  # Confiança da detecção
            class_name = model.names[class_id]  # Nome da classe

            # Guardar bounding boxes das classes relevantes
            if class_name == "head":
                heads.append((x1, y1, x2, y2))
            elif class_name == "helmet":
                helmets.append((x1, y1, x2, y2))

            # Desenhar bounding box inicial (vermelho por padrão)
            color = (0, 0, 255)  
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"{class_name}: {confidence:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Verificar se cada cabeça tem um capacete sobreposto
    for hx1, hy1, hx2, hy2 in heads:
        wearing_helmet = False

        for hx, hy, hxw, hyh in helmets:
            # Verificar se a bounding box do capacete está dentro da bounding box da cabeça
            if hx >= hx1 and hy >= hy1 and hxw <= hx2 and hyh <= hy2:
                wearing_helmet = True
                break

        # Mudar cor da bounding box da cabeça se estiver usando capacete
        color = (0, 255, 0) if wearing_helmet else (0, 0, 255)
        text = "✅ Com Capacete" if wearing_helmet else "❌ Sem Capacete!"

        cv2.rectangle(frame, (hx1, hy1), (hx2, hy2), color, 2)
        cv2.putText(frame, text, (hx1, hy1 - 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    # Mostrar a imagem com as detecções
    cv2.imshow("Detecção de EPIs", frame)

    # Pressione 'q' para sair
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Liberar a webcam e fechar janelas
cap.release()
cv2.destroyAllWindows()
