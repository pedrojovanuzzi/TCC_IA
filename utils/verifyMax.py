import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
dirs = [
    os.path.join(BASE_DIR, "train/labels"),
    os.path.join(BASE_DIR, "valid/labels"),
    os.path.join(BASE_DIR, "test/labels"),
]

MAX_INDEX = 8  # Para nc=9 → índices válidos: 0 até 8

for label_dir in dirs:
    if not os.path.exists(label_dir):
        print(f"[AVISO] Diretório não encontrado: {label_dir}")
        continue

    print(f"[INFO] Lendo: {label_dir}")

    for file in os.listdir(label_dir):
        if not file.endswith(".txt"):
            continue
        path = os.path.join(label_dir, file)
        with open(path, "r") as f:
            lines = f.readlines()

        for i, line in enumerate(lines):
            parts = line.strip().split()
            if not parts:
                continue
            try:
                class_id = int(parts[0])
                if class_id > MAX_INDEX:
                    print(f"❌ Classe {class_id} em {path} (linha {i+1})")
            except ValueError:
                print(f"⚠️ Linha malformada: {line.strip()} em {path} (linha {i+1})")
