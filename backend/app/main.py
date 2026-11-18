import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.core.database import init_db, close_db, ping_db
from app.core.redis import close_redis, get_redis
from app.core.exceptions import register_exception_handlers
from app.api.v1 import api_router
from app.middleware.logging import LoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.services.websocket import manager

settings = get_settings()
logger = logging.getLogger("teampulse")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # A cold or briefly unreachable database must not kill the boot: Render would
    # restart the container in a loop and the deploy would be marked as failed.
    # /health/ready reports the real state instead.
    try:
        await init_db()
        logger.info("Database schema is ready")
    except Exception as exc:
        logger.error("Database initialisation failed: %s", exc)

    try:
        await manager.initialize()
    except Exception as exc:
        logger.error("Realtime manager failed to start: %s", exc)

    yield

    try:
        await manager.shutdown()
    except Exception:
        pass
    await close_db()
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="TeamPulse API - Real-time team collaboration with AI insights",
    docs_url="/docs" if settings.debug_enabled else None,
    redoc_url="/redoc" if settings.debug_enabled else None,
    openapi_url="/openapi.json" if settings.debug_enabled else None,
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

register_exception_handlers(app)

app.include_router(api_router)


@app.get("/")
async def root():
    return {"service": "teampulse-backend", "status": "ok", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "teampulse-backend"}


@app.get("/health/live")
async def liveness():
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness():
    """Deep check: database + Redis. Used by Render and the Docker healthcheck."""
    database_ok = await ping_db()

    redis_ok = False
    try:
        client = await get_redis()
        redis_ok = bool(await client.ping())
    except Exception as exc:
        logger.warning("Redis ping failed: %s", exc)

    healthy = database_ok and redis_ok
    return JSONResponse(
        {
            "status": "ready" if healthy else "degraded",
            "database": "ok" if database_ok else "unavailable",
            "redis": "ok" if redis_ok else "unavailable",
        },
        status_code=200 if healthy else 503,
    )


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=settings.debug_enabled,
    )
