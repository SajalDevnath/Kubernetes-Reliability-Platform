import httpx
from alertmanager_fixtures import EMPTY_ALERTS, POPULATED_ALERTS


def _combined_handler(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/api/v2/alerts":
        return httpx.Response(200, json=POPULATED_ALERTS)
    if request.url.path in {"/-/ready", "/ready"}:
        return httpx.Response(200, text="ready")
    return httpx.Response(404)


def test_alerts_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get("/api/observability/alerts")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["alerts"]) == 2
    assert payload["alerts"][0]["severity"] == "critical"
    assert payload["alerts"][0]["alert_name"] == "KRPServiceTargetDown"
    assert payload["alerts"][1]["severity"] == "warning"


def test_alerts_route_empty_response(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v2/alerts":
            return httpx.Response(200, json=EMPTY_ALERTS)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/alerts")

    assert response.status_code == 200
    payload = response.json()
    assert payload["alerts"] == []


def test_alerts_route_upstream_unavailable(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v2/alerts":
            raise httpx.ConnectError("connection refused", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/alerts")

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"


def test_alerts_route_upstream_timeout(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v2/alerts":
            raise httpx.ReadTimeout("timed out", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/alerts")

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "UPSTREAM_TIMEOUT"


def test_alerts_route_malformed_alertmanager_response(
    observability_api_client_factory,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v2/alerts":
            return httpx.Response(200, text="not-json")
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/alerts")

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_MALFORMED"
