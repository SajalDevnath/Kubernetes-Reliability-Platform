import httpx
import pytest


def _base_client(observability_api_modules, handler):
    settings = observability_api_modules["Settings"]()
    base_http_client = observability_api_modules["BaseHttpClient"]
    timeout = settings.get_upstream_timeout()
    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.prometheus_url,
        timeout=timeout,
    )
    return base_http_client(
        base_url=settings.prometheus_url,
        timeout=timeout,
        upstream_name="prometheus",
        http_client=http_client,
    )


def test_base_client_get_json_success(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/status/config"
        return httpx.Response(200, json={"status": "success"})

    client = _base_client(observability_api_modules, handler)
    payload = client.get_json("/api/v1/status/config")

    assert payload == {"status": "success"}


def test_base_client_raises_unavailable_on_connection_error(observability_api_modules) -> None:
    upstream_unavailable = observability_api_modules["UpstreamUnavailable"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    client = _base_client(observability_api_modules, handler)

    with pytest.raises(upstream_unavailable) as exc_info:
        client.get_json("/api/v1/status/config")

    assert exc_info.value.code == "UPSTREAM_UNAVAILABLE"
    assert exc_info.value.upstream == "prometheus"


def test_base_client_raises_timeout(observability_api_modules) -> None:
    upstream_timeout = observability_api_modules["UpstreamTimeout"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = _base_client(observability_api_modules, handler)

    with pytest.raises(upstream_timeout) as exc_info:
        client.get_json("/api/v1/status/config")

    assert exc_info.value.code == "UPSTREAM_TIMEOUT"
    assert exc_info.value.upstream == "prometheus"


def test_base_client_raises_http_error_on_non_2xx(observability_api_modules) -> None:
    upstream_http_error = observability_api_modules["UpstreamHttpError"]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="unavailable")

    client = _base_client(observability_api_modules, handler)

    with pytest.raises(upstream_http_error) as exc_info:
        client.get_json("/api/v1/status/config")

    assert exc_info.value.code == "UPSTREAM_HTTP_ERROR"
    assert exc_info.value.http_status_code == 503


def test_base_client_raises_malformed_response(observability_api_modules) -> None:
    upstream_malformed = observability_api_modules["UpstreamMalformedResponse"]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="not-json")

    client = _base_client(observability_api_modules, handler)

    with pytest.raises(upstream_malformed) as exc_info:
        client.get_json("/api/v1/status/config")

    assert exc_info.value.code == "UPSTREAM_MALFORMED"


def test_probe_ready_reports_down_on_timeout(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/-/ready":
            raise httpx.ReadTimeout("timed out", request=request)
        return httpx.Response(404)

    upstream_clients = build_upstream_clients(handler)
    probe = upstream_clients.prometheus.check_ready()

    assert probe.status == "down"
    assert probe.error == "prometheus request timed out"


def test_probe_ready_reports_down_on_http_error(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/-/ready":
            return httpx.Response(503, text="not ready")
        return httpx.Response(404)

    upstream_clients = build_upstream_clients(handler)
    probe = upstream_clients.prometheus.check_ready()

    assert probe.status == "down"
    assert probe.error == "HTTP 503"
    assert probe.latency_ms is not None
