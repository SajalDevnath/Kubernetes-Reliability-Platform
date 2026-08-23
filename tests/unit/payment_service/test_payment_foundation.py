from datetime import datetime, timezone
from decimal import Decimal

import pytest


def test_payments_table_registered_in_metadata(payment_service_modules) -> None:
    base = payment_service_modules["Base"]
    assert "payments" in base.metadata.tables


def test_payment_model_columns(payment_service_modules) -> None:
    base = payment_service_modules["Base"]
    table = base.metadata.tables["payments"]
    column_names = {column.name for column in table.columns}

    assert column_names == {
        "id",
        "order_id",
        "amount",
        "status",
        "created_at",
        "updated_at",
    }


def test_payment_model_order_id_indexed(payment_service_modules) -> None:
    base = payment_service_modules["Base"]
    table = base.metadata.tables["payments"]
    order_id_column = table.columns["order_id"]

    assert order_id_column.index is True


def test_payment_status_enum_values(payment_service_modules) -> None:
    payment_status = payment_service_modules["PaymentStatus"]
    assert {status.value for status in payment_status} == {
        "pending",
        "successful",
        "failed",
    }


def test_payment_status_column_defaults_to_pending(payment_service_modules) -> None:
    base = payment_service_modules["Base"]
    status_column = base.metadata.tables["payments"].columns["status"]

    assert status_column.default is not None
    assert status_column.default.arg == payment_service_modules["PaymentStatus"].PENDING


def test_payment_create_requires_positive_order_id(payment_service_modules) -> None:
    from pydantic import ValidationError

    payment_create = payment_service_modules["PaymentCreate"]
    with pytest.raises(ValidationError):
        payment_create(order_id=0, amount=Decimal("10.00"))


def test_payment_create_requires_positive_amount(payment_service_modules) -> None:
    from pydantic import ValidationError

    payment_create = payment_service_modules["PaymentCreate"]
    with pytest.raises(ValidationError):
        payment_create(order_id=1, amount=Decimal("0.00"))


def test_payment_create_accepts_valid_data(payment_service_modules) -> None:
    payment_create = payment_service_modules["PaymentCreate"]
    payment = payment_create(order_id=1, amount=Decimal("19.99"))

    assert payment.order_id == 1
    assert payment.amount == Decimal("19.99")


def test_payment_update_allows_partial_fields(payment_service_modules) -> None:
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]
    update = payment_update(status=payment_status.SUCCESSFUL)

    assert update.status == payment_status.SUCCESSFUL
    assert update.amount is None


def test_payment_update_rejects_non_positive_amount(payment_service_modules) -> None:
    from pydantic import ValidationError

    payment_update = payment_service_modules["PaymentUpdate"]
    with pytest.raises(ValidationError):
        payment_update(amount=Decimal("-1.00"))


def test_payment_update_accepts_valid_status(payment_service_modules) -> None:
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]
    update = payment_update(status=payment_status.FAILED)

    assert update.status == payment_status.FAILED


def test_payment_response_serializes_from_attributes(payment_service_modules) -> None:
    payment_model = payment_service_modules["Payment"]
    payment_status = payment_service_modules["PaymentStatus"]
    payment_response = payment_service_modules["PaymentResponse"]

    now = datetime.now(timezone.utc)
    payment = payment_model(
        order_id=42,
        amount=Decimal("49.99"),
        status=payment_status.PENDING,
    )
    payment.id = 1
    payment.created_at = now
    payment.updated_at = now

    response = payment_response.model_validate(payment)

    assert response.id == 1
    assert response.order_id == 42
    assert response.amount == Decimal("49.99")
    assert response.status == payment_status.PENDING
    assert response.created_at == now
    assert response.updated_at == now
