from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.models.assessment import (
    AssessmentAdviceReply,
    AssessmentAdviceRequest,
    AssessmentAdviceResponse,
    AssessmentResponse,
)
from app.services.assessment import AssessmentService
from app.services.assessment_advice import AssessmentAdvisor
from app.services.rate_limit import IpRateLimiter

router = APIRouter(prefix="/api/assessments", tags=["assessments"])

_settings = get_settings()
_assessment_rate_limiter = IpRateLimiter(
    max_requests=_settings.assess_rate_limit_max_requests,
    window_seconds=_settings.assess_rate_limit_window_seconds,
)
_advice_rate_limiter = IpRateLimiter(
    max_requests=_settings.assess_advice_rate_limit_max_requests,
    window_seconds=_settings.assess_advice_rate_limit_window_seconds,
)
_advisor = AssessmentAdvisor(_settings)

SERVICE_UNAVAILABLE_MESSAGE = "Assessing a photo is not available on this server right now."


def enforce_assessment_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    _assessment_rate_limiter.check(client_ip)


def enforce_advice_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    _advice_rate_limiter.check(client_ip)


def get_assessment_service(request: Request) -> AssessmentService:
    service = getattr(request.app.state, "assessment_service", None)
    if not isinstance(service, AssessmentService):
        raise HTTPException(status_code=503, detail=SERVICE_UNAVAILABLE_MESSAGE)
    return service


def get_assessment_advisor() -> AssessmentAdvisor:
    return _advisor


@router.post("/image", response_model=AssessmentResponse)
async def assess_image(
    file: UploadFile = File(...),
    _user_id: str = Depends(get_current_user),
    _rate_limited: None = Depends(enforce_assessment_rate_limit),
    service: AssessmentService = Depends(get_assessment_service),
) -> AssessmentResponse:
    image_bytes = await file.read(_settings.assess_max_image_bytes + 1)
    data = await service.process(image_bytes, file.content_type)
    return AssessmentResponse(data=data)


@router.post("/advice", response_model=AssessmentAdviceResponse)
async def assessment_advice(
    payload: AssessmentAdviceRequest,
    _user_id: str = Depends(get_current_user),
    _rate_limited: None = Depends(enforce_advice_rate_limit),
    advisor: AssessmentAdvisor = Depends(get_assessment_advisor),
) -> AssessmentAdviceResponse:
    reply = await advisor.advise(payload)
    return AssessmentAdviceResponse(data=AssessmentAdviceReply(reply=reply))
