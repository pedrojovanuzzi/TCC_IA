import os
import random

# Caminho do dataset (modifique conforme necessário)
dataset_path = "./"

# Pastas que precisam ser processadas
folders = ["train", "valid", "test"]

# Número máximo de imagens/labels a manter
max_files = 1000

def clean_dataset(folder_path):
    image_folder = os.path.join(folder_path, "images")
    label_folder = os.path.join(folder_path, "labels")
    
    image_extensions = (".jpg", ".jpeg", ".png", ".bmp", ".webp")  

    # Listar imagens e labels
    images = [f for f in os.listdir(image_folder) if f.lower().endswith(image_extensions)]
    labels = [f for f in os.listdir(label_folder) if f.endswith(".txt")]

    # Criar sets com os nomes base (sem extensão)
    image_set = {os.path.splitext(img)[0] for img in images}
    label_set = {os.path.splitext(lbl)[0] for lbl in labels}

    # Encontrar pares correspondentes
    valid_pairs = sorted(image_set & label_set)  

    if not valid_pairs:
        print(f"⚠️ Nenhum par encontrado em {folder_path}/images e {folder_path}/labels.")
        return

    # Se houver mais do que o necessário, seleciona aleatoriamente 1000
    if len(valid_pairs) > max_files:
        valid_pairs = random.sample(valid_pairs, max_files)  

    valid_pairs = set(valid_pairs)  

    # Remover imagens e labels que não fazem parte dos pares escolhidos
    for img in images:
        if os.path.splitext(img)[0] not in valid_pairs:
            os.remove(os.path.join(image_folder, img))

    for lbl in labels:
        if os.path.splitext(lbl)[0] not in valid_pairs:
            os.remove(os.path.join(label_folder, lbl))

    print(f"✅ {folder_path}: {len(valid_pairs)} pares mantidos.")

# Processar cada pasta
for folder in folders:
    folder_path = os.path.join(dataset_path, folder)
    if os.path.exists(folder_path):
        clean_dataset(folder_path)
    else:
        print(f"❌ Pasta não encontrada: {folder_path}")
