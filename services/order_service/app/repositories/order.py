from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.schemas.order import OrderCreate, OrderUpdate


class OrderRepository:
    """PostgreSQL data access for orders."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, order_data: OrderCreate) -> Order:
        order = Order(
            user_id=order_data.user_id,
            total_amount=order_data.total_amount,
            status=OrderStatus.PENDING,
        )
        self.db.add(order)
        try:
            self.db.commit()
            self.db.refresh(order)
            return order
        except IntegrityError:
            self.db.rollback()
            raise

    def get_by_id(self, order_id: int) -> Order | None:
        return self.db.get(Order, order_id)

    def list_orders(self, skip: int = 0, limit: int = 100) -> list[Order]:
        statement = select(Order).order_by(Order.id).offset(skip).limit(limit)
        return list(self.db.scalars(statement).all())

    def update(self, order: Order, order_data: OrderUpdate) -> Order:
        update_data = order_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(order, field, value)
        try:
            self.db.commit()
            self.db.refresh(order)
            return order
        except IntegrityError:
            self.db.rollback()
            raise

    def delete(self, order: Order) -> None:
        self.db.delete(order)
        self.db.commit()
