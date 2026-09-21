import pytest


def test_service_logs_builds_curated_logql(observability_api_modules) -> None:
    from app.queries.loki import service_logs

    assert service_logs("user-service") == '{service="user-service"}'
    assert service_logs("order-service") == '{service="order-service"}'
    assert service_logs("payment-service") == '{service="payment-service"}'


def test_service_logs_does_not_accept_arbitrary_input(observability_api_modules) -> None:
    from app.core.exceptions import InvalidRequest
    from app.core.validation import validate_service
    from app.queries.loki import service_logs

    with pytest.raises(InvalidRequest):
        validate_service('user-service"} | json')

    with pytest.raises(InvalidRequest):
        validate_service("unknown-service")

    # Query builder itself only formats validated service names.
    assert service_logs("user-service") == '{service="user-service"}'
