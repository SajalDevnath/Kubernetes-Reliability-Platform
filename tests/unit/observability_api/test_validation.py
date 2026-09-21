import pytest


def test_validate_service_accepts_allowlisted_values(observability_api_modules) -> None:
    from app.core.validation import validate_service

    assert validate_service("user-service") == "user-service"
    assert validate_service("order-service") == "order-service"
    assert validate_service("payment-service") == "payment-service"


def test_validate_service_rejects_unknown_service(observability_api_modules) -> None:
    from app.core.exceptions import InvalidRequest
    from app.core.validation import validate_service

    with pytest.raises(InvalidRequest) as exc_info:
        validate_service("unknown-service")

    assert exc_info.value.code == "INVALID_REQUEST"


def test_validate_optional_service_accepts_none(observability_api_modules) -> None:
    from app.core.validation import validate_optional_service

    assert validate_optional_service(None) is None


def test_validate_minutes_default(observability_api_modules) -> None:
    from app.core.config import Settings
    from app.core.validation import validate_minutes

    settings = Settings()
    assert validate_minutes(None, default=settings.metrics_range_minutes_default) == 30


def test_validate_minutes_accepts_range(observability_api_modules) -> None:
    from app.core.validation import validate_minutes

    assert validate_minutes(15, default=30) == 15


def test_validate_minutes_rejects_below_minimum(observability_api_modules) -> None:
    from app.core.validation import validate_minutes

    with pytest.raises(Exception) as exc_info:
        validate_minutes(4, default=30)

    assert exc_info.value.code == "INVALID_REQUEST"


def test_validate_minutes_rejects_above_maximum(observability_api_modules) -> None:
    from app.core.validation import validate_minutes

    with pytest.raises(Exception) as exc_info:
        validate_minutes(121, default=30)

    assert exc_info.value.code == "INVALID_REQUEST"


def test_validate_logs_limit_default(observability_api_modules) -> None:
    from app.core.validation import validate_logs_limit

    assert validate_logs_limit(None) == 50


def test_validate_logs_limit_accepts_range(observability_api_modules) -> None:
    from app.core.validation import validate_logs_limit

    assert validate_logs_limit(1) == 1
    assert validate_logs_limit(100) == 100


def test_validate_logs_limit_rejects_out_of_range(observability_api_modules) -> None:
    from app.core.validation import validate_logs_limit

    with pytest.raises(Exception) as exc_info:
        validate_logs_limit(0)

    assert exc_info.value.code == "INVALID_REQUEST"

    with pytest.raises(Exception) as exc_info:
        validate_logs_limit(101)

    assert exc_info.value.code == "INVALID_REQUEST"


def test_validate_traces_limit_default(observability_api_modules) -> None:
    from app.core.validation import validate_traces_limit

    assert validate_traces_limit(None) == 20


def test_validate_traces_limit_accepts_range(observability_api_modules) -> None:
    from app.core.validation import validate_traces_limit

    assert validate_traces_limit(1) == 1
    assert validate_traces_limit(100) == 100


def test_validate_trace_id_accepts_hex(observability_api_modules) -> None:
    from app.core.validation import validate_trace_id

    assert (
        validate_trace_id("70da75c121a8e55fb8dc385971bbde24")
        == "70da75c121a8e55fb8dc385971bbde24"
    )


def test_validate_trace_id_rejects_invalid_format(observability_api_modules) -> None:
    from app.core.validation import validate_trace_id

    with pytest.raises(Exception) as exc_info:
        validate_trace_id("not-a-valid-trace-id")

    assert exc_info.value.code == "INVALID_REQUEST"
