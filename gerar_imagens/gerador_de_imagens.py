import requests
import os
import base64

output_dir = "imagens_geradas"
os.makedirs(output_dir, exist_ok=True)

url = "http://127.0.0.1:7860/sdapi/v1/txt2img"

data = {
    "prompt": "A safety harness used for climbing electric poles, detailed view, realistic",
    "steps": 50,
    "width": 512,
    "height": 512,
    "batch_size": 1
}

for i in range(300):
    response = requests.post(url, json=data)
    image_data = response.json()["images"][0]

    image_path = os.path.join(output_dir, f"cinto_{i+1}.png")
    with open(image_path, "wb") as f:
        f.write(base64.b64decode(image_data))
    
    print(f"Imagem {i+1}/300 salva.")
