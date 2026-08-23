from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def test_repository_create_and_get_by_id(db_session: Session, payment_service_modules) -> None:
    payment_repository = payment_service_modules["PaymentRepository"]
    payment_create = payment_service_modules["PaymentCreate"]
    payment_status = payment_service_modules["PaymentStatus"]

    repository = payment_repository(db_session)
    payment = repository.create(payment_create(order_id=1, amount=Decimal("25.50")))

    found = repository.get_by_id(payment.id)

    assert found is not None
    assert found.order_id == 1
    assert found.amount == Decimal("25.50")
    assert found.status == payment_status.PENDING


def test_repository_list_payments(db_session: Session, payment_service_modules) -> None:
    payment_repository = payment_service_modules["PaymentRepository"]
    payment_create = payment_service_modules["PaymentCreate"]

    repository = payment_repository(db_session)
    repository.create(payment_create(order_id=1, amount=Decimal("10.00")))
    repository.create(payment_create(order_id=2, amount=Decimal("20.00")))

    payments = repository.list_payments()

    assert len(payments) == 2


def test_repository_update_payment(db_session: Session, payment_service_modules) -> None:
    payment_repository = payment_service_modules["PaymentRepository"]
    payment_create = payment_service_modules["PaymentCreate"]
    payment_update = payment_service_modules["PaymentUpdate"]
    payment_status = payment_service_modules["PaymentStatus"]

    repository = payment_repository(db_session)
    payment = repository.create(payment_create(order_id=1, amount=Decimal("15.00")))

    updated = repository.update(payment, payment_update(status=payment_status.SUCCESSFUL))

    assert updated.status == payment_status.SUCCESSFUL


def test_repository_delete_payment(db_session: Session, payment_service_modules) -> None:
    payment_repository = payment_service_modules["PaymentRepository"]
    payment_create = payment_service_modules["PaymentCreate"]

    repository = payment_repository(db_session)
    payment = repository.create(payment_create(order_id=1, amount=Decimal("15.00")))

    repository.delete(payment)

    assert repository.get_by_id(payment.id) is None


def test_repository_get_by_id_returns_none_for_missing_payment(
    db_session: Session,
    payment_service_modules,
) -> None:
    payment_repository = payment_service_modules["PaymentRepository"]

    repository = payment_repository(db_session)

    assert repository.get_by_id(99999) is None


def test_repository_rolls_back_on_integrity_error(
    db_session: Session,
    payment_service_modules,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payment_repository = payment_service_modules["PaymentRepository"]
    payment_create = payment_service_modules["PaymentCreate"]

    repository = payment_repository(db_session)

    def fail_commit() -> None:
        raise IntegrityError("insert", {}, Exception())

    monkeypatch.setattr(db_session, "commit", fail_commit)

    with pytest.raises(IntegrityError):
        repository.create(payment_create(order_id=1, amount=Decimal("10.00")))
