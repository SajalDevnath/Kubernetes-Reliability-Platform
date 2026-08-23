from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentStatus


class PaymentCreate(BaseModel):
    """Request body for creating a payment."""

    order_id: int = Field(gt=0)
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class PaymentUpdate(BaseModel):
    """Request body for updating a payment."""

    status: PaymentStatus | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)


class PaymentResponse(BaseModel):
    """Payment data returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    amount: Decimal
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime
