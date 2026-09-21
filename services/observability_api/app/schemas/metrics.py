from datetime import datetime

from pydantic import BaseModel, Field

from app.core.constants import LATENCY_SLO_TARGET_SECONDS, POSTGRES_DATABASE_NAME
from app.schemas.common import TimeSeries


class ServiceHealthItem(BaseModel):
    """Health status for a single KRP application service."""

    service: str
    job: str
    instance: str | None = None
    up: bool


class ServiceHealthResponse(BaseModel):
    """Live scrape health for KRP application services."""

    checked_at: datetime
    services: list[ServiceHealthItem]


class MetricsWindow(BaseModel):
    """Time window for range-query metrics."""

    start: datetime
    end: datetime
    step_seconds: int


class RequestMetricsSeries(BaseModel):
    """Normalized request metric time series."""

    request_rate: list[TimeSeries]
    error_rate_5xx: list[TimeSeries]
    latency_p95_seconds: list[TimeSeries]


class RequestMetricsResponse(BaseModel):
    """Normalized HTTP request metrics."""

    checked_at: datetime
    window: MetricsWindow
    series: RequestMetricsSeries


class AvailabilitySlo(BaseModel):
    """Availability SLI/SLO values."""

    sli: float | None = None
    target: float | None = None
    compliant: bool | None = None
    error_budget_remaining: float | None = None
    error_budget_consumed: float | None = None


class LatencySlo(BaseModel):
    """Latency SLI/SLO values."""

    p95_seconds: float | None = None
    target_seconds: float = Field(default=LATENCY_SLO_TARGET_SECONDS)
    compliant: bool | None = None


class SloDiagnostics(BaseModel):
    """Supplementary SLO diagnostic metrics."""

    error_rate_5xx_ratio: float | None = None
    request_rate_5m: float | None = None


class SloMetricsResponse(BaseModel):
    """Live SLO metrics for a single service."""

    checked_at: datetime
    service: str
    availability: AvailabilitySlo
    latency: LatencySlo
    diagnostics: SloDiagnostics


class PostgresStatus(BaseModel):
    """PostgreSQL availability."""

    up: bool | None = None
    datname: str = POSTGRES_DATABASE_NAME


class ExporterStatus(BaseModel):
    """postgres-exporter scrape target status."""

    up: bool | None = None
    instance: str | None = None


class PostgresMetricsResponse(BaseModel):
    """PostgreSQL operational metrics."""

    checked_at: datetime
    postgres: PostgresStatus
    exporter: ExporterStatus
    connections: int | None = None
    database_size_bytes: int | None = None
