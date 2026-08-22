import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
USER_SERVICE_ROOT = PROJECT_ROOT / "services" / "user_service"
ORDER_SERVICE_ROOT = PROJECT_ROOT / "services" / "order_service"


def _clear_app_modules() -> None:
    for key in list(sys.modules):
        if key == "app" or key.startswith("app."):
            del sys.modules[key]


def _set_service_path(service_root: Path) -> None:
    root = str(service_root)
    for service_path in (USER_SERVICE_ROOT, ORDER_SERVICE_ROOT):
        service_path_str = str(service_path)
        while service_path_str in sys.path:
            sys.path.remove(service_path_str)
    sys.path.insert(0, root)
    _clear_app_modules()


def pytest_configure(config) -> None:
    _set_service_path(USER_SERVICE_ROOT)


def pytest_runtest_setup(item) -> None:
    if "order_service" in str(item.fspath):
        _set_service_path(ORDER_SERVICE_ROOT)
    else:
        _set_service_path(USER_SERVICE_ROOT)


@pytest.fixture
def order_service_modules():
    """Import Order Service modules with the correct service path."""
    _set_service_path(ORDER_SERVICE_ROOT)
    from app.db.database import Base
    from app.models.order import Order, OrderStatus
    from app.schemas.order import OrderCreate, OrderUpdate

    return {
        "Base": Base,
        "Order": Order,
        "OrderStatus": OrderStatus,
        "OrderCreate": OrderCreate,
        "OrderUpdate": OrderUpdate,
    }
