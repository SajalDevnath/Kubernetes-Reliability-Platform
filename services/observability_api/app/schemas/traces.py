from datetime import datetime
from typing import Any

from pydantic import BaseModel


class TraceSummary(BaseModel):
    """Normalized trace summary from Tempo search."""

    trace_id: str
    service: str | None = None
    root_operation: str | None = None
    start_time: datetime | None = None
    duration_ms: int | None = None


class TraceSearchResponse(BaseModel):
    """Normalized trace search response."""

    checked_at: datetime
    service: str | None = None
    limit: int
    traces: list[TraceSummary]


class SpanDetail(BaseModel):
    """Normalized span from Tempo trace detail."""

    span_id: str
    parent_span_id: str | None = None
    name: str | None = None
    kind: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_ms: int | None = None
    status: str | None = None
    attributes: dict[str, Any] = {}


class TraceDetailResponse(BaseModel):
    """Normalized trace detail response."""

    checked_at: datetime
    trace_id: str
    service: str | None = None
    spans: list[SpanDetail]
