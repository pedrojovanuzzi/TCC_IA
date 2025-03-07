import os
import cv2
import numpy as np
from glob import glob

# Diretórios base
base_dirs = ["valid", "test", "train"]

# Criação das pastas para as imagens alteradas
output_folder = "augmented"
os.makedirs(output_folder, exist_ok=True)

def add_gaussian_noise(image):
    """Adiciona ruído gaussiano à imagem."""
    row, col, ch = image.shape
    mean = 0
    var = 10  # Variância do ruído (pode ajustar)
    sigma = var ** 0.5
    gauss = np.random.normal(mean, sigma, (row, col, ch)).astype(np.uint8)
    noisy = cv2.add(image, gauss)
    return noisy

def apply_shadow(image):
    """Adiciona sombras artificiais à imagem."""
    top_x, top_y = np.random.randint(0, image.shape[1]), 0
    bottom_x, bottom_y = np.random.randint(0, image.shape[1]), image.shape[0]
    shadow_img = image.copy()
    
    mask = np.zeros_like(image, dtype=np.uint8)
    cv2.fillPoly(mask, [np.array([[top_x, top_y], [bottom_x, bottom_y], [0, bottom_y], [0, top_y]])], (50, 50, 50))
    
    alpha = np.random.uniform(0.3, 0.7)  # Intensidade da sombra
    shadow_img = cv2.addWeighted(shadow_img, 1, mask, alpha, 0)
    return shadow_img

def adjust_image(image):
    """ Aplica transformações para alterar cor, ruído, brilho, desfoque e sombras. """
    
    # Converter para HSV e alterar matiz e saturação
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Mudança de matiz
    hue_shift = np.random.randint(-30, 30)
    hsv[:, :, 0] = np.clip(hsv[:, :, 0].astype(np.int16) + hue_shift, 0, 179).astype(np.uint8)
    
    # Mudança de saturação
    saturation_scale = np.random.uniform(0.5, 1.5)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1].astype(np.float32) * saturation_scale, 0, 255).astype(np.uint8)
    
    # Converter de volta para BGR
    image = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    # Ajuste mais agressivo de brilho e contraste
    alpha = np.random.uniform(0.6, 1.4)
    beta = np.random.randint(-50, 50)
    image = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)

    # Aplicar inversão parcial aleatória
    if np.random.rand() > 0.7:
        image = cv2.bitwise_not(image)

    # Aplicar desfoque leve com 30% de chance
    if np.random.rand() > 0.7:
        ksize = np.random.choice([3, 5])  # Tamanhos de kernel diferentes para desfoque
        image = cv2.GaussianBlur(image, (ksize, ksize), 0)

    # Aplicar ruído gaussiano com 30% de chance
    if np.random.rand() > 0.7:
        image = add_gaussian_noise(image)

    # Aplicar sombra artificial com 30% de chance
    if np.random.rand() > 0.7:
        image = apply_shadow(image)

    # Aplicar flip horizontal com 50% de chance
    if np.random.rand() > 0.5:
        image = cv2.flip(image, 1)

    return image

# Processar todas as imagens
for base in base_dirs:
    image_dir = os.path.join("..", base, "images")  # Sobe um nível para acessar train/valid/test corretamente
    label_dir = os.path.join("..", base, "labels")

    output_image_dir = os.path.join(output_folder, base, "images")
    output_label_dir = os.path.join(output_folder, base, "labels")

    os.makedirs(output_image_dir, exist_ok=True)
    os.makedirs(output_label_dir, exist_ok=True)

    image_files = glob(os.path.join(image_dir, "*.jpg")) + glob(os.path.join(image_dir, "*.png"))

    for img_path in image_files:
        img = cv2.imread(img_path)
        if img is None:
            print(f"Erro ao carregar {img_path}, pulando...")
            continue

        augmented_img = adjust_image(img)
        # Obter nome base sem extensão
        base_name = os.path.splitext(os.path.basename(img_path))[0]

        # Salvar a imagem alterada
        img_name = base_name + "_aug" + os.path.splitext(img_path)[1]
        cv2.imwrite(os.path.join(output_image_dir, img_name), augmented_img)

        # Copiar o rótulo correspondente
        label_path = os.path.join(label_dir, base_name + ".txt")
        if os.path.exists(label_path):
            new_label_path = os.path.join(output_label_dir, base_name + "_aug.txt")
            os.system(f"copy \"{label_path}\" \"{new_label_path}\"")  # Para Windows

print("🚀 Processamento concluído para todas as pastas!")
