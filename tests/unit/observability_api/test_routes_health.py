import httpx


def _ready_handler(request: httpx.Request) -> httpx.Response:
    ready_paths = {
        "/-/ready": ("prometheus", "alertmanager"),
        "/ready": ("loki", "tempo"),
    }
    for path, _components in ready_paths.items():
        if request.url.path == path:
            return httpx.Response(200, text="ready")
    return httpx.Response(404)


def test_health_endpoint_returns_ok(observability_api_client_factory) -> None:
    with observability_api_client_factory(_ready_handler) as client:
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_observability_health_all_up(observability_api_client_factory) -> None:
    with observability_api_client_factory(_ready_handler) as client:
        response = client.get("/api/observability/health")

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "healthy"
        assert payload["checked_at"] is not None
        assert len(payload["components"]) == 5

        component_map = {component["name"]: component for component in payload["components"]}
        assert component_map["bff"]["status"] == "up"
        assert component_map["prometheus"]["status"] == "up"
        assert component_map["loki"]["status"] == "up"
        assert component_map["tempo"]["status"] == "up"
        assert component_map["alertmanager"]["status"] == "up"
        assert component_map["prometheus"]["latency_ms"] is not None


def test_observability_health_one_upstream_down(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/-/ready" and request.url.port == 9090:
            raise httpx.ConnectError("connection refused", request=request)
        return _ready_handler(request)

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/health")

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "degraded"

        component_map = {component["name"]: component for component in payload["components"]}
        assert component_map["prometheus"]["status"] == "down"
        assert component_map["prometheus"]["error"] == "prometheus is unreachable"
        assert component_map["loki"]["status"] == "up"


def test_observability_health_upstream_timeout(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/ready" and request.url.port == 3200:
            raise httpx.ReadTimeout("timed out", request=request)
        return _ready_handler(request)

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/health")

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "degraded"

        component_map = {component["name"]: component for component in payload["components"]}
        assert component_map["tempo"]["status"] == "down"
        assert component_map["tempo"]["error"] == "tempo request timed out"


def test_observability_health_all_upstreams_down(observability_api_client_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    with observability_api_client_factory(handler) as client:
        response = client.get("/api/observability/health")

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "unhealthy"

        upstream_components = [
            component for component in payload["components"] if component["name"] != "bff"
        ]
        assert all(component["status"] == "down" for component in upstream_components)
