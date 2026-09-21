from collections.abc import Callable, Iterator
from contextlib import contextmanager

import httpx
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def build_upstream_clients(observability_api_modules):
    """Build upstream clients backed by a shared mock transport handler."""

    def _build(handler: Callable[[httpx.Request], httpx.Response]):
        settings = observability_api_modules["Settings"]()
        upstream_clients_cls = observability_api_modules["UpstreamClients"]

        def client_factory(base_url: str, timeout: httpx.Timeout) -> httpx.Client:
            return httpx.Client(
                transport=httpx.MockTransport(handler),
                base_url=base_url,
                timeout=timeout,
            )

        return upstream_clients_cls.from_settings(settings, client_factory=client_factory)

    return _build


@pytest.fixture
def observability_api_client_factory(observability_api_modules, build_upstream_clients):
    """Factory for TestClient instances with mocked upstream clients."""

    @contextmanager
    def _factory(handler: Callable[[httpx.Request], httpx.Response]) -> Iterator[TestClient]:
        settings = observability_api_modules["Settings"]()
        upstream_clients = build_upstream_clients(handler)
        app = observability_api_modules["create_app"](
            settings=settings,
            upstream_clients_factory=lambda _settings: upstream_clients,
        )
        with TestClient(app) as client:
            yield client

    return _factory
