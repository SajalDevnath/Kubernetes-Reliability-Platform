import httpx
from loki_fixtures import SERVICE_LOGS_STREAMS


def _combined_handler(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/loki/api/v1/query_range":
        return httpx.Response(200, json=SERVICE_LOGS_STREAMS)
    if request.url.path in {"/-/ready", "/ready"}:
        return httpx.Response(200, text="ready")
    return httpx.Response(404)


def test_logs_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get(
            "/api/observability/logs",
            params={"service": "user-service", "limit": 50},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "user-service"
    assert payload["limit"] == 50
    assert len(payload["logs"]) == 3
    assert payload["logs"][0]["message"] == "request failed"
    assert payload["logs"][1]["method"] == "GET"
    assert payload["logs"][1]["path"] == "/health"


def test_logs_route_requires_service(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get("/api/observability/logs")

    assert response.status_code == 422


def test_logs_route_rejects_invalid_service(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get(
            "/api/observability/logs",
            params={"service": "invalid-service"},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_logs_route_rejects_invalid_limit(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get(
            "/api/observability/logs",
            params={"service": "user-service", "limit": 0},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_logs_route_upstream_unavailable(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/loki/api/v1/query_range":
            raise httpx.ConnectError("connection refused", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get(
            "/api/observability/logs",
            params={"service": "user-service"},
        )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"


def test_logs_route_upstream_timeout(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/loki/api/v1/query_range":
            raise httpx.ReadTimeout("timed out", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get(
            "/api/observability/logs",
            params={"service": "user-service"},
        )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "UPSTREAM_TIMEOUT"


def test_logs_route_malformed_loki_response(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/loki/api/v1/query_range":
            return httpx.Response(200, text="not-json")
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get(
            "/api/observability/logs",
            params={"service": "user-service"},
        )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_MALFORMED"
