from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.config import get_settings
from app.models.geocode import GeocodeReverseResponse, GeocodeSearchResponse
from app.services.geocoder import Geocoder
from app.services.rate_limit import IpRateLimiter

router = APIRouter(prefix="/api/geocode", tags=["geocode"])

_settings = get_settings()
_geocoder = Geocoder(_settings)
_rate_limiter = IpRateLimiter(
    max_requests=_settings.ip_rate_limit_max_requests,
    window_seconds=_settings.ip_rate_limit_window_seconds,
)


def enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    _rate_limiter.check(client_ip)


@router.get("/search", response_model=GeocodeSearchResponse)
async def search_places(
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=5, ge=1, le=10),
    _: None = Depends(enforce_rate_limit),
) -> GeocodeSearchResponse:
    results = await _geocoder.search(q, limit)
    return GeocodeSearchResponse(data=results)


@router.get("/reverse", response_model=GeocodeReverseResponse)
async def reverse_geocode(
    lat: float = Query(ge=-90.0, le=90.0),
    lng: float = Query(ge=-180.0, le=180.0),
    _: None = Depends(enforce_rate_limit),
) -> GeocodeReverseResponse:
    result = await _geocoder.reverse(lat, lng)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No location found for those coordinates.",
        )
    return GeocodeReverseResponse(data=result)
