import os

# Caminho da pasta com as imagens
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "./dataset_frames"))


pasta = BASE_DIR
# Prefixo do nome (ex: "capacete")
nome = "background"
# Parte fixa
fixo = "001"

# Pega todos os arquivos da pasta
arquivos = sorted(os.listdir(pasta))
contador = 1

for arquivo in arquivos:
    caminho_atual = os.path.join(pasta, arquivo)
    
    # Verifica se é uma imagem
    if os.path.isfile(caminho_atual) and arquivo.lower().endswith(('.jpg', '.jpeg', '.png')):
        extensao = os.path.splitext(arquivo)[1]
        novo_nome = f"{nome}{fixo}{contador}{extensao}"
        novo_caminho = os.path.join(pasta, novo_nome)

        os.rename(caminho_atual, novo_caminho)
        print(f"✅ {arquivo} → {novo_nome}")
        contador += 1
