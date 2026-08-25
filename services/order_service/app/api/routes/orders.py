from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.clients.payment import PaymentServiceClient
from app.core.config import Settings, get_settings
from app.core.exceptions import (
    InvalidOrderStateError,
    OrderNotFoundError,
    PaymentServiceError,
    PaymentServiceTimeoutError,
    PaymentServiceUnavailableError,
)
from app.db.database import get_db
from app.schemas.order import OrderCreate, OrderResponse, OrderUpdate
from app.services.order import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


def get_payment_client(settings: Settings = Depends(get_settings)) -> PaymentServiceClient:
    return PaymentServiceClient(settings=settings)


def get_order_service(
    db: Session = Depends(get_db),
    payment_client: PaymentServiceClient = Depends(get_payment_client),
) -> OrderService:
    return OrderService(db, payment_client=payment_client)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    order_service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    """Create a new order."""
    try:
        order = order_service.create_order(order_data)
    except PaymentServiceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except PaymentServiceTimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        ) from exc
    except PaymentServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    return OrderResponse.model_validate(order)


@router.get("", response_model=list[OrderResponse])
def list_orders(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    order_service: OrderService = Depends(get_order_service),
) -> list[OrderResponse]:
    """List orders with pagination."""
    orders = order_service.list_orders(skip=skip, limit=limit)
    return [OrderResponse.model_validate(order) for order in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    order_service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    """Get an order by ID."""
    try:
        order = order_service.get_order(order_id)
    except OrderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return OrderResponse.model_validate(order)


@router.patch("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_data: OrderUpdate,
    order_service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    """Update an existing order."""
    if not order_data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided",
        )

    try:
        order = order_service.update_order(order_id, order_data)
    except OrderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except InvalidOrderStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return OrderResponse.model_validate(order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    order_service: OrderService = Depends(get_order_service),
) -> None:
    """Delete an order by ID."""
    try:
        order_service.delete_order(order_id)
    except OrderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
