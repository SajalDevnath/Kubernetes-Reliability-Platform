"""Normalize Loki query responses into BFF log models."""

import json
from datetime import datetime, timezone

from app.core.exceptions import UpstreamMalformedResponse
from app.schemas.logs import LogEntry


def validate_loki_data(payload: dict[str, object]) -> dict[str, object]:
    """Validate and return the Loki data block from an API response."""
    status = payload.get("status")
    if status != "success":
        raise UpstreamMalformedResponse(
            "loki returned a non-success response",
            upstream="loki",
        )

    data = payload.get("data")
    if not isinstance(data, dict):
        raise UpstreamMalformedResponse(
            "loki returned malformed response data",
            upstream="loki",
        )

    return data


def parse_loki_timestamp(timestamp_ns: str) -> datetime:
    """Convert a Loki nanosecond timestamp to UTC datetime."""
    return datetime.fromtimestamp(int(timestamp_ns) / 1_000_000_000, tz=timezone.utc)


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


def parse_log_entry(
    stream_labels: dict[str, str],
    timestamp_ns: str,
    line: str,
    service: str,
) -> LogEntry:
    """Parse a single Loki stream value into a normalized log entry."""
    timestamp = parse_loki_timestamp(timestamp_ns)

    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        return LogEntry(
            timestamp=timestamp,
            level=_optional_str(stream_labels.get("level")),
            service=service,
            logger=_optional_str(stream_labels.get("logger")),
            message=line,
        )

    if not isinstance(payload, dict):
        return LogEntry(
            timestamp=timestamp,
            level=_optional_str(stream_labels.get("level")),
            service=service,
            logger=_optional_str(stream_labels.get("logger")),
            message=line,
        )

    message = _optional_str(payload.get("message")) or line
    parsed_timestamp = payload.get("timestamp")
    if isinstance(parsed_timestamp, str):
        try:
            timestamp = datetime.fromisoformat(parsed_timestamp.replace("Z", "+00:00"))
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    return LogEntry(
        timestamp=timestamp,
        level=_optional_str(payload.get("level")) or _optional_str(stream_labels.get("level")),
        service=_optional_str(payload.get("service")) or service,
        logger=_optional_str(payload.get("logger")) or _optional_str(stream_labels.get("logger")),
        message=message,
        method=_optional_str(payload.get("method")),
        path=_optional_str(payload.get("path")),
        status_code=_optional_int(payload.get("status_code")),
        trace_id=_optional_str(payload.get("trace_id")),
        span_id=_optional_str(payload.get("span_id")),
    )


def parse_log_streams(
    payload: dict[str, object],
    service: str,
    limit: int,
) -> list[LogEntry]:
    """Flatten, sort, and limit log entries from a Loki streams response."""
    data = validate_loki_data(payload)
    result_type = data.get("resultType")
    if result_type != "streams":
        raise UpstreamMalformedResponse(
            "loki returned unexpected result type",
            upstream="loki",
        )

    raw_result = data.get("result")
    if not isinstance(raw_result, list):
        raise UpstreamMalformedResponse(
            "loki returned malformed streams result",
            upstream="loki",
        )

    entries: list[LogEntry] = []
    for item in raw_result:
        if not isinstance(item, dict):
            continue

        stream = item.get("stream")
        values = item.get("values")
        if not isinstance(stream, dict) or not isinstance(values, list):
            continue

        stream_labels = {str(key): str(value) for key, value in stream.items()}
        for value_pair in values:
            if not isinstance(value_pair, list) or len(value_pair) != 2:
                continue
            timestamp_ns, line = value_pair
            if not isinstance(timestamp_ns, str) or not isinstance(line, str):
                continue
            entries.append(parse_log_entry(stream_labels, timestamp_ns, line, service))

    entries.sort(key=lambda entry: entry.timestamp, reverse=True)
    return entries[:limit]
