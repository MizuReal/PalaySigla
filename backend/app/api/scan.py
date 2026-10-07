from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.models.scan import ScanOcrResponse
from app.services.rate_limit import IpRateLimiter
from app.services.scan import ScanService

router = APIRouter(prefix="/api/scan", tags=["scan"])

_settings = get_settings()
_scan_rate_limiter = IpRateLimiter(
    max_requests=_settings.scan_rate_limit_max_requests,
    window_seconds=_settings.scan_rate_limit_window_seconds,
)

SERVICE_UNAVAILABLE_MESSAGE = "Scanning is not available on this server right now."


def enforce_scan_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    _scan_rate_limiter.check(client_ip)


def get_scan_service(request: Request) -> ScanService:
    service = getattr(request.app.state, "scan_service", None)
    if not isinstance(service, ScanService):
        raise HTTPException(status_code=503, detail=SERVICE_UNAVAILABLE_MESSAGE)
    return service


@router.post("/ocr", response_model=ScanOcrResponse)
async def scan_ocr(
    file: UploadFile = File(...),
    _user_id: str = Depends(get_current_user),
    _rate_limited: None = Depends(enforce_scan_rate_limit),
    service: ScanService = Depends(get_scan_service),
) -> ScanOcrResponse:
    image_bytes = await file.read(_settings.scan_max_image_bytes + 1)
    data = await service.process(image_bytes, file.content_type)
    return ScanOcrResponse(data=data)
