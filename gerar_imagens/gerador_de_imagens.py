import openai
import os
import time
from dotenv import load_dotenv
load_dotenv()


# Diretório para salvar as imagens
output_dir = "/imagens_geradas"
os.makedirs(output_dir, exist_ok=True)

# Criar cliente OpenAI
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Geração das imagens
for i in range(300):
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt="A safety harness used for climbing electric poles, detailed view",
            n=1,
            size="1024x1024"
        )
        
        image_url = response.data[0].url
        image_path = os.path.join(output_dir, f"cinto_{i+1}.jpg")

        # Baixar e salvar a imagem
        os.system(f"wget -O {image_path} {image_url}")
        print(f"Imagem {i+1}/300 salva.")

        time.sleep(1)  # Evita rate limit da API

    except Exception as e:
        print(f"Erro ao gerar a imagem {i+1}: {e}")
        time.sleep(5)
