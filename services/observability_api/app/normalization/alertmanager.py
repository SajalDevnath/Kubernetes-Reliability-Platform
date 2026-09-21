"""Normalize Alertmanager v2 alert responses into BFF models."""

from datetime import datetime, timezone

from app.core.exceptions import UpstreamMalformedResponse
from app.schemas.alerts import Alert

SEVERITY_ORDER = {
    "critical": 0,
    "warning": 1,
}


def _optional_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value)
    return text if text else None


def _normalize_label_map(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    normalized: dict[str, str] = {}
    for key, item in value.items():
        if not isinstance(key, str):
            continue
        if item is None:
            continue
        normalized[key] = str(item)
    return normalized


def _parse_timestamp(value: object) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    if parsed.year < 1970:
        return None
    return parsed


def _extract_status(value: object) -> str | None:
    if not isinstance(value, dict):
        return None
    return _optional_str(value.get("state"))


def parse_alert_record(item: dict[str, object]) -> Alert | None:
    """Parse a single Alertmanager alert object."""
    fingerprint = _optional_str(item.get("fingerprint"))
    if not fingerprint:
        return None

    labels = _normalize_label_map(item.get("labels"))
    annotations = _normalize_label_map(item.get("annotations"))

    return Alert(
        fingerprint=fingerprint,
        alert_name=_optional_str(labels.get("alertname")),
        status=_extract_status(item.get("status")),
        severity=_optional_str(labels.get("severity")),
        service=_optional_str(labels.get("service")),
        job=_optional_str(labels.get("job")),
        instance=_optional_str(labels.get("instance")),
        summary=_optional_str(annotations.get("summary")),
        description=_optional_str(annotations.get("description")),
        starts_at=_parse_timestamp(item.get("startsAt")),
        ends_at=_parse_timestamp(item.get("endsAt")),
        generator_url=_optional_str(item.get("generatorURL")),
        labels=labels,
        annotations=annotations,
    )


def parse_alerts(payload: list[dict[str, object]]) -> list[Alert]:
    """Normalize Alertmanager alerts and sort deterministically."""
    if not isinstance(payload, list):
        raise UpstreamMalformedResponse(
            "alertmanager returned malformed alerts response",
            upstream="alertmanager",
        )

    alerts: list[Alert] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        parsed = parse_alert_record(item)
        if parsed is not None:
            alerts.append(parsed)

    alerts.sort(
        key=lambda alert: (
            SEVERITY_ORDER.get((alert.severity or "").lower(), 2),
            -(alert.starts_at.timestamp() if alert.starts_at else 0),
        ),
    )
    return alerts
