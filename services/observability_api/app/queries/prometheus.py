"""Approved PromQL query builders for metrics endpoints."""

from app.core.constants import POSTGRES_DATABASE_NAME, POSTGRES_EXPORTER_JOB, SERVICE_JOB_PATTERN


def _metric_selector(service: str | None, extra_labels: str = "") -> str:
    labels: list[str] = []
    if service is not None:
        labels.append(f'service="{service}"')
    if extra_labels:
        labels.append(extra_labels)
    if not labels:
        return ""
    return "{" + ",".join(labels) + "}"


def service_availability() -> str:
    """Return PromQL for KRP application scrape target health."""
    return f'up{{job=~"{SERVICE_JOB_PATTERN}"}}'


def request_rate(service: str | None = None) -> str:
    """Return PromQL for HTTP request rate by service."""
    selector = _metric_selector(service)
    return f"sum by (service) (rate(http_requests_total{selector}[5m]))"


def error_rate_5xx(service: str | None = None) -> str:
    """Return PromQL for 5xx error rate by service."""
    numerator_selector = _metric_selector(service, 'status=~"5.."')
    denominator_selector = _metric_selector(service)
    return (
        f"sum by (service) (rate(http_requests_total{numerator_selector}[5m]))"
        f" / "
        f"sum by (service) (rate(http_requests_total{denominator_selector}[5m]))"
    )


def latency_p95(service: str | None = None) -> str:
    """Return PromQL for P95 HTTP request latency by service."""
    selector = _metric_selector(service)
    return (
        "histogram_quantile("
        "0.95, "
        f"sum by (service, le) (rate(http_request_duration_seconds_bucket{selector}[5m]))"
        ")"
    )


def slo_availability_ratio(service: str) -> str:
    return f'krp:sli:availability:ratio{{service="{service}"}}'


def slo_error_rate_5xx_ratio(service: str) -> str:
    return f'krp:sli:errors:5xx:ratio{{service="{service}"}}'


def slo_latency_p95_seconds(service: str) -> str:
    return f'krp:sli:latency:p95:seconds{{service="{service}"}}'


def slo_availability_target(service: str) -> str:
    return f'krp:slo:availability:target{{service="{service}"}}'


def slo_error_budget_consumed(service: str) -> str:
    return f'krp:slo:availability:error_budget:consumed{{service="{service}"}}'


def slo_error_budget_remaining(service: str) -> str:
    return f'krp:slo:availability:error_budget:remaining{{service="{service}"}}'


def slo_availability_compliant(service: str) -> str:
    return f'krp:slo:availability:compliant{{service="{service}"}}'


def slo_latency_p95_compliant(service: str) -> str:
    return f'krp:slo:latency:p95:compliant{{service="{service}"}}'


def slo_request_rate_5m(service: str) -> str:
    return f'krp:http_requests:rate5m{{service="{service}"}}'


def postgres_up() -> str:
    return "pg_up"


def postgres_exporter_up() -> str:
    return f'up{{job="{POSTGRES_EXPORTER_JOB}"}}'


def postgres_connections() -> str:
    return f'pg_stat_database_numbackends{{datname="{POSTGRES_DATABASE_NAME}"}}'


def postgres_database_size_bytes() -> str:
    return f'pg_database_size_bytes{{datname="{POSTGRES_DATABASE_NAME}"}}'
