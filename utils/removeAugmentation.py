import os
from collections import defaultdict

# Caminho absoluto da pasta de imagens
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
image_dir = os.path.join(BASE_DIR, "train", "images")

# Verifica se o diretório existe
if not os.path.isdir(image_dir):
    raise FileNotFoundError(f"Pasta não encontrada: {image_dir}")

# Lista arquivos da pasta
all_images = os.listdir(image_dir)

# Agrupa arquivos por prefixo base (antes do primeiro ponto final)
groups = defaultdict(list)
for filename in all_images:
    prefix = filename.split('.')[0]  # "_297_png"
    groups[prefix].append(filename)

# Marca para remover todos os arquivos repetidos (deixa só 1 por grupo)
to_delete = []
for file_list in groups.values():
    file_list.sort()  # opcional: manter o mais "antigo" ou "curto"
    to_delete.extend(file_list[1:])  # mantém só o primeiro

# Remove os arquivos duplicados
for filename in to_delete:
    full_path = os.path.join(image_dir, filename)
    os.remove(full_path)
    print(f"Removido: {filename}")
