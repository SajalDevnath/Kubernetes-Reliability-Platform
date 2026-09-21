import httpx
import pytest
from tempo_fixtures import TRACE_DETAIL_RESPONSE, TRACE_SEARCH_RESPONSE


def _traces_service(observability_api_modules, build_upstream_clients):
    from app.services.traces_service import TracesService

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/search":
            return httpx.Response(200, json=TRACE_SEARCH_RESPONSE)
        if request.url.path.startswith("/api/traces/"):
            return httpx.Response(200, json=TRACE_DETAIL_RESPONSE)
        return httpx.Response(404)

    upstream_clients = build_upstream_clients(handler)
    return TracesService(upstream_clients.tempo)


def test_search_traces_returns_normalized_summaries(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _traces_service(observability_api_modules, build_upstream_clients)
    response = service.search_traces(service="payment-service", limit=20)

    assert response.service == "payment-service"
    assert response.limit == 20
    assert len(response.traces) == 2
    assert response.traces[0].root_operation == "GET /metrics"


def test_search_traces_uses_default_limit(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _traces_service(observability_api_modules, build_upstream_clients)
    response = service.search_traces()

    assert response.limit == 20


def test_search_traces_rejects_invalid_service(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.core.exceptions import InvalidRequest

    service = _traces_service(observability_api_modules, build_upstream_clients)

    with pytest.raises(InvalidRequest):
        service.search_traces(service="invalid-service")


def test_search_traces_rejects_invalid_limit(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.core.exceptions import InvalidRequest

    service = _traces_service(observability_api_modules, build_upstream_clients)

    with pytest.raises(InvalidRequest):
        service.search_traces(limit=0)


def test_get_trace_detail_returns_normalized_spans(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _traces_service(observability_api_modules, build_upstream_clients)
    response = service.get_trace_detail("70da75c121a8e55fb8dc385971bbde24")

    assert response.trace_id == "70da75c121a8e55fb8dc385971bbde24"
    assert response.service == "payment-service"
    assert len(response.spans) == 2


def test_get_trace_detail_rejects_invalid_trace_id(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.core.exceptions import InvalidRequest

    service = _traces_service(observability_api_modules, build_upstream_clients)

    with pytest.raises(InvalidRequest):
        service.get_trace_detail("not-a-valid-trace-id")
