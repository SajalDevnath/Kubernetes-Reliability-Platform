import pytest
from alertmanager_fixtures import (
    CRITICAL_ALERT,
    EMPTY_ALERTS,
    MALFORMED_ALERTS_RESPONSE,
    POPULATED_ALERTS,
    WARNING_ALERT,
)


def test_parse_alerts_normalizes_critical_alert(observability_api_modules) -> None:
    from app.normalization.alertmanager import parse_alerts

    alerts = parse_alerts([CRITICAL_ALERT])

    assert len(alerts) == 1
    alert = alerts[0]
    assert alert.fingerprint == "critical-alert-1"
    assert alert.alert_name == "KRPServiceTargetDown"
    assert alert.status == "active"
    assert alert.severity == "critical"
    assert alert.service == "payment-service"
    assert alert.job == "payment-service"
    assert alert.instance == "payment-service:8003"
    assert alert.summary == "Payment service target is down"
    assert alert.description == "Prometheus cannot scrape payment-service."
    assert alert.starts_at is not None
    assert alert.ends_at is None
    assert alert.generator_url == "http://prometheus/graph?g0.expr=up"


def test_parse_alerts_normalizes_warning_alert(observability_api_modules) -> None:
    from app.normalization.alertmanager import parse_alerts

    alerts = parse_alerts([WARNING_ALERT])

    assert alerts[0].severity == "warning"
    assert alerts[0].alert_name == "KRPHigh5xxErrorRate"


def test_parse_alerts_sorts_critical_before_warning(observability_api_modules) -> None:
    from app.normalization.alertmanager import parse_alerts

    alerts = parse_alerts(POPULATED_ALERTS)

    assert alerts[0].severity == "critical"
    assert alerts[1].severity == "warning"


def test_parse_alerts_returns_empty_list(observability_api_modules) -> None:
    from app.normalization.alertmanager import parse_alerts

    alerts = parse_alerts(EMPTY_ALERTS)

    assert alerts == []


def test_parse_alerts_skips_malformed_records(observability_api_modules) -> None:
    from app.normalization.alertmanager import parse_alerts

    alerts = parse_alerts(
        [
            {"labels": {"alertname": "MissingFingerprint"}},
            CRITICAL_ALERT,
        ],
    )

    assert len(alerts) == 1
    assert alerts[0].fingerprint == "critical-alert-1"


def test_parse_alerts_rejects_non_list_payload(observability_api_modules) -> None:
    from app.core.exceptions import UpstreamMalformedResponse
    from app.normalization.alertmanager import parse_alerts

    with pytest.raises(UpstreamMalformedResponse) as exc_info:
        parse_alerts(MALFORMED_ALERTS_RESPONSE)

    assert exc_info.value.upstream == "alertmanager"
