from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus


class OrderCreate(BaseModel):
    """Request body for creating an order."""

    user_id: int = Field(gt=0)
    total_amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class OrderUpdate(BaseModel):
    """Request body for updating an order."""

    status: OrderStatus | None = None
    total_amount: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)


class OrderResponse(BaseModel):
    """Order data returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: OrderStatus
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
