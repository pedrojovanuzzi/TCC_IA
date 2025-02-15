import os

# Configurações
base_path = "./"  # Altere se necessário
max_samples = 2000  # Máximo de arquivos a manter por classe

# Perguntar ao usuário qual classe deseja reduzir
class_to_reduce = 1 
class_to_reduce = str(class_to_reduce)  # Converte para string

# Função para remover excessos
def clean_dataset(split):
    images_path = os.path.join(base_path, split, "images")
    labels_path = os.path.join(base_path, split, "labels")

    # Garantir que as pastas existem
    if not os.path.exists(images_path) or not os.path.exists(labels_path):
        print(f"Pasta {split} não encontrada, pulando...")
        return

    # Criar dicionário para contar instâncias de cada classe
    class_instances = {}

    # Listar arquivos de labels
    label_files = [f for f in os.listdir(labels_path) if f.endswith(".txt")]

    # Contar quantas labels existem para cada classe
    for label_file in label_files:
        label_path = os.path.join(labels_path, label_file)
        with open(label_path, "r") as file:
            lines = file.readlines()
        
        for line in lines:
            class_num = line.split()[0]  # Pega o primeiro número (classe)
            if class_num not in class_instances:
                class_instances[class_num] = []
            class_instances[class_num].append(label_file)

    # Verificar se a classe escolhida tem mais do que o limite permitido
    if class_to_reduce in class_instances and len(class_instances[class_to_reduce]) > max_samples:
        excess_files = class_instances[class_to_reduce][max_samples:]  # Seleciona os que devem ser removidos

        print(f"Removendo {len(excess_files)} arquivos da classe {class_to_reduce} em {split}...")

        for label_file in excess_files:
            label_path = os.path.join(labels_path, label_file)
            # Assume que a imagem pode ser .jpg ou .png
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
