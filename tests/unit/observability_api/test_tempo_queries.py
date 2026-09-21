import pytest


def test_trace_search_without_service(observability_api_modules) -> None:
    from app.queries.tempo import trace_search

    assert trace_search(None, 20) == {"limit": 20}


def test_trace_search_with_service(observability_api_modules) -> None:
    from app.queries.tempo import trace_search

    params = trace_search("payment-service", 5)
    assert params["limit"] == 5
    assert params["q"] == '{ trace:rootService = "payment-service" }'


def test_trace_search_rejects_unknown_service_via_validation(observability_api_modules) -> None:
    from app.core.exceptions import InvalidRequest
    from app.core.validation import validate_optional_service

    with pytest.raises(InvalidRequest):
        validate_optional_service("unknown-service")
