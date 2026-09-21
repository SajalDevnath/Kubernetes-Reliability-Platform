import httpx
from prometheus_fixtures import (
    ERROR_RATE_MATRIX,
    LATENCY_MATRIX,
    POSTGRES_CONNECTIONS_VECTOR,
    POSTGRES_EXPORTER_VECTOR,
    POSTGRES_SIZE_VECTOR,
    POSTGRES_UP_VECTOR,
    REQUEST_RATE_MATRIX,
    SERVICE_HEALTH_VECTOR,
    SLO_AVAILABILITY_VECTOR,
    SLO_COMPLIANT_VECTOR,
    SLO_EMPTY_VECTOR,
    SLO_TARGET_VECTOR,
)


def _prometheus_handler(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/-/ready":
        return httpx.Response(200, text="ready")
    if request.url.path == "/api/v1/query":
        query = request.url.params.get("query", "")
        if query == "pg_up":
            return httpx.Response(200, json=POSTGRES_UP_VECTOR)
        if query.startswith('up{job="postgres-exporter"}'):
            return httpx.Response(200, json=POSTGRES_EXPORTER_VECTOR)
        if query.startswith("up{job="):
            return httpx.Response(200, json=SERVICE_HEALTH_VECTOR)
        if query.startswith("pg_stat_database_numbackends"):
            return httpx.Response(200, json=POSTGRES_CONNECTIONS_VECTOR)
        if query.startswith("pg_database_size_bytes"):
            return httpx.Response(200, json=POSTGRES_SIZE_VECTOR)
        if query.startswith("krp:sli:availability:ratio"):
            return httpx.Response(200, json=SLO_AVAILABILITY_VECTOR)
        if query.startswith("krp:slo:availability:target"):
            return httpx.Response(200, json=SLO_TARGET_VECTOR)
        if query.startswith("krp:slo:availability:error_budget"):
            return httpx.Response(200, json=SLO_EMPTY_VECTOR)
        if query.startswith("krp:slo:availability:compliant"):
            return httpx.Response(200, json=SLO_COMPLIANT_VECTOR)
        if query.startswith("krp:sli:latency:p95:seconds"):
            return httpx.Response(200, json=SLO_EMPTY_VECTOR)
        if query.startswith("krp:slo:latency:p95:compliant"):
            return httpx.Response(200, json=SLO_COMPLIANT_VECTOR)
        if query.startswith("krp:sli:errors:5xx:ratio"):
            return httpx.Response(200, json=SLO_EMPTY_VECTOR)
        if query.startswith("krp:http_requests:rate5m"):
            return httpx.Response(200, json=SLO_EMPTY_VECTOR)
        return httpx.Response(200, json=SLO_EMPTY_VECTOR)

    if request.url.path == "/api/v1/query_range":
        query = request.url.params.get("query", "")
        if "http_requests_total" in query and "5.." not in query:
            return httpx.Response(200, json=REQUEST_RATE_MATRIX)
        if "5.." in query:
            return httpx.Response(200, json=ERROR_RATE_MATRIX)
        if "histogram_quantile" in query:
            return httpx.Response(200, json=LATENCY_MATRIX)
        return httpx.Response(200, json=REQUEST_RATE_MATRIX)

    return httpx.Response(404)


def test_metrics_services_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_prometheus_handler) as client:
        response = client.get("/api/observability/metrics/services")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["services"]) == 3
    assert payload["services"][0]["service"] in {
        "user-service",
        "order-service",
        "payment-service",
    }


def test_metrics_requests_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_prometheus_handler) as client:
        response = client.get(
            "/api/observability/metrics/requests",
            params={"service": "order-service", "minutes": 30},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["window"]["step_seconds"] == 60
    assert payload["series"]["request_rate"][0]["points"][0]["value"] == 0.42


def test_metrics_slo_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_prometheus_handler) as client:
        response = client.get(
            "/api/observability/metrics/slo",
            params={"service": "order-service"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "order-service"
    assert payload["availability"]["sli"] == 0.995
    assert payload["latency"]["target_seconds"] == 0.5


def test_metrics_postgres_route_success(observability_api_client_factory) -> None:
    with observability_api_client_factory(_prometheus_handler) as client:
        response = client.get("/api/observability/metrics/postgres")

    assert response.status_code == 200
    payload = response.json()
    assert payload["postgres"]["datname"] == "k8s_reliability"
    assert payload["connections"] == 5


def test_metrics_route_rejects_invalid_service(observability_api_client_factory) -> None:
    with observability_api_client_factory(_prometheus_handler) as client:
        response = client.get(
            "/api/observability/metrics/slo",
            params={"service": "invalid-service"},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_metrics_route_rejects_invalid_minutes(observability_api_client_factory) -> None:
    with observability_api_client_factory(_prometheus_handler) as client:
        response = client.get(
            "/api/observability/metrics/requests",
            params={"minutes": 4},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_metrics_route_upstream_unavailable(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/api/v1/"):
            raise httpx.ConnectError("connection refused", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/metrics/services")

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"


def test_metrics_route_upstream_timeout(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/api/v1/"):
            raise httpx.ReadTimeout("timed out", request=request)
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/metrics/services")

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "UPSTREAM_TIMEOUT"


def test_metrics_route_malformed_prometheus_response(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/api/v1/"):
            return httpx.Response(200, text="not-json")
        return httpx.Response(200, text="ready")

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/metrics/services")

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_MALFORMED"
