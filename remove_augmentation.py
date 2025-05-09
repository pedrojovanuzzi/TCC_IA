import os
from PIL import Image
import imagehash
import shutil

PASTA_ORIGEM = "C:/Users/PC_PEDRO/Desktop/imagens_usadas_ia/lab.v1i.yolov11/train/images"
PASTA_DESTINO = "./sem_duplicatas"
os.makedirs(PASTA_DESTINO, exist_ok=True)

hashes = []
THRESHOLD = 5

def imagem_similar(hash_atual):
    for h in hashes:
        if abs(h - hash_atual) <= THRESHOLD:
            return True
    return False

for nome_arquivo in os.listdir(PASTA_ORIGEM):
    caminho = os.path.join(PASTA_ORIGEM, nome_arquivo)
    if not nome_arquivo.lower().endswith(('.png', '.jpg', '.jpeg')):
        continue
    try:
        with Image.open(caminho) as img:
            hash_img = imagehash.phash(img)
            if imagem_similar(hash_img):
                continue
            hashes.append(hash_img)
            shutil.copy2(caminho, os.path.join(PASTA_DESTINO, nome_arquivo))
    except:
        continue