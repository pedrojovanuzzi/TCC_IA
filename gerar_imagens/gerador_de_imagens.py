import requests
import os
import base64

# Obtém o diretório do script para garantir que a pasta seja criada no lugar correto
script_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(script_dir, "imagens_geradas")
os.makedirs(output_dir, exist_ok=True)

url = "http://127.0.0.1:7860/sdapi/v1/img2img"

# Caminho da imagem de entrada
script_dir = os.path.dirname(os.path.abspath(__file__))
image_path = os.path.join(script_dir, "cinto.png")

# Converte a imagem para Base64
with open(image_path, "rb") as image_file:
    base64_image = base64.b64encode(image_file.read()).decode("utf-8")

data = {
    "init_images": [f"data:image/png;base64,{base64_image}"],  # Usa a imagem como base
    "prompt": "A detailed, realistic image of a safety harness, isolated on a white background, high-resolution, professional photography, no pole, no human",
    "negative_prompt": "electric pole, climbing, worker, human, hands, background clutter, blurry, low quality, watermark, distortion",
    "steps": 50,
    "denoising_strength": 0.7,  # Controla o quanto a IA altera a imagem original (0.5-0.8 recomendado)
    "cfg_scale": 7,
    "width": 768,
    "height": 768,
    "sampler_index": "Euler a"
}



for i in range(300):
    response = requests.post(url, json=data)
    print(response.status_code, response.text)

    # Verifica se a API retornou imagens
    image_data = response.json().get("images", [])
    if not image_data:
        print(f"Erro: Nenhuma imagem retornada para a tentativa {i+1}.")
        continue  # Continua o loop ao invés de sair completamente

    # Decodifica e salva a imagem
    image_path = os.path.join(output_dir, f"cinto_{i+1}.png")
    with open(image_path, "wb") as f:
        f.write(base64.b64decode(image_data[0]))
    
    print(f"Imagem {i+1}/300 salva em {image_path}")
