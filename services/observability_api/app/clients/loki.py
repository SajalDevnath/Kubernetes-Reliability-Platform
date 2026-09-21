import httpx

from app.clients.base import BaseHttpClient
from app.schemas.health import ComponentProbeResult

READY_PATH = "/ready"
QUERY_RANGE_PATH = "/loki/api/v1/query_range"


class LokiClient(BaseHttpClient):
    """HTTP client for Loki."""

    def __init__(
        self,
        base_url: str,
        timeout: httpx.Timeout,
        http_client: httpx.Client | None = None,
    ) -> None:
        super().__init__(
            base_url=base_url,
            timeout=timeout,
            upstream_name="loki",
            http_client=http_client,
        )

    def check_ready(self) -> ComponentProbeResult:
        """Probe Loki readiness endpoint."""
        return self.probe_ready(READY_PATH)

    def query_range(
        self,
        logql: str,
        start_ns: int,
        end_ns: int,
        limit: int,
        direction: str = "backward",
    ) -> dict[str, object]:
        """Execute a Loki range query and return the upstream JSON payload."""
        params: dict[str, object] = {
            "query": logql,
            "start": str(start_ns),
            "end": str(end_ns),
            "limit": limit,
            "direction": direction,
        }
        return self.get_json(QUERY_RANGE_PATH, params=params)
