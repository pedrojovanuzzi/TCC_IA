import os
from collections import defaultdict

# Obtém automaticamente o diretório onde o script está sendo executado
script_dir = os.path.dirname(os.path.abspath(__file__))

# Caminho base relativo ao script
base_path = os.path.abspath(os.path.join(script_dir, ".."))  # Sobe um nível para acessar train, valid, test

# Pastas do dataset
splits = ["train", "valid", "test"]

# Dicionário para armazenar a contagem de instâncias por classe
class_counts = defaultdict(int)

for split in splits:
    labels_path = os.path.join(base_path, split, "labels")

    if not os.path.exists(labels_path):
        print(f"Pasta {labels_path} não encontrada, pulando...")
        continue

    label_files = [f for f in os.listdir(labels_path) if f.endswith(".txt")]

    for label_file in label_files:
        label_path = os.path.join(labels_path, label_file)
        with open(label_path, "r") as file:
            lines = file.readlines()

        for line in lines:
            class_num = line.split()[0]  # Pega a classe (primeiro número da linha)
            class_counts[class_num] += 1  # Conta a instância

# Exibir a contagem total de cada classe
print("Contagem de instâncias por classe:")
for class_id, count in sorted(class_counts.items(), key=lambda x: int(x[0])):
    print(f"Classe {class_id}: {count} instâncias")
