import httpx
from fastapi.testclient import TestClient


def test_observability_api_error_envelope(observability_api_modules) -> None:
    create_app = observability_api_modules["create_app"]
    upstream_unavailable = observability_api_modules["UpstreamUnavailable"]
    settings = observability_api_modules["Settings"]()

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    upstream_clients = observability_api_modules["UpstreamClients"].from_settings(
        settings,
        client_factory=lambda base_url, timeout: httpx.Client(
            transport=httpx.MockTransport(handler),
            base_url=base_url,
            timeout=timeout,
        ),
    )

    app = create_app(
        settings=settings,
        upstream_clients_factory=lambda _settings: upstream_clients,
    )

    @app.get("/test-upstream-error")
    def trigger_upstream_error() -> dict[str, str]:
        raise upstream_unavailable("Prometheus is unreachable", upstream="prometheus")

    client = TestClient(app)
    response = client.get("/test-upstream-error")

    assert response.status_code == 502
    assert response.json() == {
        "error": {
            "code": "UPSTREAM_UNAVAILABLE",
            "message": "Prometheus is unreachable",
            "upstream": "prometheus",
            "request_id": None,
        }
    }
