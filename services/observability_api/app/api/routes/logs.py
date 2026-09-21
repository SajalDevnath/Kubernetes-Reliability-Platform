from fastapi import APIRouter, Depends, Query

from app.api.deps import get_upstream_clients
from app.clients.factory import UpstreamClients
from app.schemas.logs import LogsResponse
from app.services.logs_service import LogsService

router = APIRouter(prefix="/logs", tags=["logs"])


def get_logs_service(
    upstream_clients: UpstreamClients = Depends(get_upstream_clients),
) -> LogsService:
    """Build the logs service from upstream clients."""
    return LogsService(upstream_clients.loki)


@router.get("", response_model=LogsResponse)
def get_logs(
    service: str = Query(...),
    limit: int | None = Query(default=None),
    logs_service: LogsService = Depends(get_logs_service),
) -> LogsResponse:
    """Return normalized recent logs for a validated service."""
    return logs_service.get_logs(service=service, limit=limit)
