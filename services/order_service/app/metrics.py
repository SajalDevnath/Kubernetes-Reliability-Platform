import time
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

METRICS_PATH = "/metrics"
UNKNOWN_HANDLER = "unknown"


def _resolve_handler(request: Request) -> str:
    route = request.scope.get("route")
    if route is not None and getattr(route, "path", None):
        return route.path
    return UNKNOWN_HANDLER


class PrometheusMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        *,
        service_name: str,
        requests_total: Counter,
        request_duration: Histogram,
    ) -> None:
        super().__init__(app)
        self.service_name = service_name
        self.requests_total = requests_total
        self.request_duration = request_duration

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path == METRICS_PATH:
            return await call_next(request)

        method = request.method
        status = "500"
        start = time.perf_counter()

        try:
            response = await call_next(request)
            status = str(response.status_code)
            return response
        finally:
            duration = time.perf_counter() - start
            handler = _resolve_handler(request)
            labels = {
                "service": self.service_name,
                "method": method,
                "handler": handler,
            }
            self.request_duration.labels(**labels).observe(duration)
            self.requests_total.labels(**labels, status=status).inc()


def setup_metrics(app: FastAPI, service_name: str) -> CollectorRegistry:
    """Register Prometheus metrics middleware and the /metrics exposition endpoint."""
    registry = CollectorRegistry()

    requests_total = Counter(
        "http_requests_total",
        "Total HTTP requests",
        ["service", "method", "handler", "status"],
        registry=registry,
    )
    request_duration = Histogram(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        ["service", "method", "handler"],
        registry=registry,
    )

    app.add_middleware(
        PrometheusMiddleware,
        service_name=service_name,
        requests_total=requests_total,
        request_duration=request_duration,
    )

    @app.get(METRICS_PATH, include_in_schema=False)
    def metrics() -> Response:
        return Response(content=generate_latest(registry), media_type=CONTENT_TYPE_LATEST)

    return registry
