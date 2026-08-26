import asyncio
import time
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.models.geocode import GeocodeResult

MAX_CACHE_ENTRIES = 1000


class Geocoder:
    """Nominatim client with a hard 1 request/second throttle and a TTL cache."""

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.nominatim_base_url,
            timeout=settings.geocode_request_timeout_seconds,
            headers={
                "User-Agent": settings.nominatim_user_agent,
                "Accept": "application/json",
            },
            transport=transport,
        )
        self._cache: dict[str, tuple[float, Any]] = {}
        self._last_request_at = 0.0
        self._throttle_lock = asyncio.Lock()

    async def _cached_get(self, cache_key: str, path: str, params: dict[str, Any]) -> Any:
        ttl_seconds = self._settings.geocode_cache_ttl_seconds
        entry = self._cache.get(cache_key)
        if entry is not None and entry[0] > time.monotonic():
            return entry[1]

        payload = await self._throttled_get(path, params)
        if len(self._cache) >= MAX_CACHE_ENTRIES:
            self._cache.clear()
        self._cache[cache_key] = (time.monotonic() + ttl_seconds, payload)
        return payload

    async def _throttled_get(self, path: str, params: dict[str, Any]) -> Any:
        async with self._throttle_lock:
            wait_until = self._last_request_at + self._settings.geocode_min_interval_seconds
            wait_seconds = wait_until - time.monotonic()
            if wait_seconds > 0:
                await asyncio.sleep(wait_seconds)
            try:
                response = await self._client.get(path, params=params)
            except httpx.HTTPError as error:
                raise HTTPException(
                    status_code=502,
                    detail="Geocoding service unavailable. Please try again shortly.",
                ) from error
            self._last_request_at = time.monotonic()

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Geocoding service is busy. Please try again shortly.",
            )
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Geocoding service returned an error. Please try again shortly.",
            )
        return response.json()

    async def search(self, query: str, limit: int) -> list[GeocodeResult]:
        normalized_query = query.strip().lower()
        cache_key = f"search:{normalized_query}:{limit}"
        payload = await self._cached_get(
            cache_key,
            path="/search",
            params={
                "format": "jsonv2",
                "q": normalized_query,
                "limit": limit,
                "countrycodes": "ph",
                "addressdetails": "0",
            },
        )
        return [
            GeocodeResult(
                place_id=item["place_id"],
                label=item["display_name"],
                lat=float(item["lat"]),
                lng=float(item["lon"]),
                place_type=item.get("type"),
            )
            for item in payload
        ]

    async def reverse(self, lat: float, lng: float) -> GeocodeResult | None:
        # round to 4 decimals (~11 m) so near-identical picks share a cache entry
        rounded_lat = round(lat, 4)
        rounded_lng = round(lng, 4)
        cache_key = f"reverse:{rounded_lat}:{rounded_lng}"
        payload = await self._cached_get(
            cache_key,
            path="/reverse",
            params={
                "format": "jsonv2",
                "lat": rounded_lat,
                "lon": rounded_lng,
            },
        )
        if not payload or "display_name" not in payload:
            return None
        return GeocodeResult(
            place_id=payload["place_id"],
            label=payload["display_name"],
            lat=float(payload["lat"]),
            lng=float(payload["lon"]),
            place_type=payload.get("type"),
        )

    async def aclose(self) -> None:
        await self._client.aclose()
