from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def nominatim_user_agent(self) -> str:
        # Nominatim requires a descriptive User-Agent per their usage policy
        return f"{self.app_name}/{self.app_version} ({self.contact_email})"


@lru_cache
def get_settings() -> Settings:
    return Settings()
