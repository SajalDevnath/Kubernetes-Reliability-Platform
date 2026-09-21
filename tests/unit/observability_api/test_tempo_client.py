import httpx
import pytest
from tempo_fixtures import TRACE_DETAIL_RESPONSE, TRACE_SEARCH_RESPONSE


def _tempo_client(observability_api_modules, handler):
    settings = observability_api_modules["Settings"]()
    tempo_client_cls = observability_api_modules["TempoClient"]
    timeout = settings.get_upstream_timeout()
    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.tempo_url,
        timeout=timeout,
    )
    return tempo_client_cls(
        base_url=settings.tempo_url,
        timeout=timeout,
        http_client=http_client,
    )


def test_tempo_client_search_traces_success(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/search"
        assert request.url.params["limit"] == "20"
        assert request.url.params["q"] == '{ trace:rootService = "user-service" }'
        return httpx.Response(200, json=TRACE_SEARCH_RESPONSE)

    client = _tempo_client(observability_api_modules, handler)
    payload = client.search_traces(limit=20, service="user-service")

    assert len(payload["traces"]) == 2


def test_tempo_client_search_traces_without_service(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/search"
        assert request.url.params["limit"] == "5"
        assert "q" not in request.url.params
        return httpx.Response(200, json=TRACE_SEARCH_RESPONSE)

    client = _tempo_client(observability_api_modules, handler)
    payload = client.search_traces(limit=5)

    assert "traces" in payload


def test_tempo_client_get_trace_success(observability_api_modules) -> None:
    trace_id = "70da75c121a8e55fb8dc385971bbde24"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == f"/api/traces/{trace_id}"
        return httpx.Response(200, json=TRACE_DETAIL_RESPONSE)

    client = _tempo_client(observability_api_modules, handler)
    payload = client.get_trace(trace_id)

    assert "batches" in payload


def test_tempo_client_check_ready_unchanged(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/ready":
            return httpx.Response(200, text="ready")
        return httpx.Response(404)

    client = _tempo_client(observability_api_modules, handler)
    probe = client.check_ready()

    assert probe.status == "up"


def test_tempo_client_search_upstream_timeout(observability_api_modules) -> None:
    upstream_timeout = observability_api_modules["UpstreamTimeout"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = _tempo_client(observability_api_modules, handler)

    with pytest.raises(upstream_timeout) as exc_info:
        client.search_traces(limit=10)

    assert exc_info.value.upstream == "tempo"


def test_tempo_client_get_trace_upstream_unavailable(observability_api_modules) -> None:
    upstream_unavailable = observability_api_modules["UpstreamUnavailable"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    client = _tempo_client(observability_api_modules, handler)

    with pytest.raises(upstream_unavailable) as exc_info:
        client.get_trace("70da75c121a8e55fb8dc385971bbde24")

    assert exc_info.value.upstream == "tempo"
