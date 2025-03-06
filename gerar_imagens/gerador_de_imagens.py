import requests
import os
import base64
import random

script_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(script_dir, "imagens_geradas")
os.makedirs(output_dir, exist_ok=True)

url = "http://127.0.0.1:7860/sdapi/v1/img2img"

obj = "luva"
image_path = os.path.join(script_dir, obj + ".jpg")

with open(image_path, "rb") as image_file:
    base64_image = base64.b64encode(image_file.read()).decode("utf-8")

cenarios = [
    "construction worker wearing {} in safety scenario, realistic full-body",
    "engineer wearing {} inspecting equipment, professional photography",
    "industrial worker actively using {}, detailed image, realistic",
    "safety instructor demonstrating use of {}, well-lit photography",
    "person wearing {} at construction site, high-detail",
    "technician with {} in maintenance operation, realistic environment",
    "worker displaying correct use of {}, realistic professional shot",
]

negative_prompt = "blurry, low quality, distorted, watermark, text, cartoon, anime, unrealistic proportions"

for i in range(2000):
    prompt_variado = random.choice(cenarios).format(obj)

    data = {
        "init_images": [f"data:image/png;base64,{base64_image}"],
        "prompt": prompt_variado,
        "negative_prompt": negative_prompt,
        "steps": 50,
        "denoising_strength": round(random.uniform(0.8, 0.95), 2),
        "cfg_scale": 7,
        "width": 768,
        "height": 768,
        "sampler_index": "Euler a"
    }

    response = requests.post(url, json=data)
    image_data = response.json().get("images", [])
    if not image_data:
        print(f"Erro: Nenhuma imagem retornada na tentativa {i+1}.")
        continue

    image_save_path = os.path.join(output_dir, f"{obj}_{i+1}.png")
    with open(image_save_path, "wb") as f:
        f.write(base64.b64decode(image_data[0]))

    print(f"Imagem {i+1}/2000 salva em {image_save_path}")
