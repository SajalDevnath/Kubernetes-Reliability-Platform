import json
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

PROJECT_ROOT = Path(__file__).resolve().parents[2]
USER_SERVICE_ROOT = PROJECT_ROOT / "services" / "user_service"
ORDER_SERVICE_ROOT = PROJECT_ROOT / "services" / "order_service"
PAYMENT_SERVICE_ROOT = PROJECT_ROOT / "services" / "payment_service"

SERVICE_ROOTS = (USER_SERVICE_ROOT, ORDER_SERVICE_ROOT, PAYMENT_SERVICE_ROOT)


def _clear_app_modules() -> None:
    for key in list(sys.modules):
        if key == "app" or key.startswith("app."):
            del sys.modules[key]


def _set_service_path(service_root: Path) -> None:
    root = str(service_root)
    for service_path in SERVICE_ROOTS:
        service_path_str = str(service_path)
        while service_path_str in sys.path:
            sys.path.remove(service_path_str)
    sys.path.insert(0, root)
    _clear_app_modules()


def _ensure_user_service_path() -> None:
    _set_service_path(USER_SERVICE_ROOT)


def _ensure_order_service_path() -> None:
    _set_service_path(ORDER_SERVICE_ROOT)


def _ensure_payment_service_path() -> None:
    _set_service_path(PAYMENT_SERVICE_ROOT)


@pytest.fixture
def user_api_client():
    """FastAPI test client for User Service."""
    _set_service_path(USER_SERVICE_ROOT)
    from app.db.database import Base, engine
    from app.main import app

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    with TestClient(app) as client:
        yield client


@pytest.fixture
def payment_api_client():
    """FastAPI test client for Payment Service."""
    _set_service_path(PAYMENT_SERVICE_ROOT)
    from app.db.database import Base, engine
    from app.models.payment import Payment  # noqa: F401
    from app.main import app

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    with TestClient(app) as client:
        yield client


@pytest.fixture
def payment_http_client(payment_api_client):
    """In-process HTTP client for Payment Service via sync TestClient bridge."""
    _ensure_order_service_path()

    def handler(request: httpx.Request) -> httpx.Response:
        request_kwargs: dict[str, object] = {"headers": dict(request.headers)}
        if request.content:
            request_kwargs["json"] = json.loads(request.content)

        response = payment_api_client.request(
            request.method,
            request.url.path,
            **request_kwargs,
        )
        return httpx.Response(
            status_code=response.status_code,
            content=response.content,
            headers=response.headers,
        )

    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="http://payment-service",
    )
    yield client
    client.close()


@pytest.fixture
def order_api_client(order_service_modules, payment_http_client):
    """FastAPI test client for Order Service with Payment Service wired in-process."""
    _ensure_order_service_path()
    from app.api.routes.orders import get_payment_client
    from app.clients.payment import PaymentServiceClient
    from app.core.config import get_settings
    from app.db.database import Base, engine
    from app.main import app

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    settings = get_settings()

    def override_payment_client() -> PaymentServiceClient:
        return PaymentServiceClient(settings=settings, http_client=payment_http_client)

    app.dependency_overrides[get_payment_client] = override_payment_client

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clean_e2e_tables() -> None:
    """Remove cross-service rows after each E2E test."""
    yield
    _set_service_path(USER_SERVICE_ROOT)
    try:
        from app.db.database import SessionLocal

        with SessionLocal() as session:
            session.execute(text("DELETE FROM payments"))
            session.execute(text("DELETE FROM orders"))
            session.execute(text("DELETE FROM users"))
            session.commit()
    except OperationalError:
        pass
