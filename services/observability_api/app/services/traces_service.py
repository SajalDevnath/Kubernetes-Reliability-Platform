from datetime import datetime, timezone

from app.clients.tempo import TempoClient
from app.core.validation import (
    validate_optional_service,
    validate_trace_id,
    validate_traces_limit,
)
from app.normalization import tempo as tempo_norm
from app.schemas.traces import TraceDetailResponse, TraceSearchResponse


class TracesService:
    """Orchestrates curated Tempo trace queries and normalization."""

    def __init__(self, tempo_client: TempoClient) -> None:
        self._tempo = tempo_client

    def search_traces(
        self,
        service: str | None = None,
        limit: int | None = None,
    ) -> TraceSearchResponse:
        """Return normalized recent traces, optionally filtered by service."""
        validated_service = validate_optional_service(service)
        validated_limit = validate_traces_limit(limit)
        checked_at = datetime.now(timezone.utc)

        payload = self._tempo.search_traces(
            limit=validated_limit,
            service=validated_service,
        )
        traces = tempo_norm.parse_search_results(payload)

        return TraceSearchResponse(
            checked_at=checked_at,
            service=validated_service,
            limit=validated_limit,
            traces=traces,
        )

    def get_trace_detail(self, trace_id: str) -> TraceDetailResponse:
        """Return normalized trace detail for a validated trace ID."""
        validated_trace_id = validate_trace_id(trace_id)
        checked_at = datetime.now(timezone.utc)

        payload = self._tempo.get_trace(validated_trace_id)
        return tempo_norm.parse_trace_detail(payload, validated_trace_id, checked_at)
