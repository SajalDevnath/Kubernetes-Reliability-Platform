def test_service_availability_query(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    assert (
        prom_queries.service_availability()
        == 'up{job=~"user-service|order-service|payment-service"}'
    )


def test_request_rate_query_all_services(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    assert (
        prom_queries.request_rate()
        == "sum by (service) (rate(http_requests_total[5m]))"
    )


def test_request_rate_query_filtered_service(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    assert (
        prom_queries.request_rate("order-service")
        == 'sum by (service) (rate(http_requests_total{service="order-service"}[5m]))'
    )


def test_error_rate_5xx_query_all_services(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    assert prom_queries.error_rate_5xx() == (
        'sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))'
        " / "
        "sum by (service) (rate(http_requests_total[5m]))"
    )


def test_error_rate_5xx_query_filtered_service(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    assert prom_queries.error_rate_5xx("order-service") == (
        'sum by (service) (rate(http_requests_total{service="order-service",status=~"5.."}[5m]))'
        " / "
        'sum by (service) (rate(http_requests_total{service="order-service"}[5m]))'
    )


def test_latency_p95_query_all_services(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    assert prom_queries.latency_p95() == (
        "histogram_quantile("
        "0.95, "
        "sum by (service, le) (rate(http_request_duration_seconds_bucket[5m]))"
        ")"
    )


def test_latency_p95_query_filtered_service(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    expected = (
        "histogram_quantile("
        "0.95, "
        'sum by (service, le) (rate(http_request_duration_seconds_bucket'
        '{service="order-service"}[5m]))'
        ")"
    )
    assert prom_queries.latency_p95("order-service") == expected


def test_slo_recording_rule_queries(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    service = "order-service"
    assert prom_queries.slo_availability_ratio(service) == (
        'krp:sli:availability:ratio{service="order-service"}'
    )
    assert prom_queries.slo_error_rate_5xx_ratio(service) == (
        'krp:sli:errors:5xx:ratio{service="order-service"}'
    )
    assert prom_queries.slo_latency_p95_seconds(service) == (
        'krp:sli:latency:p95:seconds{service="order-service"}'
    )
    assert prom_queries.slo_availability_target(service) == (
        'krp:slo:availability:target{service="order-service"}'
    )
    assert prom_queries.slo_error_budget_consumed(service) == (
        'krp:slo:availability:error_budget:consumed{service="order-service"}'
    )
    assert prom_queries.slo_error_budget_remaining(service) == (
        'krp:slo:availability:error_budget:remaining{service="order-service"}'
    )
    assert prom_queries.slo_availability_compliant(service) == (
        'krp:slo:availability:compliant{service="order-service"}'
    )
    assert prom_queries.slo_latency_p95_compliant(service) == (
        'krp:slo:latency:p95:compliant{service="order-service"}'
    )
    assert prom_queries.slo_request_rate_5m(service) == (
        'krp:http_requests:rate5m{service="order-service"}'
    )


def test_postgres_queries(observability_api_modules) -> None:
    from app.queries import prometheus as prom_queries

    assert prom_queries.postgres_up() == "pg_up"
    assert prom_queries.postgres_exporter_up() == 'up{job="postgres-exporter"}'
    assert (
        prom_queries.postgres_connections()
        == 'pg_stat_database_numbackends{datname="k8s_reliability"}'
    )
    assert (
        prom_queries.postgres_database_size_bytes()
        == 'pg_database_size_bytes{datname="k8s_reliability"}'
    )
