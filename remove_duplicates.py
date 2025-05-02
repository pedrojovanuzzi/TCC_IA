import os
from PIL import Image
import imagehash
import shutil

# Pasta base com os conjuntos
BASE_INPUT = "./"
BASE_OUTPUT = "dataset_sem_duplicatas"

# Tolerância de semelhança
HASH_THRESHOLD = 5

# Total geral de duplicadas
total_duplicadas = 0
total_processadas = 0

def processar_subset(subset_name):
    global total_duplicadas, total_processadas

    input_image_dir = os.path.join(BASE_INPUT, subset_name, "images")
    input_label_dir = os.path.join(BASE_INPUT, subset_name, "labels")
    output_image_dir = os.path.join(BASE_OUTPUT, subset_name, "images")
    output_label_dir = os.path.join(BASE_OUTPUT, subset_name, "labels")

    os.makedirs(output_image_dir, exist_ok=True)
    os.makedirs(output_label_dir, exist_ok=True)

    hashes = {}
    duplicadas = 0
    processadas = 0

    for img_file in os.listdir(input_image_dir):
        if not img_file.endswith(('.jpg', '.jpeg', '.png')):
            continue

        processadas += 1
        img_path = os.path.join(input_image_dir, img_file)
        try:
            with Image.open(img_path) as img:
                hash = imagehash.phash(img)

            is_duplicate = False
            for existing_hash in hashes:
                if abs(hash - existing_hash) <= HASH_THRESHOLD:
                    is_duplicate = True
                    duplicadas += 1
                    break

            if not is_duplicate:
                hashes[hash] = img_file
                label_file = img_file.rsplit('.', 1)[0] + ".txt"
                shutil.copy2(img_path, os.path.join(output_image_dir, img_file))
                shutil.copy2(os.path.join(input_label_dir, label_file), os.path.join(output_label_dir, label_file))

        except Exception as e:
            print(f"[{subset_name}] Erro com {img_file}: {e}")

    total_duplicadas += duplicadas
    total_processadas += processadas

    print(f"[{subset_name}] Total processadas: {processadas}")
    print(f"[{subset_name}] Duplicadas detectadas: {duplicadas}")
    print(f"[{subset_name}] Imagens únicas mantidas: {len(hashes)}\n")


# Processar os conjuntos
for subset in ["train", "valid", "test"]:
    processar_subset(subset)

print("="*40)
print(f"TOTAL GERAL DE IMAGENS PROCESSADAS: {total_processadas}")
print(f"TOTAL GERAL DE DUPLICADAS DETECTADAS: {total_duplicadas}")
print(f"TOTAL DE IMAGENS ÚNICAS MANTIDAS: {total_processadas - total_duplicadas}")
