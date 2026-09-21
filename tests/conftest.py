import os
import sys
from pathlib import Path

import pytest

# Disable OTLP export during tests unless a test explicitly enables tracing.
os.environ.setdefault("OTEL_TRACES_ENABLED", "false")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
USER_SERVICE_ROOT = PROJECT_ROOT / "services" / "user_service"
ORDER_SERVICE_ROOT = PROJECT_ROOT / "services" / "order_service"
PAYMENT_SERVICE_ROOT = PROJECT_ROOT / "services" / "payment_service"
OBSERVABILITY_API_ROOT = PROJECT_ROOT / "services" / "observability_api"


def _clear_app_modules() -> None:
    for key in list(sys.modules):
        if key == "app" or key.startswith("app."):
            del sys.modules[key]


def _set_service_path(service_root: Path) -> None:
    root = str(service_root)
    for service_path in (
        USER_SERVICE_ROOT,
        ORDER_SERVICE_ROOT,
        PAYMENT_SERVICE_ROOT,
        OBSERVABILITY_API_ROOT,
    ):
        service_path_str = str(service_path)
        while service_path_str in sys.path:
            sys.path.remove(service_path_str)
    sys.path.insert(0, root)
    _clear_app_modules()


def pytest_configure(config) -> None:
    _set_service_path(USER_SERVICE_ROOT)


def pytest_runtest_setup(item) -> None:
    fspath = str(item.fspath)
    if "observability_api" in fspath:
        _set_service_path(OBSERVABILITY_API_ROOT)
    elif "payment_service" in fspath:
        _set_service_path(PAYMENT_SERVICE_ROOT)
    elif "order_service" in fspath:
        _set_service_path(ORDER_SERVICE_ROOT)
    else:
        _set_service_path(USER_SERVICE_ROOT)


@pytest.fixture
def order_service_modules():
    """Import Order Service modules with the correct service path."""
    _set_service_path(ORDER_SERVICE_ROOT)
    from app.clients.payment import PaymentServiceClient
    from app.core.config import Settings
    from app.core.exceptions import (
        InvalidOrderStateError,
        OrderNotFoundError,
        PaymentServiceError,
        PaymentServiceTimeoutError,
        PaymentServiceUnavailableError,
    )
    from app.db.database import Base
    from app.models.order import Order, OrderStatus
    from app.repositories.order import OrderRepository
    from app.schemas.order import OrderCreate, OrderUpdate
    from app.services.order import OrderService

    return {
        "Base": Base,
        "Order": Order,
        "OrderStatus": OrderStatus,
        "OrderCreate": OrderCreate,
        "OrderUpdate": OrderUpdate,
        "OrderRepository": OrderRepository,
        "OrderService": OrderService,
        "OrderNotFoundError": OrderNotFoundError,
        "InvalidOrderStateError": InvalidOrderStateError,
        "PaymentServiceClient": PaymentServiceClient,
        "PaymentServiceError": PaymentServiceError,
        "PaymentServiceUnavailableError": PaymentServiceUnavailableError,
        "PaymentServiceTimeoutError": PaymentServiceTimeoutError,
        "Settings": Settings,
    }


@pytest.fixture
def payment_service_modules():
    """Import Payment Service modules with the correct service path."""
    _set_service_path(PAYMENT_SERVICE_ROOT)
    from app.core.exceptions import InvalidPaymentStateError, PaymentNotFoundError
    from app.db.database import Base
    from app.models.payment import Payment, PaymentStatus
    from app.repositories.payment import PaymentRepository
    from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentUpdate
    from app.services.payment import PaymentService

    return {
        "Base": Base,
        "Payment": Payment,
        "PaymentStatus": PaymentStatus,
        "PaymentCreate": PaymentCreate,
        "PaymentUpdate": PaymentUpdate,
        "PaymentResponse": PaymentResponse,
        "PaymentRepository": PaymentRepository,
        "PaymentService": PaymentService,
        "PaymentNotFoundError": PaymentNotFoundError,
        "InvalidPaymentStateError": InvalidPaymentStateError,
    }


@pytest.fixture
def observability_api_modules():
    """Import Observability API modules with the correct service path."""
    _set_service_path(OBSERVABILITY_API_ROOT)
    from app.clients.alertmanager import AlertmanagerClient
    from app.clients.base import BaseHttpClient
    from app.clients.factory import UpstreamClients
    from app.clients.loki import LokiClient
    from app.clients.tempo import TempoClient
    from app.core.config import Settings
    from app.core.exceptions import (
        ObservabilityApiError,
        UpstreamHttpError,
        UpstreamMalformedResponse,
        UpstreamTimeout,
        UpstreamUnavailable,
    )
    from app.main import create_app
    from app.services.health_service import HealthService

    return {
        "AlertmanagerClient": AlertmanagerClient,
        "BaseHttpClient": BaseHttpClient,
        "LokiClient": LokiClient,
        "TempoClient": TempoClient,
        "UpstreamClients": UpstreamClients,
        "Settings": Settings,
        "ObservabilityApiError": ObservabilityApiError,
        "UpstreamHttpError": UpstreamHttpError,
        "UpstreamMalformedResponse": UpstreamMalformedResponse,
        "UpstreamTimeout": UpstreamTimeout,
        "UpstreamUnavailable": UpstreamUnavailable,
        "create_app": create_app,
        "HealthService": HealthService,
    }
