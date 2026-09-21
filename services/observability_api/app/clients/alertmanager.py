import httpx

from app.clients.base import BaseHttpClient
from app.core.exceptions import UpstreamHttpError, UpstreamMalformedResponse
from app.schemas.health import ComponentProbeResult

READY_PATH = "/-/ready"
ALERTS_PATH = "/api/v2/alerts"


class AlertmanagerClient(BaseHttpClient):
    """HTTP client for Alertmanager."""

    def __init__(
        self,
        base_url: str,
        timeout: httpx.Timeout,
        http_client: httpx.Client | None = None,
    ) -> None:
        super().__init__(
            base_url=base_url,
            timeout=timeout,
            upstream_name="alertmanager",
            http_client=http_client,
        )

    def check_ready(self) -> ComponentProbeResult:
        """Probe Alertmanager readiness endpoint."""
        return self.probe_ready(READY_PATH)

    def get_alerts(self) -> list[dict[str, object]]:
        """Fetch active alerts from Alertmanager."""
        response = self.get(ALERTS_PATH)

        if response.status_code >= 400:
            raise UpstreamHttpError(
                f"{self.upstream_name} returned status {response.status_code}",
                upstream=self.upstream_name,
                http_status_code=response.status_code,
            )

        try:
            payload = response.json()
        except Exception as exc:
            raise UpstreamMalformedResponse(
                f"{self.upstream_name} returned malformed JSON",
                upstream=self.upstream_name,
            ) from exc

        if not isinstance(payload, list):
            raise UpstreamMalformedResponse(
                "alertmanager returned malformed alerts response",
                upstream="alertmanager",
            )
        return payload
