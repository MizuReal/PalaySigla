import asyncio

import httpx
import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.services.geocoder import Geocoder

SEARCH_PAYLOAD = [
    {
        "place_id": 1001,
        "display_name": "Manila, Metro Manila, Philippines",
        "lat": "14.5995",
        "lon": "120.9842",
        "type": "city",
    }
]

REVERSE_PAYLOAD = {
    "place_id": 2001,
    "display_name": "Nueva Ecija, Central Luzon, Philippines",
    "lat": "15.5000",
    "lon": "121.0000",
    "type": "state",
}


def make_geocoder(handler, **overrides) -> Geocoder:
    settings = Settings(**overrides)
    transport = httpx.MockTransport(handler)
    return Geocoder(settings, transport=transport)


async def test_search_sends_user_agent_and_maps_fields():
    seen_headers = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen_headers.update(request.headers)
        return httpx.Response(200, json=SEARCH_PAYLOAD)

    geocoder = make_geocoder(handler, geocode_min_interval_seconds=0.0)

    results = await geocoder.search("manila", limit=5)

    assert seen_headers["user-agent"] == "PalaySigla/0.1.0 (dev@palaysigla.ph)"
    assert len(results) == 1
    assert results[0].place_id == 1001
    assert results[0].label == "Manila, Metro Manila, Philippines"
    assert results[0].lat == pytest.approx(14.5995)
    assert results[0].lng == pytest.approx(120.9842)
    assert results[0].place_type == "city"


async def test_search_restricts_to_philippines_and_limits():
    seen_params = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen_params.update(dict(request.url.params))
        return httpx.Response(200, json=[])

    geocoder = make_geocoder(handler, geocode_min_interval_seconds=0.0)

    await geocoder.search("Manila", limit=3)

    assert seen_params["countrycodes"] == "ph"
    assert seen_params["limit"] == "3"
    assert seen_params["format"] == "jsonv2"


async def test_cache_hit_skips_second_request():
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json=SEARCH_PAYLOAD)

    geocoder = make_geocoder(handler, geocode_min_interval_seconds=0.0)

    await geocoder.search("Manila", limit=5)
    await geocoder.search("  manila ", limit=5)

    assert request_count == 1


async def test_reverse_rounds_coordinates_for_cache():
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json=REVERSE_PAYLOAD)

    geocoder = make_geocoder(handler, geocode_min_interval_seconds=0.0)

    first = await geocoder.reverse(15.50004, 121.00004)
    second = await geocoder.reverse(15.5000, 121.0000)

    assert first == second
    assert request_count == 1


async def test_reverse_returns_none_for_empty_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={})

    geocoder = make_geocoder(handler, geocode_min_interval_seconds=0.0)

    result = await geocoder.reverse(0.0, 0.0)

    assert result is None


async def test_upstream_error_raises_502():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="boom")

    geocoder = make_geocoder(handler, geocode_min_interval_seconds=0.0)

    with pytest.raises(HTTPException) as exc_info:
        await geocoder.search("Manila", limit=5)

    assert exc_info.value.status_code == 502


async def test_throttle_waits_between_requests():
    request_timestamps = []

    def handler(request: httpx.Request) -> httpx.Response:
        request_timestamps.append(asyncio.get_running_loop().time())
        return httpx.Response(200, json=SEARCH_PAYLOAD)

    geocoder = make_geocoder(
        handler,
        geocode_min_interval_seconds=0.2,
        geocode_cache_ttl_seconds=0,
    )

    await geocoder.search("Manila", limit=5)
    await geocoder.search("Cabanatuan", limit=5)

    assert request_timestamps[1] - request_timestamps[0] >= 0.19
