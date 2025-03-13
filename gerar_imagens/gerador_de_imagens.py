import requests
import os
import base64
import random
import time

# URL do servidor Stable Diffusion Web UI
url_base = "http://127.0.0.1:7860"

# Diretório de saída das imagens geradas
script_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(script_dir, "imagens_geradas")
os.makedirs(output_dir, exist_ok=True)

# 🔹 Defina o nome exato do modelo (sem .safetensors ou .ckpt)
modelo_checkpoint = "realisticVisionV60B1_v51HyperVAE"

# 📌 1️⃣ Verificar o checkpoint atual
def verificar_checkpoint():
    url_options = f"{url_base}/sdapi/v1/options"
    response = requests.get(url_options)
    if response.status_code == 200:
        options = response.json()
        checkpoint_atual = options.get("sd_model_checkpoint", "Desconhecido")
        print(f"📢 Modelo atual carregado: {checkpoint_atual}")
        return checkpoint_atual
    else:
        print("❌ Erro ao verificar o checkpoint.")
        return None

# 📌 2️⃣ Trocar checkpoint se necessário
def trocar_checkpoint():
    url_options = f"{url_base}/sdapi/v1/options"
    data = {"sd_model_checkpoint": modelo_checkpoint}
    response = requests.post(url_options, json=data)
    if response.status_code == 200:
        print(f"✅ Checkpoint alterado para: {modelo_checkpoint}")
        time.sleep(5)  # Aguarde alguns segundos para o modelo carregar
    else:
        print("❌ Erro ao trocar checkpoint:", response.text)

# 📌 3️⃣ Gerar imagens
def gerar_imagens():
    url_txt2img = f"{url_base}/sdapi/v1/txt2img"

    # 🔹 Prompts para variação (com e sem óculos, close nos olhos e nariz)
    cenarios = [
        "Extreme close-up of a man's eyes and the upper bridge of the nose, only eyes and part of the nose visible, mature skin with natural wrinkles, realistic skin texture, soft natural lighting, ultra-sharp focus, photorealistic, professional DSLR, 8K",
        "Extreme close-up of a man's eyes and the upper bridge of the nose, only eyes and part of the nose visible, mature skin with natural wrinkles, realistic skin texture, soft natural lighting, wearing stylish eyeglasses with a thin metallic frame, ultra-sharp focus, photorealistic, professional DSLR, 8K"
    ]


    negative_prompt = (
        "deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, "
        "text, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, "
        "extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, "
        "bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, "
        "missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck"
    )

    for i in range(300):
        prompt_variado = random.choice(cenarios)

        data = {
            "prompt": prompt_variado,
            "negative_prompt": negative_prompt,
            "steps": random.randint(10, 12),  # 🔹 Hyper Model optimization
            "cfg_scale": round(random.uniform(1.5, 2.0), 2),  # 🔹 Lower value = more mutations, less contrast
            "width": 768,
            "height": 768,
            "sampler_index": "DPM++ SDE Karras",  # 🔹 Recommended sampler for Hyper
            "seed": random.randint(1, 9999999),
            "restore_faces": True,
            "override_settings": {"sd_model_checkpoint": modelo_checkpoint}  # 🔹 Ensure correct model is used
        }

        response = requests.post(url_txt2img, json=data)
        image_data = response.json().get("images", [])
        if not image_data:
            print(f"❌ Erro: Nenhuma imagem retornada na tentativa {i+1}.")
            continue

        image_save_path = os.path.join(output_dir, f"face_zoom_{i+1}.png")
        with open(image_save_path, "wb") as f:
            f.write(base64.b64decode(image_data[0]))

        print(f"✅ Imagem {i+1}/100 salva em {image_save_path}")

# 📌 Executar tudo na ordem correta
if __name__ == "__main__":
    checkpoint_atual = verificar_checkpoint()
    if checkpoint_atual != modelo_checkpoint:
        trocar_checkpoint()

    gerar_imagens()
