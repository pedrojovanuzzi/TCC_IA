import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from dotenv import load_dotenv

# Rotas do sistema
from app.routers.users    import router as users_router
from app.routers.cameras  import router as cameras_router
from app.routers.predict  import router as predict_router
from app.routers.ws       import router as ws_router
from app.routers.cronjob  import router as cronjob
from app.routers.logs     import router as logs
from app.routers.files    import router as files_router
from app.lifespan         import lifespan

# Scheduler
from app.scheduler import scheduler, verificar_cronjob  # ✅ importa o objeto e a função

# Configurações
from app.config import VIDEO_DIR, IMAGES_DIR
load_dotenv()

BASE_DIR = os.path.dirname(__file__)

# Instância principal do FastAPI
app = FastAPI(lifespan=lifespan)

# Middleware de CORS
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Monta pastas estáticas
app.mount("/videos", StaticFiles(directory=VIDEO_DIR), name="videos")
app.mount("/imagens", StaticFiles(directory=IMAGES_DIR), name="imagens")

# Inclui todas as rotas
app.include_router(users_router,   prefix="/api")
app.include_router(cameras_router, prefix="/api")
app.include_router(predict_router, prefix="/api")
app.include_router(ws_router,      prefix="/api")
app.include_router(cronjob,        prefix="/api")
app.include_router(files_router,   prefix="/api")
app.include_router(logs,           prefix="/api")

# 🚀 Ativa o scheduler imediatamente ao rodar o arquivo
def iniciar_scheduler_automatico():
    try:
        # Adiciona o job que roda a cada 5 segundos
        scheduler.add_job(verificar_cronjob, "interval", seconds=5, id="cron_checker", replace_existing=True)
        scheduler.start()
        print("🕒 Scheduler iniciado — verificando cronjobs a cada 5 segundos.")
    except Exception as e:
        print("❌ Erro ao iniciar scheduler:", e)

# Chama o scheduler direto (sem depender do startup do FastAPI)
iniciar_scheduler_automatico()

# 🔚 Comando para iniciar com certificado HTTPS local
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=3001,
        ssl_keyfile=os.path.join(BASE_DIR, "..", "frontend", "tcc_frontend", "certs", "localhost-key.pem"),
        ssl_certfile=os.path.join(BASE_DIR, "..", "frontend", "tcc_frontend", "certs", "localhost.pem")
    )
