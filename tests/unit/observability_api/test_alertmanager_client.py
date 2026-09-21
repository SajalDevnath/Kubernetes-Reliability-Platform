import httpx
import pytest
from alertmanager_fixtures import EMPTY_ALERTS, POPULATED_ALERTS


def _alertmanager_client(observability_api_modules, handler):
    settings = observability_api_modules["Settings"]()
    alertmanager_client_cls = observability_api_modules["AlertmanagerClient"]
    timeout = settings.get_upstream_timeout()
    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.alertmanager_url,
        timeout=timeout,
    )
    return alertmanager_client_cls(
        base_url=settings.alertmanager_url,
        timeout=timeout,
        http_client=http_client,
    )


def test_alertmanager_client_get_alerts_empty(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v2/alerts"
        return httpx.Response(200, json=EMPTY_ALERTS)

    client = _alertmanager_client(observability_api_modules, handler)
    payload = client.get_alerts()

    assert payload == []


def test_alertmanager_client_get_alerts_populated(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=POPULATED_ALERTS)

    client = _alertmanager_client(observability_api_modules, handler)
    payload = client.get_alerts()

    assert len(payload) == 2


def test_alertmanager_client_check_ready_unchanged(observability_api_modules) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/-/ready":
            return httpx.Response(200, text="ready")
        return httpx.Response(404)

    client = _alertmanager_client(observability_api_modules, handler)
    probe = client.check_ready()

    assert probe.status == "up"


def test_alertmanager_client_get_alerts_upstream_timeout(observability_api_modules) -> None:
    upstream_timeout = observability_api_modules["UpstreamTimeout"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = _alertmanager_client(observability_api_modules, handler)

    with pytest.raises(upstream_timeout) as exc_info:
        client.get_alerts()

    assert exc_info.value.upstream == "alertmanager"


def test_alertmanager_client_get_alerts_malformed_response(observability_api_modules) -> None:
    upstream_malformed = observability_api_modules["UpstreamMalformedResponse"]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"alerts": []})

    client = _alertmanager_client(observability_api_modules, handler)

    with pytest.raises(upstream_malformed) as exc_info:
        client.get_alerts()

    assert exc_info.value.upstream == "alertmanager"
