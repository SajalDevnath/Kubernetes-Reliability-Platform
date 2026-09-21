import httpx
import pytest
from alertmanager_fixtures import EMPTY_ALERTS, POPULATED_ALERTS


def _alerts_service(observability_api_modules, build_upstream_clients):
    from app.services.alerts_service import AlertsService

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v2/alerts":
            return httpx.Response(200, json=POPULATED_ALERTS)
        return httpx.Response(404)

    upstream_clients = build_upstream_clients(handler)
    return AlertsService(upstream_clients.alertmanager)


def test_get_active_alerts_returns_normalized_alerts(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    service = _alerts_service(observability_api_modules, build_upstream_clients)
    response = service.get_active_alerts()

    assert len(response.alerts) == 2
    assert response.alerts[0].severity == "critical"
    assert response.alerts[1].severity == "warning"


def test_get_active_alerts_returns_empty_state(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.services.alerts_service import AlertsService

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v2/alerts":
            return httpx.Response(200, json=EMPTY_ALERTS)
        return httpx.Response(404)

    upstream_clients = build_upstream_clients(handler)
    service = AlertsService(upstream_clients.alertmanager)
    response = service.get_active_alerts()

    assert response.alerts == []


def test_get_active_alerts_propagates_upstream_errors(
    observability_api_modules,
    build_upstream_clients,
) -> None:
    from app.services.alerts_service import AlertsService

    upstream_unavailable = observability_api_modules["UpstreamUnavailable"]

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    upstream_clients = build_upstream_clients(handler)
    service = AlertsService(upstream_clients.alertmanager)

    with pytest.raises(upstream_unavailable):
        service.get_active_alerts()
