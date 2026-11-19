import logging
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "postgres", "db", "host.docker.internal", "redis"}


def database_url() -> str:
    """Turn whatever the database provider gives us into an asyncpg URL.

    Hosting providers hand out a libpq style url:
      postgresql://user:pass@host/db?sslmode=require&channel_binding=require
    SQLAlchemy needs the asyncpg driver spelled out, asyncpg wants ssl=require
    instead of sslmode=require, and it raises on libpq-only options such as
    channel_binding, so those are translated/stripped here.
    """
    url = settings.DATABASE_URL
    if not url:
        return url

    for prefix in ("postgres://", "postgresql://", "postgresql+psycopg2://", "postgresql+psycopg://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
            break

    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))

    ssl_mode = query.pop("sslmode", None)
    query.pop("channel_binding", None)  # libpq only, asyncpg rejects it
    query.pop("pgbouncer", None)

    host = (parts.hostname or "").lower()
    is_local = host in LOCAL_HOSTS

    if "ssl" not in query and ssl_mode not in {"disable", "allow"}:
        if ssl_mode in {"require", "prefer"}:
            query["ssl"] = "require"
        elif ssl_mode in {"verify-ca", "verify-full"}:
            query["ssl"] = ssl_mode
        elif not is_local:
            query["ssl"] = "require"

    # Neon's PgBouncer pooler runs in transaction mode, which breaks asyncpg's
    # prepared statement cache, so disable the cache when the pooler is used.
    if "-pooler" in host:
        query.setdefault("statement_cache_size", "0")

    return urlunsplit(parts._replace(query=urlencode(query)))


engine = create_async_engine(
    database_url(),
    echo=settings.debug_enabled,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# Columns that were added after the first release.
#
# Base.metadata.create_all() only creates missing *tables*: it never adds a
# column to a table that already exists. So a database created before these
# fields appeared kept the old shape, and every SELECT on users failed with
# UndefinedColumn - surfaced as a blanket 503 "Database temporarily
# unavailable". Free Render instances have no shell to run alembic, so the
# additive migrations are applied here. "IF NOT EXISTS" makes each one a no-op
# once the column is in place.
ADDITIVE_COLUMNS = (
    ("users", "bio", "VARCHAR(1000)"),
    ("users", "theme", "VARCHAR(10) NOT NULL DEFAULT 'system'"),
)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        for table, column, ddl in ADDITIVE_COLUMNS:
            try:
                await conn.execute(
                    text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{column}" {ddl}')
                )
            except Exception as exc:
                # Never stop the boot for this: /health/ready reports the real
                # state, and a genuinely unreachable database is already logged
                # by the caller.
                logger.warning("Could not ensure %s.%s exists: %s", table, column, exc)


async def ping_db() -> bool:
    from sqlalchemy import text

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def close_db():
    await engine.dispose()
