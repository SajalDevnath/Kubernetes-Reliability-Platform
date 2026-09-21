from datetime import datetime, timezone

from app.clients.alertmanager import AlertmanagerClient
from app.normalization import alertmanager as alertmanager_norm
from app.schemas.alerts import AlertsResponse


class AlertsService:
    """Orchestrates Alertmanager active alert retrieval and normalization."""

    def __init__(self, alertmanager_client: AlertmanagerClient) -> None:
        self._alertmanager = alertmanager_client

    def get_active_alerts(self) -> AlertsResponse:
        """Return normalized active alerts from Alertmanager."""
        checked_at = datetime.now(timezone.utc)
        payload = self._alertmanager.get_alerts()
        alerts = alertmanager_norm.parse_alerts(payload)

        return AlertsResponse(
            checked_at=checked_at,
            alerts=alerts,
        )
