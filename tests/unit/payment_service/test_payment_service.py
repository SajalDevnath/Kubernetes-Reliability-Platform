from decimal import Decimal
from unittest.mock import MagicMock

import pytest


def test_create_payment_returns_created_payment(payment_service_modules) -> None:
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_create = payment_service_modules["PaymentCreate"]
    payment_status = payment_service_modules["PaymentStatus"]

    mock_repository = MagicMock()
    payment_data = payment_create(order_id=1, amount=Decimal("10.00"))
    created_payment = MagicMock()
    created_payment.id = 1
    created_payment.order_id = 1
    created_payment.amount = Decimal("10.00")
    created_payment.status = payment_status.PENDING
    mock_repository.create.return_value = created_payment

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    result = service.create_payment(payment_data)

    assert result == created_payment
    mock_repository.create.assert_called_once_with(payment_data)


def test_get_payment_raises_not_found(payment_service_modules) -> None:
    payment_not_found_error = payment_service_modules["PaymentNotFoundError"]
    payment_service_cls = payment_service_modules["PaymentService"]

    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = None

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(payment_not_found_error):
        service.get_payment(99)


def test_list_payments_returns_repository_results(payment_service_modules) -> None:
    payment_service_cls = payment_service_modules["PaymentService"]

    mock_repository = MagicMock()
    mock_repository.list_payments.return_value = [MagicMock(), MagicMock()]

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    result = service.list_payments(skip=0, limit=10)

    assert len(result) == 2
    mock_repository.list_payments.assert_called_once_with(skip=0, limit=10)


def test_update_payment_raises_not_found(payment_service_modules) -> None:
    payment_not_found_error = payment_service_modules["PaymentNotFoundError"]
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_update = payment_service_modules["PaymentUpdate"]
    payment_status = payment_service_modules["PaymentStatus"]

    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = None

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(payment_not_found_error):
        service.update_payment(99, payment_update(status=payment_status.SUCCESSFUL))


def test_update_pending_to_successful(payment_service_modules) -> None:
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]

    pending_payment = MagicMock()
    pending_payment.status = payment_status.PENDING
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = pending_payment
    mock_repository.update.return_value = pending_payment

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    service.update_payment(1, payment_update(status=payment_status.SUCCESSFUL))

    mock_repository.update.assert_called_once()


def test_update_pending_to_failed(payment_service_modules) -> None:
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]

    pending_payment = MagicMock()
    pending_payment.status = payment_status.PENDING
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = pending_payment
    mock_repository.update.return_value = pending_payment

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    service.update_payment(1, payment_update(status=payment_status.FAILED))

    mock_repository.update.assert_called_once()


def test_update_rejects_invalid_status_transition(payment_service_modules) -> None:
    invalid_payment_state_error = payment_service_modules["InvalidPaymentStateError"]
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]

    successful_payment = MagicMock()
    successful_payment.status = payment_status.SUCCESSFUL
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = successful_payment

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(invalid_payment_state_error):
        service.update_payment(1, payment_update(status=payment_status.PENDING))


def test_update_allows_amount_change_while_pending(payment_service_modules) -> None:
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]

    pending_payment = MagicMock()
    pending_payment.status = payment_status.PENDING
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = pending_payment
    mock_repository.update.return_value = pending_payment

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    service.update_payment(1, payment_update(amount=Decimal("20.00")))

    mock_repository.update.assert_called_once()


def test_update_rejects_amount_change_after_successful(payment_service_modules) -> None:
    invalid_payment_state_error = payment_service_modules["InvalidPaymentStateError"]
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]

    successful_payment = MagicMock()
    successful_payment.status = payment_status.SUCCESSFUL
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = successful_payment

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(invalid_payment_state_error):
        service.update_payment(1, payment_update(amount=Decimal("20.00")))


def test_update_rejects_amount_change_after_failed(payment_service_modules) -> None:
    invalid_payment_state_error = payment_service_modules["InvalidPaymentStateError"]
    payment_service_cls = payment_service_modules["PaymentService"]
    payment_status = payment_service_modules["PaymentStatus"]
    payment_update = payment_service_modules["PaymentUpdate"]

    failed_payment = MagicMock()
    failed_payment.status = payment_status.FAILED
    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = failed_payment

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(invalid_payment_state_error):
        service.update_payment(1, payment_update(amount=Decimal("20.00")))


def test_delete_payment_raises_not_found(payment_service_modules) -> None:
    payment_not_found_error = payment_service_modules["PaymentNotFoundError"]
    payment_service_cls = payment_service_modules["PaymentService"]

    mock_repository = MagicMock()
    mock_repository.get_by_id.return_value = None

    service = payment_service_cls(db=MagicMock())
    service.repository = mock_repository

    with pytest.raises(payment_not_found_error):
        service.delete_payment(99)
