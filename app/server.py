import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from app.config import VIDEO_DIR
from app.routers.users    import router as users_router
from app.routers.cameras  import router as cameras_router
from app.routers.predict  import router as predict_router
from app.routers.ws       import router as ws_router
from app.routers.predict  import router as predict_router
from app.lifespan         import lifespan

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(users_router,prefix="/api")
app.include_router(cameras_router,prefix="/api")
app.include_router(predict_router,prefix="/api")
app.include_router(ws_router,prefix="/api")
app.mount("/api/videos", StaticFiles(directory=VIDEO_DIR), name="videos")

if __name__=="__main__":
    import uvicorn
    uvicorn.run(app,host="0.0.0.0",port=3001)
