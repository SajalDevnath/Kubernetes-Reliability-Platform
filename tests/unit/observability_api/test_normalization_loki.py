import pytest
from loki_fixtures import (
    MALFORMED_RESULT_TYPE,
    MALFORMED_STATUS,
    SERVICE_LOGS_STREAMS,
)


def test_parse_log_streams_parses_json_logs(observability_api_modules) -> None:
    from app.normalization.loki import parse_log_streams

    entries = parse_log_streams(SERVICE_LOGS_STREAMS, "user-service", limit=50)

    json_entry = next(entry for entry in entries if entry.method == "GET")
    assert json_entry.level == "INFO"
    assert json_entry.service == "user-service"
    assert json_entry.logger == "uvicorn.access"
    assert json_entry.message == "GET /health"
    assert json_entry.path == "/health"
    assert json_entry.status_code == 200
    assert json_entry.trace_id == "trace-1"
    assert json_entry.span_id == "span-1"


def test_parse_log_streams_handles_malformed_log_lines(observability_api_modules) -> None:
    from app.normalization.loki import parse_log_streams

    entries = parse_log_streams(SERVICE_LOGS_STREAMS, "user-service", limit=50)

    malformed_entry = next(entry for entry in entries if entry.message == "plain text log line")
    assert malformed_entry.level == "INFO"
    assert malformed_entry.logger == "uvicorn.access"
    assert malformed_entry.method is None
    assert malformed_entry.path is None
    assert malformed_entry.status_code is None
    assert malformed_entry.trace_id is None
    assert malformed_entry.span_id is None


def test_parse_log_streams_sorts_newest_first(observability_api_modules) -> None:
    from app.normalization.loki import parse_log_streams

    entries = parse_log_streams(SERVICE_LOGS_STREAMS, "user-service", limit=50)

    assert entries[0].level == "ERROR"
    assert entries[0].message == "request failed"
    assert entries[1].message == "GET /health"
    assert entries[2].message == "plain text log line"


def test_parse_log_streams_enforces_limit(observability_api_modules) -> None:
    from app.normalization.loki import parse_log_streams

    entries = parse_log_streams(SERVICE_LOGS_STREAMS, "user-service", limit=2)

    assert len(entries) == 2
    assert entries[0].message == "request failed"
    assert entries[1].message == "GET /health"


def test_parse_log_streams_rejects_non_success_status(observability_api_modules) -> None:
    from app.core.exceptions import UpstreamMalformedResponse
    from app.normalization.loki import parse_log_streams

    with pytest.raises(UpstreamMalformedResponse) as exc_info:
        parse_log_streams(MALFORMED_STATUS, "user-service", limit=10)

    assert exc_info.value.upstream == "loki"


def test_parse_log_streams_rejects_unexpected_result_type(observability_api_modules) -> None:
    from app.core.exceptions import UpstreamMalformedResponse
    from app.normalization.loki import parse_log_streams

    with pytest.raises(UpstreamMalformedResponse) as exc_info:
        parse_log_streams(MALFORMED_RESULT_TYPE, "user-service", limit=10)

    assert exc_info.value.upstream == "loki"
