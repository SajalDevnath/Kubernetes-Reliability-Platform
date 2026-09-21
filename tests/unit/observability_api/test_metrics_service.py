import httpx
import pytest
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


def _metrics_service(observability_api_modules, build_upstream_clients):
    from app.services.metrics_service import MetricsService

    settings = observability_api_modules["Settings"]()
    upstream_clients = build_upstream_clients(_prometheus_handler)
    return MetricsService(upstream_clients.prometheus, settings)


def test_get_service_health_returns_known_services(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _metrics_service(observability_api_modules, build_upstream_clients)
    response = service.get_service_health()

    assert len(response.services) == 3
    service_map = {item.service: item for item in response.services}
    assert service_map["user-service"].up is True
    assert service_map["order-service"].up is True
    assert service_map["payment-service"].up is False


def test_get_request_metrics_returns_normalized_series(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _metrics_service(observability_api_modules, build_upstream_clients)
    response = service.get_request_metrics(service="order-service", minutes=30)

    assert response.window.step_seconds == 60
    assert len(response.series.request_rate) == 1
    assert response.series.request_rate[0].points[0].value == 0.42
    assert response.series.error_rate_5xx[0].points[1].value is None


def test_get_slo_metrics_returns_null_for_missing_series(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _metrics_service(observability_api_modules, build_upstream_clients)
    response = service.get_slo_metrics("order-service")

    assert response.service == "order-service"
    assert response.availability.sli == 0.995
    assert response.availability.target == 0.99
    assert response.availability.compliant is True
    assert response.availability.error_budget_remaining is None
    assert response.latency.p95_seconds is None
    assert response.latency.target_seconds == 0.5


def test_get_postgres_metrics_returns_live_values(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _metrics_service(observability_api_modules, build_upstream_clients)
    response = service.get_postgres_metrics()

    assert response.postgres.up is True
    assert response.postgres.datname == "k8s_reliability"
    assert response.exporter.up is True
    assert response.exporter.instance == "postgres-exporter:9187"
    assert response.connections == 5
    assert response.database_size_bytes == 12345678


def test_get_slo_metrics_rejects_invalid_service(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.core.exceptions import InvalidRequest

    service = _metrics_service(observability_api_modules, build_upstream_clients)

    with pytest.raises(InvalidRequest):
        service.get_slo_metrics("invalid-service")
