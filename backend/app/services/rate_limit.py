import time
from collections import deque

from fastapi import HTTPException


class IpRateLimiter:
    """Sliding-window rate limit keyed by client IP."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}

    def check(self, client_ip: str) -> None:
        now = time.monotonic()
        window = self._hits.setdefault(client_ip, deque())
        cutoff = now - self._window_seconds
        while window and window[0] < cutoff:
            window.popleft()
        if len(window) >= self._max_requests:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "RATE_LIMITED",
                    "message": "Too many requests. Please slow down.",
                },
            )
        window.append(now)
