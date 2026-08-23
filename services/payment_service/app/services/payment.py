from sqlalchemy.orm import Session

from app.core.exceptions import InvalidPaymentStateError, PaymentNotFoundError
from app.models.payment import Payment, PaymentStatus
from app.repositories.payment import PaymentRepository
from app.schemas.payment import PaymentCreate, PaymentUpdate

_TERMINAL_STATUSES = frozenset({PaymentStatus.SUCCESSFUL, PaymentStatus.FAILED})
_ALLOWED_STATUS_TRANSITIONS: dict[PaymentStatus, frozenset[PaymentStatus]] = {
    PaymentStatus.PENDING: frozenset({PaymentStatus.SUCCESSFUL, PaymentStatus.FAILED}),
}


class PaymentService:
    """Business logic for payment management."""

    def __init__(self, db: Session) -> None:
        self.repository = PaymentRepository(db)

    def create_payment(self, payment_data: PaymentCreate) -> Payment:
        return self.repository.create(payment_data)

    def get_payment(self, payment_id: int) -> Payment:
        payment = self.repository.get_by_id(payment_id)
        if payment is None:
            raise PaymentNotFoundError(f"Payment {payment_id} not found")
        return payment

    def list_payments(self, skip: int = 0, limit: int = 100) -> list[Payment]:
        return self.repository.list_payments(skip=skip, limit=limit)

    def update_payment(self, payment_id: int, payment_data: PaymentUpdate) -> Payment:
        payment = self.get_payment(payment_id)

        if payment.status in _TERMINAL_STATUSES:
            raise InvalidPaymentStateError("Cannot update a terminal payment")

        if payment_data.status is not None:
            self._validate_status_transition(payment.status, payment_data.status)

        if payment_data.amount is not None and payment.status != PaymentStatus.PENDING:
            raise InvalidPaymentStateError("Cannot change amount of a non-pending payment")

        return self.repository.update(payment, payment_data)

    def delete_payment(self, payment_id: int) -> None:
        payment = self.get_payment(payment_id)
        self.repository.delete(payment)

    @staticmethod
    def _validate_status_transition(
        current_status: PaymentStatus,
        new_status: PaymentStatus,
    ) -> None:
        if new_status == current_status:
            return

        allowed_statuses = _ALLOWED_STATUS_TRANSITIONS.get(current_status, frozenset())
        if new_status not in allowed_statuses:
            raise InvalidPaymentStateError(
                f"Cannot transition payment status from {current_status.value} "
                f"to {new_status.value}"
            )
