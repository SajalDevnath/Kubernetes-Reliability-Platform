from sqlalchemy.orm import Session

from app.clients.payment import PaymentServiceClient
from app.core.config import get_settings
from app.core.exceptions import InvalidOrderStateError, OrderNotFoundError, PaymentServiceError
from app.models.order import Order, OrderStatus
from app.repositories.order import OrderRepository
from app.schemas.order import OrderCreate, OrderUpdate


class OrderService:
    """Business logic for order management."""

    def __init__(
        self,
        db: Session,
        payment_client: PaymentServiceClient | None = None,
    ) -> None:
        self.repository = OrderRepository(db)
        self.payment_client = payment_client or PaymentServiceClient(settings=get_settings())

    def create_order(self, order_data: OrderCreate) -> Order:
        order = self.repository.add_order(order_data)
        try:
            self.payment_client.create_payment(order.id, order.total_amount)
        except PaymentServiceError:
            self.repository.rollback()
            raise
        return self.repository.commit_order(order)

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

        if order.status == OrderStatus.PAID:
            if order_data.total_amount is not None:
                raise InvalidOrderStateError("Cannot change total amount of a paid order")
            raise InvalidOrderStateError("Cannot update a paid order")

        return self.repository.update(order, order_data)

    def delete_order(self, order_id: int) -> None:
        order = self.get_order(order_id)
        self.repository.delete(order)
