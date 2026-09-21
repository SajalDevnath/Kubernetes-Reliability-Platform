from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """BFF process health response."""

    status: Literal["ok"]


class ComponentProbeResult(BaseModel):
    """Result of probing a single upstream readiness endpoint."""

    status: Literal["up", "down"]
    latency_ms: int | None = None
    error: str | None = None


class ComponentHealth(BaseModel):
    """Health status for a single observability component."""

    name: Literal["bff", "prometheus", "loki", "tempo", "alertmanager"]
    status: Literal["up", "down"]
    latency_ms: int | None = None
    error: str | None = None


class ObservabilityHealthResponse(BaseModel):
    """Aggregated upstream health response."""

    status: Literal["healthy", "degraded", "unhealthy"]
    components: list[ComponentHealth]
    checked_at: datetime = Field(..., description="UTC timestamp of the health check")
