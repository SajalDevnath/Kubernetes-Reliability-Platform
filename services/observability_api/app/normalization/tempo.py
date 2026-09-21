"""Normalize Tempo search and trace detail responses into BFF models."""

from datetime import datetime, timezone
from typing import Any

from app.core.exceptions import UpstreamMalformedResponse
from app.schemas.traces import SpanDetail, TraceDetailResponse, TraceSummary


def _optional_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value)
    return text if text else None


def _optional_int(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def nano_to_datetime(value: object) -> datetime | None:
    """Convert a Tempo/OTLP nanosecond timestamp to UTC datetime."""
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1_000_000_000, tz=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def duration_ms_from_nanos(start_ns: object, end_ns: object) -> int | None:
    """Calculate span duration in milliseconds from nanosecond timestamps."""
    try:
        start = int(start_ns)
        end = int(end_ns)
    except (TypeError, ValueError):
        return None
    if end < start:
        return None
    return int((end - start) / 1_000_000)


def _normalize_kind(kind: str | None) -> str | None:
    if not kind:
        return None
    if kind.startswith("SPAN_KIND_"):
        return kind.removeprefix("SPAN_KIND_")
    return kind


def _normalize_status(status: object) -> str | None:
    if not isinstance(status, dict):
        return None
    code = _optional_str(status.get("code"))
    if not code:
        return None
    if code.startswith("STATUS_CODE_"):
        return code.removeprefix("STATUS_CODE_")
    return code


def _parse_otlp_attribute_value(value: object) -> Any:
    if not isinstance(value, dict):
        return None
    if "stringValue" in value:
        return value["stringValue"]
    if "intValue" in value:
        return _optional_int(value["intValue"])
    if "boolValue" in value:
        return bool(value["boolValue"])
    if "doubleValue" in value:
        try:
            return float(value["doubleValue"])
        except (TypeError, ValueError):
            return None
    if "arrayValue" in value or "kvlistValue" in value:
        return None
    return None


def _parse_otlp_attributes(attributes: object) -> dict[str, Any]:
    if not isinstance(attributes, list):
        return {}

    parsed: dict[str, Any] = {}
    for item in attributes:
        if not isinstance(item, dict):
            continue
        key = _optional_str(item.get("key"))
        if not key:
            continue
        try:
            value = _parse_otlp_attribute_value(item.get("value"))
        except (TypeError, ValueError):
            continue
        if value is not None:
            parsed[key] = value
    return parsed


def _extract_service_from_resource(resource: object) -> str | None:
    if not isinstance(resource, dict):
        return None
    attributes = _parse_otlp_attributes(resource.get("attributes"))
    service = attributes.get("service.name")
    return _optional_str(service)


def _normalize_http_attributes(attributes: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(attributes)
    for key in ("http.method", "http.route", "http.target", "http.status_code"):
        if key in attributes and attributes[key] is not None:
            normalized[key] = attributes[key]
    return normalized


def parse_search_results(payload: dict[str, object]) -> list[TraceSummary]:
    """Normalize Tempo search results into trace summaries."""
    traces_raw = payload.get("traces")
    if traces_raw is None:
        return []
    if not isinstance(traces_raw, list):
        raise UpstreamMalformedResponse(
            "tempo returned malformed search results",
            upstream="tempo",
        )

    summaries: list[TraceSummary] = []
    for item in traces_raw:
        if not isinstance(item, dict):
            continue

        trace_id = _optional_str(item.get("traceID"))
        if not trace_id:
            continue

        start_time = nano_to_datetime(item.get("startTimeUnixNano"))
        summaries.append(
            TraceSummary(
                trace_id=trace_id.lower(),
                service=_optional_str(item.get("rootServiceName")),
                root_operation=_optional_str(item.get("rootTraceName")),
                start_time=start_time,
                duration_ms=_optional_int(item.get("durationMs")),
            )
        )

    summaries.sort(
        key=lambda trace: trace.start_time or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return summaries


def _parse_span(span: dict[str, object], default_service: str | None) -> SpanDetail | None:
    span_id = _optional_str(span.get("spanId"))
    if not span_id:
        return None

    start_time = nano_to_datetime(span.get("startTimeUnixNano"))
    end_time = nano_to_datetime(span.get("endTimeUnixNano"))
    attributes = _normalize_http_attributes(_parse_otlp_attributes(span.get("attributes")))
    parent_span_id = _optional_str(span.get("parentSpanId"))
    if parent_span_id == "":
        parent_span_id = None

    duration_ms = duration_ms_from_nanos(
        span.get("startTimeUnixNano"),
        span.get("endTimeUnixNano"),
    )

    return SpanDetail(
        span_id=span_id,
        parent_span_id=parent_span_id,
        name=_optional_str(span.get("name")),
        kind=_normalize_kind(_optional_str(span.get("kind"))),
        start_time=start_time,
        end_time=end_time,
        duration_ms=duration_ms,
        status=_normalize_status(span.get("status")),
        attributes=attributes,
    )


def parse_trace_detail(
    payload: dict[str, object],
    trace_id: str,
    checked_at: datetime,
) -> TraceDetailResponse:
    """Normalize Tempo trace detail into BFF models."""
    batches = payload.get("batches")
    if not isinstance(batches, list):
        raise UpstreamMalformedResponse(
            "tempo returned malformed trace detail",
            upstream="tempo",
        )

    spans: list[SpanDetail] = []
    service: str | None = None

    for batch in batches:
        if not isinstance(batch, dict):
            continue

        batch_service = _extract_service_from_resource(batch.get("resource"))
        if batch_service and service is None:
            service = batch_service

        scope_spans = batch.get("scopeSpans")
        if not isinstance(scope_spans, list):
            continue

        for scope_span in scope_spans:
            if not isinstance(scope_span, dict):
                continue
            raw_spans = scope_span.get("spans")
            if not isinstance(raw_spans, list):
                continue
            for raw_span in raw_spans:
                if not isinstance(raw_span, dict):
                    continue
                parsed = _parse_span(raw_span, batch_service)
                if parsed is not None:
                    spans.append(parsed)

    spans.sort(
        key=lambda span: span.start_time or datetime.min.replace(tzinfo=timezone.utc),
    )

    return TraceDetailResponse(
        checked_at=checked_at,
        trace_id=trace_id,
        service=service,
        spans=spans,
    )
