from sqlalchemy.orm import Session

from app.core.exceptions import InvalidOrderStateError, OrderNotFoundError
from app.models.order import Order, OrderStatus
from app.repositories.order import OrderRepository
from app.schemas.order import OrderCreate, OrderUpdate


class OrderService:
    """Business logic for order management."""

    def __init__(self, db: Session) -> None:
        self.repository = OrderRepository(db)

    def create_order(self, order_data: OrderCreate) -> Order:
        return self.repository.create(order_data)

    def get_order(self, order_id: int) -> Order:
        order = self.repository.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError(f"Order {order_id} not found")
        return order

    def list_orders(self, skip: int = 0, limit: int = 100) -> list[Order]:
        return self.repository.list_orders(skip=skip, limit=limit)

    def update_order(self, order_id: int, order_data: OrderUpdate) -> Order:
        order = self.get_order(order_id)

        if order.status == OrderStatus.CANCELLED:
            raise InvalidOrderStateError("Cannot update a cancelled order")

        if order.status == OrderStatus.PAID and order_data.total_amount is not None:
            raise InvalidOrderStateError("Cannot change total amount of a paid order")

        return self.repository.update(order, order_data)

    def delete_order(self, order_id: int) -> None:
        order = self.get_order(order_id)
        self.repository.delete(order)
