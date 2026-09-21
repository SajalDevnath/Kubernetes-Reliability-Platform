import httpx
from tempo_fixtures import TRACE_DETAIL_RESPONSE, TRACE_SEARCH_RESPONSE


def _combined_handler(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/api/search":
        return httpx.Response(200, json=TRACE_SEARCH_RESPONSE)
    if request.url.path.startswith("/api/traces/"):
        return httpx.Response(200, json=TRACE_DETAIL_RESPONSE)
    if request.url.path in {"/-/ready", "/ready"}:
        return httpx.Response(200, text="ready")
    return httpx.Response(404)


def test_traces_search_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get(
            "/api/observability/traces",
            params={"service": "payment-service", "limit": 20},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "payment-service"
    assert payload["limit"] == 20
    assert len(payload["traces"]) == 2
    assert payload["traces"][0]["trace_id"] == "70da75c121a8e55fb8dc385971bbde24"
    assert payload["traces"][0]["root_operation"] == "GET /metrics"


def test_traces_search_route_without_service(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get("/api/observability/traces", params={"limit": 20})

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] is None
    assert payload["limit"] == 20


def test_traces_search_route_rejects_invalid_service(
    observability_api_client_factory,
) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get(
            "/api/observability/traces",
            params={"service": "invalid-service"},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_traces_search_route_rejects_invalid_limit(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get(
            "/api/observability/traces",
            params={"limit": 101},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_traces_detail_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get(
            "/api/observability/traces/70da75c121a8e55fb8dc385971bbde24",
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["trace_id"] == "70da75c121a8e55fb8dc385971bbde24"
    assert payload["service"] == "payment-service"
    assert len(payload["spans"]) == 2
    assert payload["spans"][1]["attributes"]["http.method"] == "GET"


def test_traces_detail_route_rejects_invalid_trace_id(
    observability_api_client_factory,
) -> None:
    with observability_api_client_factory(_combined_handler) as client:
        response = client.get("/api/observability/traces/not-valid")

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_traces_route_upstream_unavailable(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/search":
            raise httpx.ConnectError("connection refused", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/traces")

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"


def test_traces_detail_route_upstream_timeout(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/api/traces/"):
            raise httpx.ReadTimeout("timed out", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get(
            "/api/observability/traces/70da75c121a8e55fb8dc385971bbde24",
        )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "UPSTREAM_TIMEOUT"


def test_traces_detail_route_malformed_tempo_response(
    observability_api_client_factory,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/api/traces/"):
            return httpx.Response(200, json={"batches": "invalid"})
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get(
            "/api/observability/traces/70da75c121a8e55fb8dc385971bbde24",
        )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_MALFORMED"
