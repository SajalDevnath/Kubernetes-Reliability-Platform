from decimal import Decimal
from unittest.mock import MagicMock

import pytest


def test_create_order_returns_created_order(order_service_modules) -> None:
    order_service_cls = order_service_modules["OrderService"]
    order_create = order_service_modules["OrderCreate"]
    order_status = order_service_modules["OrderStatus"]

    mock_repository = MagicMock()
    order_data = order_create(user_id=1, total_amount=Decimal("10.00"))
    created_order = MagicMock()
    created_order.id = 1
    created_order.user_id = 1
    created_order.total_amount = Decimal("10.00")
    created_order.status = order_status.PENDING
    mock_repository.create.return_value = created_order

    service = order_service_cls(db=MagicMock())
    service.repository = mock_repository

    result = service.create_order(order_data)

    assert result == created_order
    mock_repository.create.assert_called_once_with(order_data)


def test_get_order_raises_not_found(order_service_modules) -> None:
    order_not_found_error = order_service_modules["OrderNotFoundError"]
    order_service_cls = order_service_modules["OrderService"]

    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = None

    service = order_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(order_not_found_error):
        service.get_order(99)


def test_update_order_raises_not_found(order_service_modules) -> None:
    order_not_found_error = order_service_modules["OrderNotFoundError"]
    order_service_cls = order_service_modules["OrderService"]
    order_update = order_service_modules["OrderUpdate"]

    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = None

    service = order_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(order_not_found_error):
        service.update_order(99, order_update(status=order_service_modules["OrderStatus"].PAID))


def test_update_cancelled_order_raises_invalid_state(order_service_modules) -> None:
    invalid_order_state_error = order_service_modules["InvalidOrderStateError"]
    order_service_cls = order_service_modules["OrderService"]
    order_status = order_service_modules["OrderStatus"]
    order_update = order_service_modules["OrderUpdate"]

    cancelled_order = MagicMock()
    cancelled_order.status = order_status.CANCELLED
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = cancelled_order

    service = order_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(invalid_order_state_error):
        service.update_order(1, order_update(status=order_status.PAID))


def test_update_paid_order_total_amount_raises_invalid_state(order_service_modules) -> None:
    invalid_order_state_error = order_service_modules["InvalidOrderStateError"]
    order_service_cls = order_service_modules["OrderService"]
    order_status = order_service_modules["OrderStatus"]
    order_update = order_service_modules["OrderUpdate"]

    paid_order = MagicMock()
    paid_order.status = order_status.PAID
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = paid_order

    service = order_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(invalid_order_state_error):
        service.update_order(1, order_update(total_amount=Decimal("20.00")))


def test_update_paid_order_status_raises_invalid_state(order_service_modules) -> None:
    invalid_order_state_error = order_service_modules["InvalidOrderStateError"]
    order_service_cls = order_service_modules["OrderService"]
    order_status = order_service_modules["OrderStatus"]
    order_update = order_service_modules["OrderUpdate"]

    paid_order = MagicMock()
    paid_order.status = order_status.PAID
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = paid_order

    service = order_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(invalid_order_state_error):
        service.update_order(1, order_update(status=order_status.CANCELLED))


def test_delete_order_raises_not_found(order_service_modules) -> None:
    order_not_found_error = order_service_modules["OrderNotFoundError"]
    order_service_cls = order_service_modules["OrderService"]

    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = None

    service = order_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(order_not_found_error):
        service.delete_order(99)
