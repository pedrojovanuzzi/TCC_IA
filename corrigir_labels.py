import os

# Defina o número que deseja substituir (exemplo: mudar 0 para um novo ID)
novo_id = 1  # 🔹 Altere este valor conforme necessário

# Lista das pastas onde estão os labels (.txt)
pastas_labels = [
    "./corrigir_labels/train/labels/",
    "./corrigir_labels/valid/labels/",
    "./corrigir_labels/test/labels/"
]

# Iterar sobre cada pasta
for pasta in pastas_labels:
    if not os.path.exists(pasta):
        print(f"Pasta não encontrada: {pasta}")
        continue  # Pula para a próxima pasta se a atual não existir

    print(f"Processando pasta: {pasta}")

    # Iterar sobre os arquivos de labels na pasta
    for arquivo in os.listdir(pasta):
        if arquivo.endswith(".txt"):
            caminho_arquivo = os.path.join(pasta, arquivo)

            with open(caminho_arquivo, "r") as f:
                linhas = f.readlines()

            novas_linhas = []
            for linha in linhas:
                valores = linha.split()
                if len(valores) > 0:
                    # Alterar apenas o primeiro valor (classe YOLO)
                    valores[0] = str(novo_id)
                    novas_linhas.append(" ".join(valores) + "\n")

            # Escrever o novo arquivo com as classes corrigidas
            with open(caminho_arquivo, "w") as f:
                f.writelines(novas_linhas)

    print(f"Correção concluída para {pasta} ✅")

print(f"\nCorreção finalizada para todas as pastas! 🚀")
