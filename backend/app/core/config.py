from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_OCR_TEMPLATES_DIR_NAME = "ocr_templates"


class Settings(BaseSettings):
    # populate_by_name keeps field-name kwargs working (tests) alongside the aliases
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    app_name: str = "PalaySigla"
    app_version: str = "0.1.0"
    contact_email: str = "dev@palaysigla.ph"
    cors_origins: str = "http://localhost:5173"

    nominatim_base_url: str = "https://nominatim.openstreetmap.org"
    geocode_min_interval_seconds: float = 1.0
    geocode_cache_ttl_seconds: int = 86400
    geocode_request_timeout_seconds: float = Field(default=5.0, ge=1.0)

    ip_rate_limit_max_requests: int = 10
    ip_rate_limit_window_seconds: int = 10

    # Supabase: server-side JWT validation (auth dependency).
    # SUPABASE_SECRET_KEY is accepted as an alias for SUPABASE_SERVICE_ROLE_KEY so a
    # misnamed deployment resolves instead of failing with 503 at request time.
    supabase_url: str = ""
    supabase_service_role_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
    )

    # Palay Assistant: Groq-hosted openai/gpt-oss-20b
    groq_chatbot_api_key: str = ""
    groq_chatbot_base_url: str = "https://api.groq.com/openai/v1"
    groq_chatbot_model: str = "openai/gpt-oss-20b"
    chat_max_tokens: int = Field(default=512, ge=64, le=4096)
    chat_request_timeout_seconds: float = Field(default=20.0, ge=1.0)
    chat_history_max_messages: int = Field(default=20, ge=1, le=40)

    # Per-IP chat rate limit: LLM calls are metered, so it stays stricter than geocode
    chat_rate_limit_max_requests: int = 6
    chat_rate_limit_window_seconds: int = 60

    # Scan OCR: sheet spec + handwritten-digit classifier. The model path must
    # point at a trained scan_digit.onnx; boot fails fast when it is missing.
    ocr_templates_dir: str = ""
    scan_digit_model_path: str = ""
    scan_digit_model_sha256: str = ""
    scan_digit_confidence_threshold: float = Field(default=0.80, ge=0.0, le=1.0)
    scan_ratio_mismatch_tolerance: float = Field(default=0.05, ge=0.0)
    scan_max_image_bytes: int = Field(default=10 * 1024 * 1024, ge=1024)
    scan_inference_max_workers: int = Field(default=2, ge=1, le=8)
    scan_rate_limit_max_requests: int = 10
    scan_rate_limit_window_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def ocr_templates_path(self) -> Path:
        if self.ocr_templates_dir:
            return Path(self.ocr_templates_dir)
        # backend/app/core/config.py -> repo root
        return Path(__file__).resolve().parents[3] / DEFAULT_OCR_TEMPLATES_DIR_NAME

    @property
    def nominatim_user_agent(self) -> str:
        # Nominatim requires a descriptive User-Agent per their usage policy
        return f"{self.app_name}/{self.app_version} ({self.contact_email})"


@lru_cache
def get_settings() -> Settings:
    return Settings()
