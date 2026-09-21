"""Request parameter validation for observability API."""

import re

from app.core.constants import (
    LOGS_LIMIT_DEFAULT,
    LOGS_LIMIT_MAX,
    LOGS_LIMIT_MIN,
    METRICS_RANGE_MINUTES_MAX,
    METRICS_RANGE_MINUTES_MIN,
    SERVICES,
    TRACES_LIMIT_DEFAULT,
    TRACES_LIMIT_MAX,
    TRACES_LIMIT_MIN,
)
from app.core.exceptions import InvalidRequest

TRACE_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{32}$")


def validate_service(service: str) -> str:
    """Validate a required service name against the allowlist."""
    if service not in SERVICES:
        raise InvalidRequest(
            f"Unknown service '{service}'. Allowed values: {', '.join(sorted(SERVICES))}"
        )
    return service


def validate_optional_service(service: str | None) -> str | None:
    """Validate an optional service name against the allowlist."""
    if service is None:
        return None
    return validate_service(service)


def validate_minutes(minutes: int | None, default: int) -> int:
    """Validate the metrics time window in minutes."""
    if minutes is None:
        return default
    if minutes < METRICS_RANGE_MINUTES_MIN or minutes > METRICS_RANGE_MINUTES_MAX:
        raise InvalidRequest(
            f"minutes must be between {METRICS_RANGE_MINUTES_MIN} "
            f"and {METRICS_RANGE_MINUTES_MAX}"
        )
    return minutes


def validate_logs_limit(limit: int | None) -> int:
    """Validate the logs result limit."""
    if limit is None:
        return LOGS_LIMIT_DEFAULT
    if limit < LOGS_LIMIT_MIN or limit > LOGS_LIMIT_MAX:
        raise InvalidRequest(
            f"limit must be between {LOGS_LIMIT_MIN} and {LOGS_LIMIT_MAX}"
        )
    return limit


def validate_traces_limit(limit: int | None) -> int:
    """Validate the traces result limit."""
    if limit is None:
        return TRACES_LIMIT_DEFAULT
    if limit < TRACES_LIMIT_MIN or limit > TRACES_LIMIT_MAX:
        raise InvalidRequest(
            f"limit must be between {TRACES_LIMIT_MIN} and {TRACES_LIMIT_MAX}"
        )
    return limit


def validate_trace_id(trace_id: str) -> str:
    """Validate a Tempo trace ID before use in upstream requests."""
    if not TRACE_ID_PATTERN.match(trace_id):
        raise InvalidRequest(
            "trace_id must be a 32-character hexadecimal string"
        )
    return trace_id.lower()
