from datetime import datetime, timezone

import pytest
from tempo_fixtures import (
    MALFORMED_TRACE_DETAIL,
    TRACE_DETAIL_RESPONSE,
    TRACE_SEARCH_RESPONSE,
)


def test_parse_search_results_normalizes_summaries(observability_api_modules) -> None:
    from app.normalization.tempo import parse_search_results

    traces = parse_search_results(TRACE_SEARCH_RESPONSE)

    assert len(traces) == 2
    assert traces[0].trace_id == "70da75c121a8e55fb8dc385971bbde24"
    assert traces[0].service == "payment-service"
    assert traces[0].root_operation == "GET /metrics"
    assert traces[0].duration_ms == 1
    assert traces[0].start_time == datetime.fromtimestamp(
        1790004433.284656150,
        tz=timezone.utc,
    )


def test_parse_search_results_returns_empty_list_when_no_traces(
    observability_api_modules,
) -> None:
    from app.normalization.tempo import parse_search_results

    traces = parse_search_results({"traces": []})

    assert traces == []


def test_parse_trace_detail_normalizes_spans(observability_api_modules) -> None:
    from app.normalization.tempo import parse_trace_detail

    checked_at = datetime(2026, 9, 17, 15, 30, tzinfo=timezone.utc)
    response = parse_trace_detail(
        TRACE_DETAIL_RESPONSE,
        "70da75c121a8e55fb8dc385971bbde24",
        checked_at,
    )

    assert response.trace_id == "70da75c121a8e55fb8dc385971bbde24"
    assert response.service == "payment-service"
    assert len(response.spans) == 2
    assert response.spans[0].span_id == "root-span-01"
    assert response.spans[1].span_id == "child-span-01"
    assert response.spans[1].parent_span_id == "root-span-01"
    assert response.spans[1].kind == "SERVER"
    assert response.spans[1].status == "OK"
    assert response.spans[1].duration_ms == 1
    assert response.spans[1].attributes["http.method"] == "GET"
    assert response.spans[1].attributes["http.route"] == "/metrics"
    assert response.spans[1].attributes["http.target"] == "/metrics"
    assert response.spans[1].attributes["http.status_code"] == 200


def test_parse_trace_detail_handles_malformed_optional_attributes(
    observability_api_modules,
) -> None:
    from app.normalization.tempo import parse_trace_detail

    checked_at = datetime(2026, 9, 17, 15, 30, tzinfo=timezone.utc)
    response = parse_trace_detail(
        TRACE_DETAIL_RESPONSE,
        "70da75c121a8e55fb8dc385971bbde24",
        checked_at,
    )

    child_span = next(span for span in response.spans if span.span_id == "child-span-01")
    assert "broken.attribute" not in child_span.attributes


def test_parse_trace_detail_rejects_malformed_batches(observability_api_modules) -> None:
    from app.core.exceptions import UpstreamMalformedResponse
    from app.normalization.tempo import parse_trace_detail

    checked_at = datetime(2026, 9, 17, 15, 30, tzinfo=timezone.utc)

    with pytest.raises(UpstreamMalformedResponse) as exc_info:
        parse_trace_detail(
            MALFORMED_TRACE_DETAIL,
            "70da75c121a8e55fb8dc385971bbde24",
            checked_at,
        )

    assert exc_info.value.upstream == "tempo"


def test_nano_to_datetime_and_duration_helpers(observability_api_modules) -> None:
    from app.normalization.tempo import duration_ms_from_nanos, nano_to_datetime

    assert nano_to_datetime("1000000000") == datetime.fromtimestamp(1, tz=timezone.utc)
    assert duration_ms_from_nanos("1000000000", "1001000000") == 1
    assert duration_ms_from_nanos("bad", "1001000000") is None
