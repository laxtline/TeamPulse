import redis.asyncio as redis
from app.core.config import get_settings

settings = get_settings()

redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return redis_client


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


async def check_rate_limit(
    redis_client: redis.Redis,
    key: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int]:
    """
    Returns (allowed, retry_after_seconds)
    Uses sorted set for sliding window rate limiting.
    """
    import time
    now = time.time()
    window_start = now - window_seconds

    pipe = redis_client.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window_seconds)
    results = await pipe.execute()

    current_count = results[2]
    if current_count > max_requests:
        oldest = await redis_client.zrange(key, 0, 0, withscores=True)
        if oldest:
            retry_after = int(window_seconds - (now - oldest[0][1]))
            return False, max(1, retry_after)
    return True, 0