import pytest


def test_parse_prometheus_value_converts_numeric_and_nan(observability_api_modules) -> None:
    from app.normalization.prometheus import parse_prometheus_value

    assert parse_prometheus_value("1.5") == 1.5
    assert parse_prometheus_value("0") == 0.0
    assert parse_prometheus_value("NaN") is None
    assert parse_prometheus_value("+Inf") is None


def test_parse_prometheus_timestamp_is_utc(observability_api_modules) -> None:
    from app.normalization.prometheus import parse_prometheus_timestamp

    timestamp = parse_prometheus_timestamp(1_700_000_000.0)
    assert timestamp.tzinfo is not None
    assert timestamp.isoformat().endswith("+00:00")


def test_normalize_vector_response(observability_api_modules) -> None:
    from app.normalization.prometheus import normalize_vector

    data = {
        "resultType": "vector",
        "result": [
            {
                "metric": {"service": "order-service"},
                "value": [1_700_000_000.0, "0.42"],
            }
        ],
    }

    samples = normalize_vector(data)

    assert len(samples) == 1
    assert samples[0].labels["service"] == "order-service"
    assert samples[0].value == 0.42
    assert samples[0].timestamp is not None


def test_normalize_matrix_response(observability_api_modules) -> None:
    from app.normalization.prometheus import normalize_matrix

    data = {
        "resultType": "matrix",
        "result": [
            {
                "metric": {"service": "order-service"},
                "values": [
                    [1_700_000_000.0, "0.42"],
                    [1_700_000_060.0, "NaN"],
                ],
            }
        ],
    }

    series = normalize_matrix(data)

    assert len(series) == 1
    assert series[0].labels["service"] == "order-service"
    assert series[0].points[0].value == 0.42
    assert series[0].points[1].value is None


def test_normalize_vector_empty_result(observability_api_modules) -> None:
    from app.normalization.prometheus import normalize_vector

    samples = normalize_vector({"resultType": "vector", "result": []})
    assert samples == []


def test_validate_prometheus_data_rejects_error_status(observability_api_modules) -> None:
    from app.core.exceptions import UpstreamMalformedResponse
    from app.normalization.prometheus import validate_prometheus_data

    with pytest.raises(UpstreamMalformedResponse):
        validate_prometheus_data({"status": "error", "error": "bad_data"})


def test_validate_prometheus_data_rejects_malformed_payload(observability_api_modules) -> None:
    from app.core.exceptions import UpstreamMalformedResponse
    from app.normalization.prometheus import validate_prometheus_data

    with pytest.raises(UpstreamMalformedResponse):
        validate_prometheus_data({"status": "success", "data": "invalid"})


def test_normalize_vector_rejects_wrong_result_type(observability_api_modules) -> None:
    from app.core.exceptions import UpstreamMalformedResponse
    from app.normalization.prometheus import normalize_vector

    with pytest.raises(UpstreamMalformedResponse):
        normalize_vector({"resultType": "matrix", "result": []})


def test_extract_scalar_and_boolean_helpers(observability_api_modules) -> None:
    from app.normalization.prometheus import (
        extract_boolean,
        extract_integer,
        extract_scalar,
        normalize_vector,
    )

    data = {
        "resultType": "vector",
        "result": [{"metric": {}, "value": [1_700_000_000.0, "1"]}],
    }
    samples = normalize_vector(data)

    assert extract_scalar(samples) == 1.0
    assert extract_boolean(samples) is True
    assert extract_integer(samples) == 1
    assert extract_scalar([]) is None
