from datetime import datetime, timedelta, timezone

from app.clients.prometheus import PrometheusClient
from app.core.config import Settings
from app.core.constants import SERVICES
from app.core.validation import validate_minutes, validate_optional_service, validate_service
from app.normalization import prometheus as prom_norm
from app.queries import prometheus as prom_queries
from app.schemas.metrics import (
    AvailabilitySlo,
    ExporterStatus,
    LatencySlo,
    MetricsWindow,
    PostgresMetricsResponse,
    PostgresStatus,
    RequestMetricsResponse,
    RequestMetricsSeries,
    ServiceHealthItem,
    ServiceHealthResponse,
    SloDiagnostics,
    SloMetricsResponse,
)


class MetricsService:
    """Orchestrates curated Prometheus metrics queries and normalization."""

    def __init__(self, prometheus_client: PrometheusClient, settings: Settings) -> None:
        self._prometheus = prometheus_client
        self._settings = settings

    def get_service_health(self) -> ServiceHealthResponse:
        """Return live scrape health for known KRP application services."""
        checked_at = datetime.now(timezone.utc)
        data = self._prometheus.query(prom_queries.service_availability())
        samples = prom_norm.normalize_vector(data)

        targets_by_job: dict[str, list[object]] = {}
        for sample in samples:
            job = sample.labels.get("job")
            if job is None:
                continue
            targets_by_job.setdefault(job, []).append(sample)

        services: list[ServiceHealthItem] = []
        for service in sorted(SERVICES):
            job_samples = targets_by_job.get(service, [])
            if not job_samples:
                services.append(
                    ServiceHealthItem(
                        service=service,
                        job=service,
                        instance=None,
                        up=False,
                    )
                )
                continue

            primary_sample = job_samples[0]
            instance = primary_sample.labels.get("instance")
            non_null_values = [
                sample.value for sample in job_samples if sample.value is not None
            ]
            if not non_null_values:
                up = False
            else:
                up = all(value == 1.0 for value in non_null_values)

            services.append(
                ServiceHealthItem(
                    service=service,
                    job=service,
                    instance=instance,
                    up=up,
                )
            )

        return ServiceHealthResponse(checked_at=checked_at, services=services)

    def get_request_metrics(
        self,
        service: str | None = None,
        minutes: int | None = None,
    ) -> RequestMetricsResponse:
        """Return normalized HTTP request metrics over a time window."""
        validated_service = validate_optional_service(service)
        validated_minutes = validate_minutes(
            minutes,
            default=self._settings.metrics_range_minutes_default,
        )
        checked_at = datetime.now(timezone.utc)
        end = checked_at
        start = end - timedelta(minutes=validated_minutes)
        step = self._settings.metrics_range_step_seconds

        start_ts = start.timestamp()
        end_ts = end.timestamp()

        request_rate_data = self._prometheus.query_range(
            prom_queries.request_rate(validated_service),
            start=start_ts,
            end=end_ts,
            step=step,
        )
        error_rate_data = self._prometheus.query_range(
            prom_queries.error_rate_5xx(validated_service),
            start=start_ts,
            end=end_ts,
            step=step,
        )
        latency_data = self._prometheus.query_range(
            prom_queries.latency_p95(validated_service),
            start=start_ts,
            end=end_ts,
            step=step,
        )

        return RequestMetricsResponse(
            checked_at=checked_at,
            window=MetricsWindow(
                start=start,
                end=end,
                step_seconds=step,
            ),
            series=RequestMetricsSeries(
                request_rate=prom_norm.normalize_matrix(request_rate_data),
                error_rate_5xx=prom_norm.normalize_matrix(error_rate_data),
                latency_p95_seconds=prom_norm.normalize_matrix(latency_data),
            ),
        )

    def get_slo_metrics(self, service: str) -> SloMetricsResponse:
        """Return live SLO metrics for a validated service."""
        validated_service = validate_service(service)
        checked_at = datetime.now(timezone.utc)

        availability_sli = self._query_scalar(
            prom_queries.slo_availability_ratio(validated_service)
        )
        availability_target = self._query_scalar(
            prom_queries.slo_availability_target(validated_service)
        )
        error_budget_consumed = self._query_scalar(
            prom_queries.slo_error_budget_consumed(validated_service)
        )
        error_budget_remaining = self._query_scalar(
            prom_queries.slo_error_budget_remaining(validated_service)
        )
        availability_compliant = self._query_boolean(
            prom_queries.slo_availability_compliant(validated_service)
        )

        latency_p95 = self._query_scalar(prom_queries.slo_latency_p95_seconds(validated_service))
        latency_compliant = self._query_boolean(
            prom_queries.slo_latency_p95_compliant(validated_service)
        )

        error_rate_5xx_ratio = self._query_scalar(
            prom_queries.slo_error_rate_5xx_ratio(validated_service)
        )
        request_rate_5m = self._query_scalar(prom_queries.slo_request_rate_5m(validated_service))

        return SloMetricsResponse(
            checked_at=checked_at,
            service=validated_service,
            availability=AvailabilitySlo(
                sli=availability_sli,
                target=availability_target,
                compliant=availability_compliant,
                error_budget_remaining=error_budget_remaining,
                error_budget_consumed=error_budget_consumed,
            ),
            latency=LatencySlo(
                p95_seconds=latency_p95,
                compliant=latency_compliant,
            ),
            diagnostics=SloDiagnostics(
                error_rate_5xx_ratio=error_rate_5xx_ratio,
                request_rate_5m=request_rate_5m,
            ),
        )

    def get_postgres_metrics(self) -> PostgresMetricsResponse:
        """Return live PostgreSQL operational metrics."""
        checked_at = datetime.now(timezone.utc)

        pg_up_samples = prom_norm.normalize_vector(
            self._prometheus.query(prom_queries.postgres_up())
        )
        exporter_samples = prom_norm.normalize_vector(
            self._prometheus.query(prom_queries.postgres_exporter_up())
        )
        connections_samples = prom_norm.normalize_vector(
            self._prometheus.query(prom_queries.postgres_connections())
        )
        size_samples = prom_norm.normalize_vector(
            self._prometheus.query(prom_queries.postgres_database_size_bytes())
        )

        return PostgresMetricsResponse(
            checked_at=checked_at,
            postgres=PostgresStatus(
                up=prom_norm.extract_boolean(pg_up_samples),
            ),
            exporter=ExporterStatus(
                up=prom_norm.extract_boolean(exporter_samples),
                instance=prom_norm.extract_label(exporter_samples, "instance"),
            ),
            connections=prom_norm.extract_integer(connections_samples),
            database_size_bytes=prom_norm.extract_integer(size_samples),
        )

    def _query_scalar(self, promql: str) -> float | None:
        samples = prom_norm.normalize_vector(self._prometheus.query(promql))
        return prom_norm.extract_scalar(samples)

    def _query_boolean(self, promql: str) -> bool | None:
        samples = prom_norm.normalize_vector(self._prometheus.query(promql))
        return prom_norm.extract_boolean(samples)
