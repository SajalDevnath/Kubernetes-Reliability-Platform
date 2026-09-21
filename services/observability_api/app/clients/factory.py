from collections.abc import Callable

import httpx

from app.clients.alertmanager import AlertmanagerClient
from app.clients.loki import LokiClient
from app.clients.prometheus import PrometheusClient
from app.clients.tempo import TempoClient
from app.core.config import Settings


class UpstreamClients:
    """Container for upstream observability HTTP clients."""

    def __init__(
        self,
        prometheus: PrometheusClient,
        loki: LokiClient,
        tempo: TempoClient,
        alertmanager: AlertmanagerClient,
    ) -> None:
        self.prometheus = prometheus
        self.loki = loki
        self.tempo = tempo
        self.alertmanager = alertmanager

    @classmethod
    def from_settings(
        cls,
        settings: Settings,
        client_factory: Callable[[str, httpx.Timeout], httpx.Client] | None = None,
    ) -> "UpstreamClients":
        """Build upstream clients from application settings."""
        timeout = settings.get_upstream_timeout()
        factory = client_factory or (lambda base_url, client_timeout: httpx.Client(
            base_url=base_url,
            timeout=client_timeout,
        ))

        return cls(
            prometheus=PrometheusClient(
                settings.prometheus_url,
                timeout,
                http_client=factory(settings.prometheus_url, timeout),
            ),
            loki=LokiClient(
                settings.loki_url,
                timeout,
                http_client=factory(settings.loki_url, timeout),
            ),
            tempo=TempoClient(
                settings.tempo_url,
                timeout,
                http_client=factory(settings.tempo_url, timeout),
            ),
            alertmanager=AlertmanagerClient(
                settings.alertmanager_url,
                timeout,
                http_client=factory(settings.alertmanager_url, timeout),
            ),
        )

    def close(self) -> None:
        """Close all upstream HTTP clients."""
        self.prometheus.close()
        self.loki.close()
        self.tempo.close()
        self.alertmanager.close()
