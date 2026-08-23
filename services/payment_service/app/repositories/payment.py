from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import PaymentCreate, PaymentUpdate


class PaymentRepository:
    """PostgreSQL data access for payments."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payment_data: PaymentCreate) -> Payment:
        payment = Payment(
            order_id=payment_data.order_id,
            amount=payment_data.amount,
            status=PaymentStatus.PENDING,
        )
        self.db.add(payment)
        try:
            self.db.commit()
            self.db.refresh(payment)
            return payment
        except IntegrityError:
            self.db.rollback()
            raise

    def get_by_id(self, payment_id: int) -> Payment | None:
        return self.db.get(Payment, payment_id)

    def list_payments(self, skip: int = 0, limit: int = 100) -> list[Payment]:
        statement = select(Payment).order_by(Payment.id).offset(skip).limit(limit)
        return list(self.db.scalars(statement).all())

    def update(self, payment: Payment, payment_data: PaymentUpdate) -> Payment:
        update_data = payment_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(payment, field, value)
        try:
            self.db.commit()
            self.db.refresh(payment)
            return payment
        except IntegrityError:
            self.db.rollback()
            raise

    def delete(self, payment: Payment) -> None:
        self.db.delete(payment)
        self.db.commit()
