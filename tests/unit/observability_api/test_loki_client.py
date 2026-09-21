import httpx
import pytest
from loki_fixtures import SERVICE_LOGS_STREAMS


def _loki_client(observability_api_modules, handler):
    settings = observability_api_modules["Settings"]()
    loki_client_cls = observability_api_modules["LokiClient"]
    timeout = settings.get_upstream_timeout()
    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.loki_url,
        timeout=timeout,
    )
    return loki_client_cls(
        base_url=settings.loki_url,
        timeout=timeout,
        http_client=http_client,
    )


def test_loki_client_query_range_success(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/loki/api/v1/query_range"
        assert request.url.params["query"] == '{service="user-service"}'
        assert request.url.params["start"] == "1000000000"
        assert request.url.params["end"] == "2000000000"
        assert request.url.params["limit"] == "25"
        assert request.url.params["direction"] == "backward"
        return httpx.Response(200, json=SERVICE_LOGS_STREAMS)

    client = _loki_client(observability_api_modules, handler)
    payload = client.query_range(
        '{service="user-service"}',
        start_ns=1_000_000_000,
        end_ns=2_000_000_000,
        limit=25,
    )

    assert payload["status"] == "success"


def test_loki_client_check_ready_unchanged(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/ready":
            return httpx.Response(200, text="ready")
        return httpx.Response(404)

    client = _loki_client(observability_api_modules, handler)
    probe = client.check_ready()

    assert probe.status == "up"


def test_loki_client_query_range_upstream_unavailable(observability_api_modules) -> None:
    upstream_unavailable = observability_api_modules["UpstreamUnavailable"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    client = _loki_client(observability_api_modules, handler)

    with pytest.raises(upstream_unavailable) as exc_info:
        client.query_range(
            '{service="user-service"}',
            start_ns=1,
            end_ns=2,
            limit=10,
        )

    assert exc_info.value.upstream == "loki"


def test_loki_client_query_range_upstream_timeout(observability_api_modules) -> None:
    upstream_timeout = observability_api_modules["UpstreamTimeout"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = _loki_client(observability_api_modules, handler)

    with pytest.raises(upstream_timeout) as exc_info:
        client.query_range(
            '{service="user-service"}',
            start_ns=1,
            end_ns=2,
            limit=10,
        )

    assert exc_info.value.upstream == "loki"
