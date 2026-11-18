from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


PRODUCTION_ENVIRONMENTS = {"production", "prod", "staging"}


def split_list(value) -> List[str]:
    """Accept a JSON array, a comma separated string or an already parsed list."""
    if value is None:
        return []
    if isinstance(value, str):
        text = value.strip()
        if text.startswith("["):
            import json

            try:
                value = json.loads(text)
            except Exception:
                value = text.split(",")
            else:
                return [str(item).strip() for item in value if str(item).strip()]
        else:
            value = text.split(",")
    if isinstance(value, (list, tuple, set)):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TeamPulse"
    ENVIRONMENT: str = "development"
    DEBUG: bool | None = None

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://teampulse:teampulse_dev@localhost:5432/teampulse",
        validation_alias="DATABASE_URL"
    )
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 5

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0", validation_alias="REDIS_URL")

    # JWT
    SECRET_KEY: str = Field(validation_alias="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth
    GOOGLE_CLIENT_ID: str = Field(default="", validation_alias="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", validation_alias="GOOGLE_CLIENT_SECRET")
    GITHUB_CLIENT_ID: str = Field(default="", validation_alias="GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: str = Field(default="", validation_alias="GITHUB_CLIENT_SECRET")

    # Frontend
    FRONTEND_URL: str = Field(default="http://localhost:3000", validation_alias="FRONTEND_URL")

    # AI Service
    AI_SERVICE_URL: str = Field(default="http://localhost:8000", validation_alias="AI_SERVICE_URL")

    # CORS - either a JSON array or a comma separated string
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://teampulse.vercel.app",
        "https://team-pulse-lilac.vercel.app",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Optional
    SENTRY_DSN: str = Field(default="", validation_alias="SENTRY_DSN")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _coerce_cors_origins(cls, value):
        origins = split_list(value)
        return origins or [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://teampulse.vercel.app",
            "https://team-pulse-lilac.vercel.app",
        ]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in PRODUCTION_ENVIRONMENTS

    @property
    def debug_enabled(self) -> bool:
        if self.DEBUG is not None:
            return self.DEBUG
        return not self.is_production

    @property
    def cors_origins(self) -> List[str]:
        origins = list(self.CORS_ORIGINS)
        frontend = (self.FRONTEND_URL or "").strip().rstrip("/")
        if frontend and frontend not in origins:
            origins.append(frontend)
        return origins

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
