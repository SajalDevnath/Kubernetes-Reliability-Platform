from decimal import Decimal

import pytest


def test_orders_table_registered_in_metadata(order_service_modules) -> None:
    base = order_service_modules["Base"]
    assert "orders" in base.metadata.tables


def test_order_model_columns(order_service_modules) -> None:
    base = order_service_modules["Base"]
    table = base.metadata.tables["orders"]
    column_names = {column.name for column in table.columns}

    assert column_names == {
        "id",
        "user_id",
        "status",
        "total_amount",
        "created_at",
        "updated_at",
    }


def test_order_model_user_id_indexed(order_service_modules) -> None:
    base = order_service_modules["Base"]
    table = base.metadata.tables["orders"]
    user_id_column = table.columns["user_id"]

    assert user_id_column.index is True


def test_order_status_enum_values(order_service_modules) -> None:
    order_status = order_service_modules["OrderStatus"]
    assert {status.value for status in order_status} == {"pending", "paid", "cancelled"}


def test_order_status_column_defaults_to_pending(order_service_modules) -> None:
    base = order_service_modules["Base"]
    status_column = base.metadata.tables["orders"].columns["status"]

    assert status_column.default is not None
    assert status_column.default.arg == order_service_modules["OrderStatus"].PENDING


def test_order_create_requires_positive_user_id(order_service_modules) -> None:
    from pydantic import ValidationError

    order_create = order_service_modules["OrderCreate"]
    with pytest.raises(ValidationError):
        order_create(user_id=0, total_amount=Decimal("10.00"))


def test_order_create_requires_positive_total_amount(order_service_modules) -> None:
    from pydantic import ValidationError

    order_create = order_service_modules["OrderCreate"]
    with pytest.raises(ValidationError):
        order_create(user_id=1, total_amount=Decimal("0.00"))


def test_order_create_accepts_valid_data(order_service_modules) -> None:
    order_create = order_service_modules["OrderCreate"]
    order = order_create(user_id=1, total_amount=Decimal("19.99"))

    assert order.user_id == 1
    assert order.total_amount == Decimal("19.99")


def test_order_update_allows_partial_fields(order_service_modules) -> None:
    order_status = order_service_modules["OrderStatus"]
    order_update = order_service_modules["OrderUpdate"]
    update = order_update(status=order_status.PAID)

    assert update.status == order_status.PAID
    assert update.total_amount is None


def test_order_update_rejects_non_positive_total_amount(order_service_modules) -> None:
    from pydantic import ValidationError

    order_update = order_service_modules["OrderUpdate"]
    with pytest.raises(ValidationError):
        order_update(total_amount=Decimal("-1.00"))


def test_order_update_accepts_valid_status(order_service_modules) -> None:
    order_status = order_service_modules["OrderStatus"]
    order_update = order_service_modules["OrderUpdate"]
    update = order_update(status=order_status.CANCELLED)

    assert update.status == order_status.CANCELLED
