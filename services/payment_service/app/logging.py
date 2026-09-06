import json
import logging
import logging.config
import re
import traceback
from datetime import datetime, timezone
from typing import Any

from opentelemetry import trace

_ACCESS_LOG_PATTERN = re.compile(r'^(.+?) - "(\w+) ([^"]+) HTTP/[\d.]+" (\d+)$')

_OPTIONAL_FIELDS = (
    "method",
    "path",
    "status_code",
    "duration_ms",
    "request_id",
    "trace_id",
    "span_id",
)


def _active_trace_fields() -> dict[str, str]:
    span_context = trace.get_current_span().get_span_context()
    if not span_context.is_valid:
        return {}
    return {
        "trace_id": format(span_context.trace_id, "032x"),
        "span_id": format(span_context.span_id, "016x"),
    }


class JsonFormatter(logging.Formatter):
    """Format log records as a single JSON object per line (ADR-022)."""

    def __init__(self, service_name: str) -> None:
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        dt = datetime.fromtimestamp(record.created, tz=timezone.utc)
        timestamp = dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"

        payload: dict[str, Any] = {
            "timestamp": timestamp,
            "level": record.levelname,
            "service": self.service_name,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.name == "uvicorn.access":
            match = _ACCESS_LOG_PATTERN.match(record.getMessage())
            if match is not None:
                payload["method"] = match.group(2)
                payload["path"] = match.group(3)
                payload["status_code"] = int(match.group(4))

        for field in _OPTIONAL_FIELDS:
            value = getattr(record, field, None)
            if value is not None and field not in payload:
                payload[field] = value

        for field, value in _active_trace_fields().items():
            if field not in payload:
                payload[field] = value

        if record.exc_info:
            exc_type, exc_value, _exc_tb = record.exc_info
            if exc_type is not None:
                payload["exc_type"] = exc_type.__name__
                payload["exc_message"] = str(exc_value)
            payload["stack"] = "".join(traceback.format_exception(*record.exc_info))

        return json.dumps(payload, ensure_ascii=False)


def build_log_config(service_name: str, log_level: str) -> dict[str, Any]:
    """Build a logging dictConfig compatible with application and Uvicorn loggers."""
    level = log_level.upper()
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": "app.logging.JsonFormatter",
                "service_name": service_name,
            },
        },
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "handlers": ["default"],
            "level": level,
        },
        "loggers": {
            "uvicorn": {"handlers": ["default"], "level": level, "propagate": False},
            "uvicorn.error": {"handlers": ["default"], "level": level, "propagate": False},
            "uvicorn.access": {"handlers": ["default"], "level": level, "propagate": False},
        },
    }


def setup_logging(service_name: str, log_level: str) -> None:
    """Configure structured JSON logging for the application and Uvicorn."""
    logging.config.dictConfig(build_log_config(service_name, log_level))
    logging.captureWarnings(True)
