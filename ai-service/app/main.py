from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.config import get_settings
from app.db.pool import close_pool, get_pool


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await get_pool()
    yield
    await close_pool()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Thuê máy ảnh AI Service", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"ok": True}

    app.include_router(chat_router)
    return app


app = create_app()
