"""OpenTelemetry tracing setup (ADR-023)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

if TYPE_CHECKING:
    from fastapi import FastAPI
    from sqlalchemy import Engine

_PROVIDER_CONFIGURED = False
_INSTRUMENTED_ENGINE_IDS: set[int] = set()


def build_resource(service_name: str) -> Resource:
    """Build the OpenTelemetry resource for a service."""
    return Resource.create({"service.name": service_name})


def _configure_propagation() -> None:
    set_global_textmap(CompositePropagator([TraceContextTextMapPropagator()]))


def _is_provider_configured() -> bool:
    return isinstance(trace.get_tracer_provider(), TracerProvider)


def setup_tracing(
    service_name: str,
    *,
    enabled: bool,
    endpoint: str,
    engine: Engine | None = None,
) -> None:
    """Configure the global tracer provider and shared instrumentors once."""
    global _PROVIDER_CONFIGURED

    if not enabled:
        return

    if not _PROVIDER_CONFIGURED:
        _configure_propagation()
        provider = TracerProvider(resource=build_resource(service_name))
        exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _PROVIDER_CONFIGURED = True

    httpx_instrumentor = HTTPXClientInstrumentor()
    if not httpx_instrumentor.is_instrumented_by_opentelemetry:
        httpx_instrumentor.instrument()

    if engine is not None:
        engine_id = id(engine)
        if engine_id not in _INSTRUMENTED_ENGINE_IDS:
            SQLAlchemyInstrumentor().instrument(engine=engine)
            _INSTRUMENTED_ENGINE_IDS.add(engine_id)


def instrument_app(application: FastAPI, *, enabled: bool) -> None:
    """Instrument a FastAPI application for inbound HTTP tracing."""
    if not enabled:
        return
    if getattr(application, "_is_instrumented_by_opentelemetry", False):
        return
    FastAPIInstrumentor.instrument_app(application)
