from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaymentClientResponse(BaseModel):
    """Payment data returned by Payment Service."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int = Field(gt=0)
    amount: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
