from fastapi import APIRouter, Depends, Query

from app.api.deps import get_upstream_clients
from app.clients.factory import UpstreamClients
from app.core.config import Settings, get_settings
from app.schemas.metrics import (
    PostgresMetricsResponse,
    RequestMetricsResponse,
    ServiceHealthResponse,
    SloMetricsResponse,
)
from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/metrics", tags=["metrics"])


def get_metrics_service(
    upstream_clients: UpstreamClients = Depends(get_upstream_clients),
    settings: Settings = Depends(get_settings),
) -> MetricsService:
    """Build the metrics service from upstream clients and settings."""
    return MetricsService(upstream_clients.prometheus, settings)


@router.get("/services", response_model=ServiceHealthResponse)
def get_service_health(
    metrics_service: MetricsService = Depends(get_metrics_service),
) -> ServiceHealthResponse:
    """Return live Prometheus scrape health for KRP application services."""
    return metrics_service.get_service_health()


@router.get("/requests", response_model=RequestMetricsResponse)
def get_request_metrics(
    service: str | None = Query(default=None),
    minutes: int | None = Query(default=None),
    metrics_service: MetricsService = Depends(get_metrics_service),
) -> RequestMetricsResponse:
    """Return normalized HTTP request metrics over a time window."""
    return metrics_service.get_request_metrics(service=service, minutes=minutes)


@router.get("/slo", response_model=SloMetricsResponse)
def get_slo_metrics(
    service: str = Query(...),
    metrics_service: MetricsService = Depends(get_metrics_service),
) -> SloMetricsResponse:
    """Return live SLO metrics for a single service."""
    return metrics_service.get_slo_metrics(service=service)


@router.get("/postgres", response_model=PostgresMetricsResponse)
def get_postgres_metrics(
    metrics_service: MetricsService = Depends(get_metrics_service),
) -> PostgresMetricsResponse:
    """Return live PostgreSQL operational metrics."""
    return metrics_service.get_postgres_metrics()
