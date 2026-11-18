from functools import lru_cache
from typing import List
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


PRODUCTION_ENVIRONMENTS = {"production", "prod", "staging"}

# Managed Postgres providers (Neon, Supabase, Render, ...) require TLS.
_DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,"
    "http://localhost:5173,"
    "https://teampulse.vercel.app,"
    "https://team-pulse-lilac.vercel.app"
)


def split_csv(value) -> List[str]:
    """Accept either a comma separated string or an already parsed list."""
    if value is None:
        return []
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, (list, tuple, set)):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def normalize_database_url(url: str) -> str:
    """
    Convert a provider connection string into something asyncpg/SQLAlchemy accepts.

    - `postgres://` and `postgresql://` are rewritten to the asyncpg dialect.
    - libpq-only query params such as `sslmode` and `channel_binding` are translated:
      asyncpg does not understand them and raises on connect.
    - TLS is enforced for every non-local host (Neon refuses plaintext anyway).
    """
    if not url:
        return url

    for prefix in ("postgres://", "postgresql://", "postgresql+psycopg2://", "postgresql+psycopg://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
            break

    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))

    ssl_mode = query.pop("sslmode", None)
    query.pop("channel_binding", None)  # libpq only, asyncpg errors out on it
    query.pop("pgbouncer", None)

    host = (parts.hostname or "").lower()
    is_local = host in {"localhost", "127.0.0.1", "::1", "postgres", "db", "host.docker.internal"}

    if "ssl" not in query and ssl_mode not in {"disable", "allow"}:
        if ssl_mode in {"require", "prefer"}:
            query["ssl"] = "require"
        elif ssl_mode in {"verify-ca", "verify-full"}:
            query["ssl"] = ssl_mode
        elif not is_local:
            query["ssl"] = "require"

    # Neon's PgBouncer pooler runs in transaction mode: asyncpg's prepared
    # statement cache breaks there, so turn it off when the pooler is in play.
    if "-pooler" in host:
        query.setdefault("statement_cache_size", "0")

    return urlunsplit(parts._replace(query=urlencode(query)))


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

    # CORS: comma separated list in env, e.g. "https://app.example.com,http://localhost:3000"
    CORS_ORIGINS: str = Field(default=_DEFAULT_CORS_ORIGINS, validation_alias="CORS_ORIGINS")
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Optional
    SENTRY_DSN: str = Field(default="", validation_alias="SENTRY_DSN")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _coerce_cors_origins(cls, value):
        origins = split_csv(value)
        return ",".join(origins) if origins else _DEFAULT_CORS_ORIGINS

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
        origins = split_csv(self.CORS_ORIGINS)
        # The deployed frontend must always be allowed, whatever FRONTEND_URL points at.
        frontend = (self.FRONTEND_URL or "").strip().rstrip("/")
        if frontend and frontend not in origins:
            origins.append(frontend)
        return origins

    @property
    def database_url(self) -> str:
        return normalize_database_url(self.DATABASE_URL)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
