import os
import random

# 🔹 Novo ID para substituir na classe dos labels
novo_id = 5  # Altere conforme necessário

# 🔹 Caminho do dataset (modifique conforme necessário)
dataset_path = "./corrigir_labels"

# 🔹 Pastas que precisam ser processadas
folders = ["train", "valid", "test"]

# 🔹 Número máximo de imagens/labels a manter
max_files = 30000

# 🔹 Extensões de imagem suportadas
image_extensions = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def process_folder(folder_path):
    image_folder = os.path.join(folder_path, "images")
    label_folder = os.path.join(folder_path, "labels")

    # Verifica se as pastas existem
    if not os.path.exists(image_folder) or not os.path.exists(label_folder):
        print(f"❌ Pasta não encontrada: {folder_path}")
        return

    # Listar imagens e labels
    images = [f for f in os.listdir(image_folder) if f.lower().endswith(image_extensions)]
    labels = [f for f in os.listdir(label_folder) if f.endswith(".txt")]

    # Criar sets com os nomes base (sem extensão)
    image_set = {os.path.splitext(img)[0] for img in images}
    label_set = {os.path.splitext(lbl)[0] for lbl in labels}

    # Encontrar pares correspondentes (garante que cada imagem tem seu label)
    valid_pairs = list(image_set & label_set)

    if not valid_pairs:
        print(f"⚠️ Nenhum par encontrado em {folder_path}/images e {folder_path}/labels.")
        return

    # 🔹 EMBARALHAR OS PARES PARA ESCOLHA ALEATÓRIA
    random.shuffle(valid_pairs)

    # 🔹 Selecionar apenas os `max_files` primeiros pares de forma aleatória
    valid_pairs = set(valid_pairs[:max_files])

    # 🔹 Corrigir os labels (.txt) alterando a classe
    for lbl in labels:
        nome_base = os.path.splitext(lbl)[0]
        caminho_arquivo = os.path.join(label_folder, lbl)

        if nome_base in valid_pairs:
            with open(caminho_arquivo, "r") as f:
                linhas = f.readlines()

            novas_linhas = []
            for linha in linhas:
                valores = linha.split()
                if len(valores) > 0:
                    # Alterar apenas o primeiro valor (classe YOLO)
                    valores[0] = str(novo_id)
                    novas_linhas.append(" ".join(valores) + "\n")

            # Reescrever o arquivo corrigido
            with open(caminho_arquivo, "w") as f:
                f.writelines(novas_linhas)

    # 🔹 Remover imagens e labels que não fazem parte dos pares escolhidos
    for img in images:
        if os.path.splitext(img)[0] not in valid_pairs:
            os.remove(os.path.join(image_folder, img))

    for lbl in labels:
        if os.path.splitext(lbl)[0] not in valid_pairs:
            os.remove(os.path.join(label_folder, lbl))

    print(f"✅ {folder_path}: {len(valid_pairs)} pares mantidos e labels corrigidos.")


# Processar cada pasta
for folder in folders:
    folder_path = os.path.join(dataset_path, folder)
    process_folder(folder_path)

print("\n🚀 Processamento concluído para todas as pastas!")
