import os

# Obtém automaticamente o diretório onde o script está sendo executado
script_dir = os.path.dirname(os.path.abspath(__file__))

# Caminho base relativo ao script
base_path = os.path.abspath(os.path.join(script_dir, ".."))  # Sobe um nível para acessar train, valid, test

max_samples = 1842  # Máximo de arquivos a manter por classe

# Perguntar ao usuário qual classe deseja reduzir
class_to_reduce = "1"  # Convertido para string

# Função para remover excessos
def clean_dataset(split):
    images_path = os.path.join(base_path, split, "images")
    labels_path = os.path.join(base_path, split, "labels")

    # Garantir que as pastas existem
    if not os.path.exists(images_path) or not os.path.exists(labels_path):
        print(f"Pasta {split} não encontrada, pulando...")
        return

    # Dicionário para armazenar os arquivos que contêm a classe escolhida
    class_files = []

    # Listar arquivos de labels
    label_files = [f for f in os.listdir(labels_path) if f.endswith(".txt")]

    # Identificar arquivos que possuem a classe escolhida
    for label_file in label_files:
        label_path = os.path.join(labels_path, label_file)
        with open(label_path, "r") as file:
            lines = file.readlines()
        
        # Verifica se a classe escolhida está no arquivo
        if any(line.split()[0] == class_to_reduce for line in lines):
            class_files.append(label_file)

    # Verificar se a classe escolhida tem mais do que o limite permitido
    if len(class_files) > max_samples:
        excess_files = class_files[max_samples:]  # Seleciona os que devem ser removidos

        print(f"Removendo {len(excess_files)} arquivos da classe {class_to_reduce} em {split}...")

        for label_file in excess_files:
            label_path = os.path.join(labels_path, label_file)
            image_path_jpg = os.path.join(images_path, label_file.replace(".txt", ".jpg"))
            image_path_png = os.path.join(images_path, label_file.replace(".txt", ".png"))

            # Remove label
            if os.path.exists(label_path):
                os.remove(label_path)

            # Remove imagem correspondente se existir
            if os.path.exists(image_path_jpg):
                os.remove(image_path_jpg)
            elif os.path.exists(image_path_png):
                os.remove(image_path_png)

# Aplicar nas pastas train, valid e test
for dataset_split in ["train", "valid", "test"]:
    clean_dataset(dataset_split)

print("Limpeza concluída!")
