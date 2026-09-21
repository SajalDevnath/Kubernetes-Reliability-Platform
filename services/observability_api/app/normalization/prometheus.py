"""Normalize Prometheus API responses into BFF models."""

from datetime import datetime, timezone

from app.core.exceptions import UpstreamMalformedResponse
from app.schemas.common import InstantSample, TimeSeries, TimeSeriesPoint

_NON_NUMERIC_VALUES = frozenset({"NaN", "nan", "+Inf", "-Inf", "Inf"})


def parse_prometheus_value(raw: str) -> float | None:
    """Convert a Prometheus sample value to float or null."""
    if raw in _NON_NUMERIC_VALUES:
        return None
    return float(raw)


def parse_prometheus_timestamp(raw: str | float) -> datetime:
    """Convert a Prometheus Unix timestamp to UTC datetime."""
    return datetime.fromtimestamp(float(raw), tz=timezone.utc)


def validate_prometheus_data(payload: dict[str, object]) -> dict[str, object]:
    """Validate and return the Prometheus data block from an API response."""
    status = payload.get("status")
    if status != "success":
        raise UpstreamMalformedResponse(
            "prometheus returned a non-success response",
            upstream="prometheus",
        )

    data = payload.get("data")
    if not isinstance(data, dict):
        raise UpstreamMalformedResponse(
            "prometheus returned malformed response data",
            upstream="prometheus",
        )

    return data


def normalize_vector(data: dict[str, object]) -> list[InstantSample]:
    """Normalize a Prometheus vector result into instant samples."""
    result_type = data.get("resultType")
    if result_type != "vector":
        raise UpstreamMalformedResponse(
            "prometheus returned unexpected result type",
            upstream="prometheus",
        )

    raw_result = data.get("result")
    if not isinstance(raw_result, list):
        raise UpstreamMalformedResponse(
            "prometheus returned malformed vector result",
            upstream="prometheus",
        )

    samples: list[InstantSample] = []
    for item in raw_result:
        if not isinstance(item, dict):
            continue

        metric = item.get("metric")
        value = item.get("value")
        if not isinstance(metric, dict) or not isinstance(value, list) or len(value) != 2:
            continue

        samples.append(
            InstantSample(
                labels={str(key): str(val) for key, val in metric.items()},
                value=parse_prometheus_value(str(value[1])),
                timestamp=parse_prometheus_timestamp(value[0]),
            )
        )

    return samples


def normalize_matrix(data: dict[str, object]) -> list[TimeSeries]:
    """Normalize a Prometheus matrix result into time series."""
    result_type = data.get("resultType")
    if result_type != "matrix":
        raise UpstreamMalformedResponse(
            "prometheus returned unexpected result type",
            upstream="prometheus",
        )

    raw_result = data.get("result")
    if not isinstance(raw_result, list):
        raise UpstreamMalformedResponse(
            "prometheus returned malformed matrix result",
            upstream="prometheus",
        )

    series_list: list[TimeSeries] = []
    for item in raw_result:
        if not isinstance(item, dict):
            continue

        metric = item.get("metric")
        values = item.get("values")
        if not isinstance(metric, dict) or not isinstance(values, list):
            continue

        points: list[TimeSeriesPoint] = []
        for value_pair in values:
            if not isinstance(value_pair, list) or len(value_pair) != 2:
                continue
            points.append(
                TimeSeriesPoint(
                    timestamp=parse_prometheus_timestamp(value_pair[0]),
                    value=parse_prometheus_value(str(value_pair[1])),
                )
            )

        series_list.append(
            TimeSeries(
                labels={str(key): str(val) for key, val in metric.items()},
                points=points,
            )
        )

    return series_list


def extract_scalar(samples: list[InstantSample]) -> float | None:
    """Return the first scalar value from instant samples, or null when absent."""
    if not samples:
        return None
    return samples[0].value


def extract_boolean(samples: list[InstantSample]) -> bool | None:
    """Return a boolean interpretation of the first instant sample."""
    value = extract_scalar(samples)
    if value is None:
        return None
    return value == 1.0


def extract_label(samples: list[InstantSample], label_name: str) -> str | None:
    """Return a label value from the first instant sample."""
    if not samples:
        return None
    return samples[0].labels.get(label_name)


def extract_integer(samples: list[InstantSample]) -> int | None:
    """Return the first scalar value as an integer, or null when absent."""
    value = extract_scalar(samples)
    if value is None:
        return None
    return int(value)
