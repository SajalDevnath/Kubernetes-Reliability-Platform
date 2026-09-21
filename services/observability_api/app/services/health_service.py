from datetime import datetime, timezone
from typing import Literal

from app.clients.factory import UpstreamClients
from app.schemas.health import (
    ComponentHealth,
    ComponentProbeResult,
    ObservabilityHealthResponse,
)

UpstreamComponentName = Literal["prometheus", "loki", "tempo", "alertmanager"]


class HealthService:
    """Service for BFF and upstream health checks."""

    def __init__(self, upstream_clients: UpstreamClients) -> None:
        self._upstream_clients = upstream_clients

    def get_observability_health(self) -> ObservabilityHealthResponse:
        """Return aggregated upstream health without failing when upstreams are down."""
        prometheus_probe = self._upstream_clients.prometheus.check_ready()
        loki_probe = self._upstream_clients.loki.check_ready()
        tempo_probe = self._upstream_clients.tempo.check_ready()
        alertmanager_probe = self._upstream_clients.alertmanager.check_ready()

        components = [
            ComponentHealth(name="bff", status="up"),
            self._component_from_probe("prometheus", prometheus_probe),
            self._component_from_probe("loki", loki_probe),
            self._component_from_probe("tempo", tempo_probe),
            self._component_from_probe("alertmanager", alertmanager_probe),
        ]

        upstream_components = [component for component in components if component.name != "bff"]
        up_count = sum(1 for component in upstream_components if component.status == "up")

        if up_count == len(upstream_components):
            overall_status = "healthy"
        elif up_count == 0:
            overall_status = "unhealthy"
        else:
            overall_status = "degraded"

        return ObservabilityHealthResponse(
            status=overall_status,
            components=components,
            checked_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _component_from_probe(
        name: UpstreamComponentName,
        probe: ComponentProbeResult,
    ) -> ComponentHealth:
        return ComponentHealth(
            name=name,
            status=probe.status,
            latency_ms=probe.latency_ms,
            error=probe.error,
        )
