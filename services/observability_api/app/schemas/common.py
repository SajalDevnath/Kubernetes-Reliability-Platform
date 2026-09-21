from datetime import datetime

from pydantic import BaseModel


class TimeSeriesPoint(BaseModel):
    """Single point in a normalized time series."""

    timestamp: datetime
    value: float | None


class TimeSeries(BaseModel):
    """Normalized Prometheus matrix series."""

    labels: dict[str, str]
    points: list[TimeSeriesPoint]


class InstantSample(BaseModel):
    """Normalized Prometheus instant query sample."""

    labels: dict[str, str]
    value: float | None
    timestamp: datetime | None = None


class ErrorDetail(BaseModel):
    """Standard BFF error payload."""

    code: str
    message: str
    upstream: str | None = None
    request_id: str | None = None


class ErrorEnvelope(BaseModel):
    """Standard BFF error response envelope."""

    error: ErrorDetail
