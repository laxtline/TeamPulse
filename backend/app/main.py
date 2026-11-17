from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import init_db, close_db
from app.core.redis import close_redis
from app.core.exceptions import register_exception_handlers
from app.api.v1 import api_router
from app.middleware.logging import LoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.services.websocket import manager

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await manager.initialize()
    yield
    await manager.shutdown()
    await close_db()
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="TeamPulse API - Real-time team collaboration with AI insights",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

register_exception_handlers(app)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "teampulse-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)