from fastapi import APIRouter, Depends

from app.api.deps import get_upstream_clients
from app.clients.factory import UpstreamClients
from app.schemas.alerts import AlertsResponse
from app.services.alerts_service import AlertsService

router = APIRouter(prefix="/alerts", tags=["alerts"])


def get_alerts_service(
    upstream_clients: UpstreamClients = Depends(get_upstream_clients),
) -> AlertsService:
    """Build the alerts service from upstream clients."""
    return AlertsService(upstream_clients.alertmanager)


@router.get("", response_model=AlertsResponse)
def get_active_alerts(
    alerts_service: AlertsService = Depends(get_alerts_service),
) -> AlertsResponse:
    """Return normalized active alerts from Alertmanager."""
    return alerts_service.get_active_alerts()
