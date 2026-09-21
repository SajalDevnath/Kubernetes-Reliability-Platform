import httpx
import pytest
from loki_fixtures import SERVICE_LOGS_STREAMS


def _logs_service(observability_api_modules, build_upstream_clients):
    from app.services.logs_service import LogsService

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/loki/api/v1/query_range":
            return httpx.Response(200, json=SERVICE_LOGS_STREAMS)
        return httpx.Response(404)

    upstream_clients = build_upstream_clients(handler)
    return LogsService(upstream_clients.loki)


def test_get_logs_returns_normalized_entries(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _logs_service(observability_api_modules, build_upstream_clients)
    response = service.get_logs("user-service", limit=50)

    assert response.service == "user-service"
    assert response.limit == 50
    assert len(response.logs) == 3
    assert response.logs[0].message == "request failed"


def test_get_logs_uses_default_limit(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _logs_service(observability_api_modules, build_upstream_clients)
    response = service.get_logs("order-service")

    assert response.limit == 50


def test_get_logs_rejects_invalid_service(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.core.exceptions import InvalidRequest

    service = _logs_service(observability_api_modules, build_upstream_clients)

    with pytest.raises(InvalidRequest):
        service.get_logs("invalid-service")


def test_get_logs_rejects_invalid_limit(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.core.exceptions import InvalidRequest

    service = _logs_service(observability_api_modules, build_upstream_clients)

    with pytest.raises(InvalidRequest):
        service.get_logs("user-service", limit=0)

    with pytest.raises(InvalidRequest):
        service.get_logs("user-service", limit=101)
