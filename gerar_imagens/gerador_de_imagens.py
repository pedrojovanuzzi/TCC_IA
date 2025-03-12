import requests
import os
import base64
import random

script_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(script_dir, "imagens_geradas")
os.makedirs(output_dir, exist_ok=True)

url = "http://127.0.0.1:7860/sdapi/v1/img2img"

modelo = "realisticVisionV60B1_v51HyperVAE"  # Nome exato do arquivo .safetensors

obj = "face_olhos"
image_path = os.path.join(script_dir, obj + ".png")

with open(image_path, "rb") as image_file:
    base64_image = base64.b64encode(image_file.read()).decode("utf-8")

cenarios = [
    "Ultra-realistic close-up portrait of a person, highly detailed skin, cinematic lighting, shot on a Canon EOS R5 with 85mm f/1.2 lens, RAW photo, photorealistic",
    "Professional studio portrait of a human face, ultra-detailed skin texture, natural lighting, realistic depth of field, 8K resolution",
    "Realistic high-resolution photography of a person’s face, professional retouching, perfect color grading, DSLR shot"
]

negative_prompt = (
    "blurry, low quality, distorted, watermark, text, cartoon, anime, 3D render, CGI, unrealistic proportions, extra fingers, deformed hands, oversaturated, poorly drawn face"
)

for i in range(100):
    prompt_variado = random.choice(cenarios)

    data = {
        "init_images": [f"data:image/png;base64,{base64_image}"],
        "prompt": prompt_variado,
        "negative_prompt": negative_prompt,
        "steps": 50,
        "denoising_strength": round(random.uniform(0.4, 0.7), 2),  # Preserva melhor o rosto original
        "cfg_scale": 7.5,
        "width": 768,
        "height": 768,
        "sampler_index": "DPM++ 2M Karras",
        "override_settings": {"sd_model_checkpoint": modelo}
    }

    response = requests.post(url, json=data)
    image_data = response.json().get("images", [])
    if not image_data:
        print(f"Erro: Nenhuma imagem retornada na tentativa {i+1}.")
        continue

    image_save_path = os.path.join(output_dir, f"{obj}_{i+1}.png")
    with open(image_save_path, "wb") as f:
        f.write(base64.b64decode(image_data[0]))

    print(f"Imagem {i+1}/100 salva em {image_save_path}")
