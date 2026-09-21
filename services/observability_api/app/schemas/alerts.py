from datetime import datetime
from typing import Any

from pydantic import BaseModel


class Alert(BaseModel):
    """Normalized active Alertmanager alert."""

    fingerprint: str
    alert_name: str | None = None
    status: str | None = None
    severity: str | None = None
    service: str | None = None
    job: str | None = None
    instance: str | None = None
    summary: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    generator_url: str | None = None
    labels: dict[str, Any] = {}
    annotations: dict[str, Any] = {}


class AlertsResponse(BaseModel):
    """Normalized active alerts response."""

    checked_at: datetime
    alerts: list[Alert]
