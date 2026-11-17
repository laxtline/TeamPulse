from fastapi import Request, HTTPException, Depends, status
from functools import wraps
import time
from collections import defaultdict
from threading import Lock
from app.core.redis import get_redis, check_rate_limit


class InMemoryRateLimiter:
    def __init__(self):
        self.requests: defaultdict[str, list[float]] = defaultdict(list)
        self.lock = Lock()

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        with self.lock:
            self.requests[key] = [t for t in self.requests[key] if now - t < window_seconds]
            if len(self.requests[key]) >= max_requests:
                return False
            self.requests[key].append(now)
            return True

    def get_retry_after(self, key: str, window_seconds: int) -> int:
        with self.lock:
            if not self.requests[key]:
                return 0
            oldest = min(self.requests[key])
            return max(1, int(window_seconds - (time.time() - oldest)))


_in_memory_limiter = InMemoryRateLimiter()


async def rate_limit_dependency(
    request: Request,
    max_requests: int = 100,
    window_seconds: int = 60,
    key_prefix: str = "api"
):
    client_ip = request.client.host if request.client else "unknown"
    key = f"{key_prefix}:{client_ip}"

    redis = await get_redis()
    try:
        allowed, retry_after = await check_rate_limit(redis, key, max_requests, window_seconds)
    except Exception:
        allowed = _in_memory_limiter.is_allowed(key, max_requests, window_seconds)
        retry_after = _in_memory_limiter.get_retry_after(key, window_seconds) if not allowed else 0

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )


def rate_limit(max_requests: int, window_seconds: int, key_prefix: str = "api"):
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            await rate_limit_dependency(request, max_requests, window_seconds, key_prefix)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator