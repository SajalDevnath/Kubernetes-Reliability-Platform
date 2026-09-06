import json
import logging

import httpx
import pytest
from opentelemetry import trace
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from app.core.config import get_settings
from app.logging import JsonFormatter
from app.tracing import build_resource


@pytest.fixture(autouse=True)
def reset_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_build_resource_uses_service_name() -> None:
    resource = build_resource("user-service")

    assert resource.attributes["service.name"] == "user-service"


def test_settings_uses_otel_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://custom-collector:4317")
    monkeypatch.setenv("OTEL_TRACES_ENABLED", "false")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.otel_exporter_otlp_endpoint == "http://custom-collector:4317"
    assert settings.otel_traces_enabled is False


def test_trace_fields_absent_without_active_span() -> None:
    formatter = JsonFormatter(service_name="user-service")
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="hello",
        args=(),
        exc_info=None,
    )

    payload = json.loads(formatter.format(record))

    assert "trace_id" not in payload
    assert "span_id" not in payload


def test_trace_fields_present_with_active_span() -> None:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    formatter = JsonFormatter(service_name="user-service")
    tracer = trace.get_tracer("tests.user_service.tracing")
    with tracer.start_as_current_span("test-span"):
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello",
            args=(),
            exc_info=None,
        )
        payload = json.loads(formatter.format(record))

    assert len(payload["trace_id"]) == 32
    assert len(payload["span_id"]) == 16


def test_httpx_injects_traceparent_header() -> None:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    captured_headers: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_headers.update(dict(request.headers))
        return httpx.Response(200)

    tracer = trace.get_tracer("tests.user_service.tracing")
    with tracer.start_as_current_span("parent"):
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            HTTPXClientInstrumentor.instrument_client(client)
            client.post("http://payment-service/payments", json={"order_id": 1, "amount": "1.00"})

    assert "traceparent" in captured_headers


def test_create_app_with_tracing_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_TRACES_ENABLED", "false")
    get_settings.cache_clear()

    from app.main import create_app

    application = create_app()

    assert application.title == "User Service"


def test_create_app_with_tracing_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_TRACES_ENABLED", "true")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
    get_settings.cache_clear()

    from app.main import create_app

    application = create_app()

    assert getattr(application, "_is_instrumented_by_opentelemetry", False) is True
