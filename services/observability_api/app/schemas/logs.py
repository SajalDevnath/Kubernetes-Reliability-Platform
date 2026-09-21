from datetime import datetime

from pydantic import BaseModel


class LogEntry(BaseModel):
    """Normalized application log entry."""

    timestamp: datetime
    level: str | None = None
    service: str
    logger: str | None = None
    message: str
    method: str | None = None
    path: str | None = None
    status_code: int | None = None
    trace_id: str | None = None
    span_id: str | None = None


class LogsResponse(BaseModel):
    """Normalized logs response for a single service."""

    checked_at: datetime
    service: str
    limit: int
    logs: list[LogEntry]
