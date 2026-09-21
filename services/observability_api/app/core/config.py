from functools import lru_cache

import httpx
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_env: str = "development"
    log_level: str = "info"
    service_name: str = "observability-api"
    host: str = "0.0.0.0"
    port: int = 8004

    prometheus_url: str = "http://localhost:9090"
    loki_url: str = "http://localhost:3100"
    tempo_url: str = "http://localhost:3200"
    alertmanager_url: str = "http://localhost:9093"

    upstream_timeout_seconds: float = Field(default=5.0, gt=0)
    upstream_connect_timeout_seconds: float = Field(default=2.0, gt=0)

    metrics_range_minutes_default: int = Field(default=30, ge=5, le=120)
    metrics_range_step_seconds: int = Field(default=60, ge=15, le=300)

    @field_validator(
        "prometheus_url",
        "loki_url",
        "tempo_url",
        "alertmanager_url",
        mode="after",
    )
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        """Normalize upstream base URLs by removing trailing slashes."""
        return value.rstrip("/")

    def get_upstream_timeout(self) -> httpx.Timeout:
        """Return the shared httpx timeout configuration for upstream clients."""
        return httpx.Timeout(
            connect=self.upstream_connect_timeout_seconds,
            read=self.upstream_timeout_seconds,
            write=self.upstream_timeout_seconds,
            pool=self.upstream_timeout_seconds,
        )

@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
