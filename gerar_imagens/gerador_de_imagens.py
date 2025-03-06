import requests
import os
import base64

script_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(script_dir, "imagens_geradas")
os.makedirs(output_dir, exist_ok=True)

url = "http://127.0.0.1:7860/sdapi/v1/img2img"

obj = "luva"

image_path = os.path.join(script_dir, obj + ".jpg")

with open(image_path, "rb") as image_file:
    base64_image = base64.b64encode(image_file.read()).decode("utf-8")

data = {
    "init_images": [f"data:image/png;base64,{base64_image}"],
    "prompt": "A detailed, realistic image of a person wearing a safety harness, professional photography, high-resolution, well-lit, full-body shot, construction worker or industrial worker, wearing proper safety equipment, standing in a neutral pose, facing the camera.",
    "negative_prompt": "blurry, low quality, extra limbs, distorted face, watermark, text, cartoon, anime, painting, unrealistic proportions, helmet without harness, climbing poles, background clutter",
    "steps": 50,
    "denoising_strength": 0.7,
    "cfg_scale": 7,
    "width": 768,
    "height": 768,
    "sampler_index": "Euler a"
}

for i in range(2000):
    response = requests.post(url, json=data)

    image_data = response.json().get("images", [])
    if not image_data:
        print(f"Erro: Nenhuma imagem retornada na tentativa {i+1}.")
        continue

    image_save_path = os.path.join(output_dir, obj + f"_{i+1}.png")
    with open(image_save_path, "wb") as f:
        f.write(base64.b64decode(image_data[0]))

    print(f"Imagem {i+1}/2000 salva em {image_save_path}")
