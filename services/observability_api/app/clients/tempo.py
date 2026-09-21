import httpx

from app.clients.base import BaseHttpClient
from app.schemas.health import ComponentProbeResult

READY_PATH = "/ready"
SEARCH_PATH = "/api/search"
TRACES_PATH = "/api/traces"


class TempoClient(BaseHttpClient):
    """HTTP client for Tempo."""

    def __init__(
        self,
        base_url: str,
        timeout: httpx.Timeout,
        http_client: httpx.Client | None = None,
    ) -> None:
        super().__init__(
            base_url=base_url,
            timeout=timeout,
            upstream_name="tempo",
            http_client=http_client,
        )

    def check_ready(self) -> ComponentProbeResult:
        """Probe Tempo readiness endpoint."""
        return self.probe_ready(READY_PATH)

    def search_traces(
        self,
        limit: int,
        service: str | None = None,
    ) -> dict[str, object]:
        """Search recent traces using curated allowlisted parameters."""
        from app.queries.tempo import trace_search

        params = trace_search(service, limit)
        return self.get_json(SEARCH_PATH, params=params)

    def get_trace(self, trace_id: str) -> dict[str, object]:
        """Fetch trace detail for a validated trace ID."""
        return self.get_json(f"{TRACES_PATH}/{trace_id}")
