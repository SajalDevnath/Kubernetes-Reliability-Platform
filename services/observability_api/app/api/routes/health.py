from fastapi import APIRouter, Depends

from app.api.deps import get_upstream_clients
from app.clients.factory import UpstreamClients
from app.schemas.health import HealthResponse, ObservabilityHealthResponse
from app.services.health_service import HealthService

router = APIRouter(tags=["health"])
observability_router = APIRouter(prefix="/api/observability", tags=["observability"])


def get_health_service(
    upstream_clients: UpstreamClients = Depends(get_upstream_clients),
) -> HealthService:
    """Build the health service from upstream clients."""
    return HealthService(upstream_clients)


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Return BFF process health status."""
    return HealthResponse(status="ok")


@observability_router.get("/health", response_model=ObservabilityHealthResponse)
def observability_health_check(
    health_service: HealthService = Depends(get_health_service),
) -> ObservabilityHealthResponse:
    """Return upstream connectivity health without failing the BFF."""
    return health_service.get_observability_health()
