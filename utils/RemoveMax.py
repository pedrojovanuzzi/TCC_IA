import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
dirs = [
    os.path.join(BASE_DIR, "train/labels"),
    os.path.join(BASE_DIR, "valid/labels"),
    os.path.join(BASE_DIR, "test/labels"),
]

MAX_INDEX = 8

for label_dir in dirs:
    if not os.path.exists(label_dir): continue
    for file in os.listdir(label_dir):
        if not file.endswith(".txt"):
            continue
        path = os.path.join(label_dir, file)
        with open(path, "r") as f:
            lines = f.readlines()
        new_lines = [l for l in lines if int(l.split()[0]) <= MAX_INDEX]
        if len(new_lines) != len(lines):
            print(f"[EDITADO] {path}")
            with open(path, "w") as f:
                f.writelines(new_lines)
