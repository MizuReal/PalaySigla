from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.api.chat import router as chat_router
from app.api.geocode import router as geocode_router
from app.api.scan import router as scan_router
from app.core.config import get_settings
from app.ml.scan.digits import DigitClassifier, OnnxDigitClassifier
from app.ml.scan.spec import load_scan_sheet_spec
from app.services.scan import ScanService


class HealthResponse(BaseModel):
    status: str


ERROR_CODES: dict[int, str] = {
    400: "BAD_REQUEST",
    404: "NOT_FOUND",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    502: "UPSTREAM_ERROR",
}


def _error_payload(status_code: int, detail: object) -> dict:
    if isinstance(detail, dict) and {"code", "message"} <= set(detail):
        return {"data": None, "error": detail}
    return {
        "data": None,
        "error": {
            "code": ERROR_CODES.get(status_code, "ERROR"),
            "message": str(detail),
        },
    }


def create_app(scan_engine: DigitClassifier | None = None) -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # OCR artifacts load exactly once at startup; a missing spec or model
        # fails the boot instead of surfacing as a per-request surprise.
        spec = load_scan_sheet_spec(settings.ocr_templates_path)
        engine = (
            scan_engine
            if scan_engine is not None
            else OnnxDigitClassifier(
                settings.scan_digit_model_path, settings.scan_digit_model_sha256
            )
        )
        executor = ThreadPoolExecutor(max_workers=settings.scan_inference_max_workers)
        app.state.scan_service = ScanService(
            spec=spec,
            classifier=engine,
            executor=executor,
            settings=settings,
        )
        try:
            yield
        finally:
            executor.shutdown(wait=False)

    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.status_code, exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_payload(422, "Invalid request parameters."),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_error_payload(500, "An unexpected error occurred."),
        )

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(status="ok")

    app.include_router(geocode_router)
    app.include_router(chat_router)
    app.include_router(scan_router)
    return app


app = create_app()
