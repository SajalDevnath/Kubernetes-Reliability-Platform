import httpx
import pytest
from opentelemetry import trace
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from app.core.config import get_settings
from app.tracing import build_resource


@pytest.fixture(autouse=True)
def reset_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_build_resource_uses_order_service_name() -> None:
    resource = build_resource("order-service")

    assert resource.attributes["service.name"] == "order-service"


def test_settings_service_name_matches_otel_resource(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SERVICE_NAME", "order-service")
    get_settings.cache_clear()

    settings = get_settings()
    resource = build_resource(settings.service_name)

    assert settings.service_name == "order-service"
    assert resource.attributes["service.name"] == "order-service"


def test_create_app_with_tracing_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_TRACES_ENABLED", "false")
    get_settings.cache_clear()

    from app.main import create_app

    application = create_app()

    assert application.title == "Order Service"


def test_httpx_injects_traceparent_for_payment_client() -> None:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    captured_headers: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_headers.update(dict(request.headers))
        return httpx.Response(
            201,
            json={
                "id": 1,
                "order_id": 1,
                "amount": "10.00",
                "status": "pending",
                "created_at": "2026-08-25T12:00:00+00:00",
                "updated_at": "2026-08-25T12:00:00+00:00",
            },
        )

    from app.clients.payment import PaymentServiceClient
    from app.core.config import Settings

    settings = Settings(
        service_name="order-service",
        payment_service_url="http://payment-service",
        payment_service_timeout_seconds=5.0,
    )
    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.payment_service_url,
    )
    HTTPXClientInstrumentor.instrument_client(http_client)
    client = PaymentServiceClient(settings=settings, http_client=http_client)

    tracer = trace.get_tracer("tests.order_service.tracing")
    with tracer.start_as_current_span("create-order"):
        client.create_payment(order_id=1, amount="10.00")

    assert "traceparent" in captured_headers
