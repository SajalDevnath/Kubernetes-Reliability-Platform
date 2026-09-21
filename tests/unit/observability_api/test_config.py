import httpx


def test_settings_defaults(observability_api_modules) -> None:
    settings = observability_api_modules["Settings"]()

    assert settings.port == 8004
    assert settings.prometheus_url == "http://localhost:9090"
    assert settings.loki_url == "http://localhost:3100"
    assert settings.tempo_url == "http://localhost:3200"
    assert settings.alertmanager_url == "http://localhost:9093"
    assert settings.upstream_timeout_seconds == 5.0
    assert settings.upstream_connect_timeout_seconds == 2.0


def test_settings_normalize_trailing_slash(observability_api_modules) -> None:
    settings = observability_api_modules["Settings"](
        prometheus_url="http://localhost:9090/",
        loki_url="http://localhost:3100/",
        tempo_url="http://localhost:3200/",
        alertmanager_url="http://localhost:9093/",
    )

    assert settings.prometheus_url == "http://localhost:9090"
    assert settings.loki_url == "http://localhost:3100"
    assert settings.tempo_url == "http://localhost:3200"
    assert settings.alertmanager_url == "http://localhost:9093"


def test_settings_upstream_timeout_configuration(observability_api_modules) -> None:
    settings = observability_api_modules["Settings"](
        upstream_timeout_seconds=7.5,
        upstream_connect_timeout_seconds=1.5,
    )
    timeout = settings.get_upstream_timeout()

    assert isinstance(timeout, httpx.Timeout)
    assert timeout.connect == 1.5
    assert timeout.read == 7.5
    assert timeout.write == 7.5
    assert timeout.pool == 7.5
