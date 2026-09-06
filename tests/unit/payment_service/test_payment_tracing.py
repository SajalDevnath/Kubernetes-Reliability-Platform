import pytest

from app.core.config import get_settings
from app.tracing import build_resource


@pytest.fixture(autouse=True)
def reset_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_build_resource_uses_payment_service_name() -> None:
    resource = build_resource("payment-service")

    assert resource.attributes["service.name"] == "payment-service"


def test_settings_service_name_matches_otel_resource(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SERVICE_NAME", "payment-service")
    get_settings.cache_clear()

    settings = get_settings()
    resource = build_resource(settings.service_name)

    assert settings.service_name == "payment-service"
    assert resource.attributes["service.name"] == "payment-service"


def test_create_app_with_tracing_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_TRACES_ENABLED", "false")
    get_settings.cache_clear()

    from app.main import create_app

    application = create_app()

    assert application.title == "Payment Service"
