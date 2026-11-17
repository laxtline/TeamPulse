from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TeamPulse"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://teampulse:teampulse_dev@localhost:5432/teampulse",
        validation_alias="DATABASE_URL"
    )

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

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://teampulse.vercel.app",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Optional
    SENTRY_DSN: str = Field(default="", validation_alias="SENTRY_DSN")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()