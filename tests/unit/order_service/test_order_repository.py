from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def test_repository_create_and_get_by_id(db_session: Session, order_service_modules) -> None:
    order_repository = order_service_modules["OrderRepository"]
    order_create = order_service_modules["OrderCreate"]
    order_status = order_service_modules["OrderStatus"]

    repository = order_repository(db_session)
    order = repository.create(order_create(user_id=1, total_amount=Decimal("25.50")))

    found = repository.get_by_id(order.id)

    assert found is not None
    assert found.user_id == 1
    assert found.total_amount == Decimal("25.50")
    assert found.status == order_status.PENDING


def test_repository_list_orders(db_session: Session, order_service_modules) -> None:
    order_repository = order_service_modules["OrderRepository"]
    order_create = order_service_modules["OrderCreate"]

    repository = order_repository(db_session)
    repository.create(order_create(user_id=1, total_amount=Decimal("10.00")))
    repository.create(order_create(user_id=2, total_amount=Decimal("20.00")))

    orders = repository.list_orders()

    assert len(orders) == 2


def test_repository_update_order(db_session: Session, order_service_modules) -> None:
    order_repository = order_service_modules["OrderRepository"]
    order_create = order_service_modules["OrderCreate"]
    order_update = order_service_modules["OrderUpdate"]
    order_status = order_service_modules["OrderStatus"]

    repository = order_repository(db_session)
    order = repository.create(order_create(user_id=1, total_amount=Decimal("15.00")))

    updated = repository.update(order, order_update(status=order_status.PAID))

    assert updated.status == order_status.PAID


def test_repository_delete_order(db_session: Session, order_service_modules) -> None:
    order_repository = order_service_modules["OrderRepository"]
    order_create = order_service_modules["OrderCreate"]

    repository = order_repository(db_session)
    order = repository.create(order_create(user_id=1, total_amount=Decimal("15.00")))

    repository.delete(order)

    assert repository.get_by_id(order.id) is None


def test_repository_get_by_id_returns_none_for_missing_order(
    db_session: Session,
    order_service_modules,
) -> None:
    order_repository = order_service_modules["OrderRepository"]

    repository = order_repository(db_session)

    assert repository.get_by_id(99999) is None


def test_repository_rolls_back_on_integrity_error(
    db_session: Session,
    order_service_modules,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    order_repository = order_service_modules["OrderRepository"]
    order_create = order_service_modules["OrderCreate"]

    repository = order_repository(db_session)

    def fail_commit() -> None:
        raise IntegrityError("insert", {}, Exception())

    monkeypatch.setattr(db_session, "commit", fail_commit)

    with pytest.raises(IntegrityError):
        repository.create(order_create(user_id=1, total_amount=Decimal("10.00")))


def test_repository_add_order_flushes_without_commit(
    db_session: Session,
    order_service_modules,
) -> None:
    order_repository = order_service_modules["OrderRepository"]
    order_create = order_service_modules["OrderCreate"]

    repository = order_repository(db_session)
    order = repository.add_order(order_create(user_id=1, total_amount=Decimal("12.00")))

    assert order.id is not None
    assert repository.get_by_id(order.id) is not None

    repository.rollback()

    assert repository.get_by_id(order.id) is None


def test_repository_commit_order_persists_order(
    db_session: Session,
    order_service_modules,
) -> None:
    order_repository = order_service_modules["OrderRepository"]
    order_create = order_service_modules["OrderCreate"]

    repository = order_repository(db_session)
    order = repository.add_order(order_create(user_id=1, total_amount=Decimal("18.00")))
    committed = repository.commit_order(order)

    assert committed.id == order.id
    assert repository.get_by_id(order.id) is not None
