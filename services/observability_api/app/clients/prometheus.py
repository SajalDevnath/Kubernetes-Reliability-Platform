import httpx

from app.clients.base import BaseHttpClient
from app.normalization.prometheus import validate_prometheus_data
from app.schemas.health import ComponentProbeResult

READY_PATH = "/-/ready"
QUERY_PATH = "/api/v1/query"
QUERY_RANGE_PATH = "/api/v1/query_range"


class PrometheusClient(BaseHttpClient):
    """HTTP client for Prometheus."""

    def __init__(
        self,
        base_url: str,
        timeout: httpx.Timeout,
        http_client: httpx.Client | None = None,
    ) -> None:
        super().__init__(
            base_url=base_url,
            timeout=timeout,
            upstream_name="prometheus",
            http_client=http_client,
        )

    def check_ready(self) -> ComponentProbeResult:
        """Probe Prometheus readiness endpoint."""
        return self.probe_ready(READY_PATH)

    def query(self, promql: str, time: float | None = None) -> dict[str, object]:
        """Execute a Prometheus instant query."""
        params: dict[str, object] = {"query": promql}
        if time is not None:
            params["time"] = time
        payload = self.get_json(QUERY_PATH, params=params)
        return validate_prometheus_data(payload)

    def query_range(
        self,
        promql: str,
        start: float,
        end: float,
        step: int,
    ) -> dict[str, object]:
        """Execute a Prometheus range query."""
        params: dict[str, object] = {
            "query": promql,
            "start": start,
            "end": end,
            "step": step,
        }
        payload = self.get_json(QUERY_RANGE_PATH, params=params)
        return validate_prometheus_data(payload)
