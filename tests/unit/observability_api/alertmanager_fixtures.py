"""Sample Alertmanager API responses for observability BFF tests."""

EMPTY_ALERTS: list[dict[str, object]] = []

CRITICAL_ALERT = {
    "fingerprint": "critical-alert-1",
    "labels": {
        "alertname": "KRPServiceTargetDown",
        "severity": "critical",
        "service": "payment-service",
        "job": "payment-service",
        "instance": "payment-service:8003",
    },
    "annotations": {
        "summary": "Payment service target is down",
        "description": "Prometheus cannot scrape payment-service.",
    },
    "startsAt": "2026-09-17T15:29:00.000Z",
    "endsAt": "0001-01-01T00:00:00Z",
    "updatedAt": "2026-09-17T15:29:30.000Z",
    "generatorURL": "http://prometheus/graph?g0.expr=up",
    "status": {
        "state": "active",
        "silencedBy": [],
        "inhibitedBy": [],
    },
    "receivers": [{"name": "critical"}],
}

WARNING_ALERT = {
    "fingerprint": "warning-alert-1",
    "labels": {
        "alertname": "KRPHigh5xxErrorRate",
        "severity": "warning",
        "service": "order-service",
        "job": "order-service",
        "instance": "order-service:8002",
    },
    "annotations": {
        "summary": "High 5xx error rate on order-service",
        "description": "5xx ratio exceeded the configured threshold.",
    },
    "startsAt": "2026-09-17T15:30:00.000Z",
    "endsAt": "0001-01-01T00:00:00Z",
    "updatedAt": "2026-09-17T15:30:10.000Z",
    "generatorURL": "http://prometheus/graph?g0.expr=errors",
    "status": {
        "state": "active",
        "silencedBy": [],
        "inhibitedBy": [],
    },
    "receivers": [{"name": "warning"}],
}

POPULATED_ALERTS = [WARNING_ALERT, CRITICAL_ALERT]

MALFORMED_ALERTS_RESPONSE = {"alerts": []}
