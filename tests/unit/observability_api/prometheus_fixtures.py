"""Prometheus API response fixtures for observability_api tests."""

SERVICE_HEALTH_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {
                    "__name__": "up",
                    "job": "user-service",
                    "instance": "user-service:8001",
                },
                "value": [1_700_000_000.0, "1"],
            },
            {
                "metric": {
                    "__name__": "up",
                    "job": "order-service",
                    "instance": "order-service:8002",
                },
                "value": [1_700_000_000.0, "1"],
            },
            {
                "metric": {
                    "__name__": "up",
                    "job": "payment-service",
                    "instance": "payment-service:8003",
                },
                "value": [1_700_000_000.0, "0"],
            },
        ],
    },
}

REQUEST_RATE_MATRIX = {
    "status": "success",
    "data": {
        "resultType": "matrix",
        "result": [
            {
                "metric": {"service": "order-service"},
                "values": [
                    [1_700_000_000.0, "0.42"],
                    [1_700_000_060.0, "0.5"],
                ],
            }
        ],
    },
}

ERROR_RATE_MATRIX = {
    "status": "success",
    "data": {
        "resultType": "matrix",
        "result": [
            {
                "metric": {"service": "order-service"},
                "values": [
                    [1_700_000_000.0, "0.01"],
                    [1_700_000_060.0, "NaN"],
                ],
            }
        ],
    },
}

LATENCY_MATRIX = {
    "status": "success",
    "data": {
        "resultType": "matrix",
        "result": [
            {
                "metric": {"service": "order-service"},
                "values": [
                    [1_700_000_000.0, "0.12"],
                ],
            }
        ],
    },
}

SLO_AVAILABILITY_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {"service": "order-service"},
                "value": [1_700_000_000.0, "0.995"],
            }
        ],
    },
}

SLO_TARGET_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {"service": "order-service"},
                "value": [1_700_000_000.0, "0.99"],
            }
        ],
    },
}

SLO_COMPLIANT_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {"service": "order-service"},
                "value": [1_700_000_000.0, "1"],
            }
        ],
    },
}

SLO_EMPTY_VECTOR = {
    "status": "success",
    "data": {"resultType": "vector", "result": []},
}

POSTGRES_UP_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [{"metric": {"__name__": "pg_up"}, "value": [1_700_000_000.0, "1"]}],
    },
}

POSTGRES_EXPORTER_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {
                    "__name__": "up",
                    "job": "postgres-exporter",
                    "instance": "postgres-exporter:9187",
                },
                "value": [1_700_000_000.0, "1"],
            }
        ],
    },
}

POSTGRES_CONNECTIONS_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {"datname": "k8s_reliability"},
                "value": [1_700_000_000.0, "5"],
            }
        ],
    },
}

POSTGRES_SIZE_VECTOR = {
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {"datname": "k8s_reliability"},
                "value": [1_700_000_000.0, "12345678"],
            }
        ],
    },
}
