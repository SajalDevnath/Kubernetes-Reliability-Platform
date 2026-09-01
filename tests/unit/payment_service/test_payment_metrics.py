from collections.abc import Generator
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient
from prometheus_client import CONTENT_TYPE_LATEST


@asynccontextmanager
async def _noop_lifespan(_application):
    yield


@pytest.fixture
def metrics_client(payment_service_modules) -> Generator[TestClient, None, None]:
    from app.main import create_app

    app = create_app()
    app.router.lifespan_context = _noop_lifespan
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


def test_metrics_returns_200(metrics_client: TestClient) -> None:
    response = metrics_client.get("/metrics")

    assert response.status_code == 200


def test_metrics_content_type_is_prometheus_text(metrics_client: TestClient) -> None:
    response = metrics_client.get("/metrics")

    assert response.headers["content-type"] == CONTENT_TYPE_LATEST


def test_metrics_exposes_http_request_metric_names(metrics_client: TestClient) -> None:
    metrics_client.get("/health")
    response = metrics_client.get("/metrics")

    body = response.text
    assert "http_requests_total" in body
    assert "http_request_duration_seconds" in body


def test_metrics_handler_uses_route_template_not_raw_id(metrics_client: TestClient) -> None:
    metrics_client.get("/payments/42")
    response = metrics_client.get("/metrics")

    body = response.text
    assert 'handler="/payments/{payment_id}"' in body
    assert 'handler="/payments/42"' not in body


def test_metrics_endpoint_excluded_from_request_metrics(metrics_client: TestClient) -> None:
    metrics_client.get("/metrics")
    metrics_client.get("/metrics")
    response = metrics_client.get("/metrics")

    assert 'handler="/metrics"' not in response.text
