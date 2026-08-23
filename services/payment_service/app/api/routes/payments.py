from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidPaymentStateError, PaymentNotFoundError
from app.db.database import get_db
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentUpdate
from app.services.payment import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    return PaymentService(db)


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payment_data: PaymentCreate,
    payment_service: PaymentService = Depends(get_payment_service),
) -> PaymentResponse:
    """Create a new payment."""
    payment = payment_service.create_payment(payment_data)
    return PaymentResponse.model_validate(payment)


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    payment_service: PaymentService = Depends(get_payment_service),
) -> list[PaymentResponse]:
    """List payments with pagination."""
    payments = payment_service.list_payments(skip=skip, limit=limit)
    return [PaymentResponse.model_validate(payment) for payment in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    payment_service: PaymentService = Depends(get_payment_service),
) -> PaymentResponse:
    """Get a payment by ID."""
    try:
        payment = payment_service.get_payment(payment_id)
    except PaymentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return PaymentResponse.model_validate(payment)


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payment_data: PaymentUpdate,
    payment_service: PaymentService = Depends(get_payment_service),
) -> PaymentResponse:
    """Update an existing payment."""
    if not payment_data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided",
        )

    try:
        payment = payment_service.update_payment(payment_id, payment_data)
    except PaymentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except InvalidPaymentStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return PaymentResponse.model_validate(payment)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: int,
    payment_service: PaymentService = Depends(get_payment_service),
) -> None:
    """Delete a payment by ID."""
    try:
        payment_service.delete_payment(payment_id)
    except PaymentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
