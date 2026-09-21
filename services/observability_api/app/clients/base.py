import time

import httpx

from app.core.exceptions import (
    ObservabilityApiError,
    UpstreamHttpError,
    UpstreamMalformedResponse,
    UpstreamTimeout,
    UpstreamUnavailable,
)
from app.schemas.health import ComponentProbeResult


class BaseHttpClient:
    """Shared synchronous HTTP client for upstream observability services."""

    def __init__(
        self,
        base_url: str,
        timeout: httpx.Timeout,
        upstream_name: str,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.upstream_name = upstream_name
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
        )

    def close(self) -> None:
        """Close the underlying HTTP client when owned by this wrapper."""
        if self._owns_client:
            self._client.close()

    def probe_ready(self, path: str) -> ComponentProbeResult:
        """Probe an upstream readiness endpoint without requiring JSON."""
        start = time.perf_counter()
        try:
            response = self.get(path)
            latency_ms = int((time.perf_counter() - start) * 1000)
            if response.status_code < 400:
                return ComponentProbeResult(status="up", latency_ms=latency_ms)
            return ComponentProbeResult(
                status="down",
                latency_ms=latency_ms,
                error=f"HTTP {response.status_code}",
            )
        except ObservabilityApiError as exc:
            return ComponentProbeResult(status="down", error=exc.message)

    def get_json(self, path: str, params: dict[str, object] | None = None) -> dict[str, object]:
        """Perform a GET request and return parsed JSON from the upstream."""
        response = self._request("GET", path, params=params)

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

        if not isinstance(payload, dict):
            raise UpstreamMalformedResponse(
                f"{self.upstream_name} returned malformed JSON",
                upstream=self.upstream_name,
            )

        return payload

    def get(self, path: str, params: dict[str, object] | None = None) -> httpx.Response:
        """Perform a GET request and return the raw upstream response."""
        return self._request("GET", path, params=params)

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, object] | None = None,
    ) -> httpx.Response:
        try:
            return self._client.request(method, path, params=params)
        except httpx.TimeoutException as exc:
            raise UpstreamTimeout(
                f"{self.upstream_name} request timed out",
                upstream=self.upstream_name,
            ) from exc
        except httpx.RequestError as exc:
            raise UpstreamUnavailable(
                f"{self.upstream_name} is unreachable",
                upstream=self.upstream_name,
            ) from exc
