from decimal import Decimal

import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import (
    PaymentServiceError,
    PaymentServiceTimeoutError,
    PaymentServiceUnavailableError,
)
from app.schemas.payment import PaymentClientResponse


class PaymentServiceClient:
    """Synchronous HTTP client for Payment Service."""

    def __init__(
        self,
        settings: Settings | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._http_client = http_client

    def create_payment(self, order_id: int, amount: Decimal) -> PaymentClientResponse:
        """Create a payment for an order via Payment Service."""
        url = f"{self.settings.payment_service_url.rstrip('/')}/payments"
        payload = {"order_id": order_id, "amount": str(amount)}

        if self._http_client is not None:
            return self._send_create_payment(self._http_client, url, payload)

        with httpx.Client(timeout=self.settings.payment_service_timeout_seconds) as client:
            return self._send_create_payment(client, url, payload)

    def _send_create_payment(
        self,
        client: httpx.Client,
        url: str,
        payload: dict[str, object],
    ) -> PaymentClientResponse:
        try:
            response = client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            raise PaymentServiceTimeoutError("Payment Service request timed out") from exc
        except httpx.RequestError as exc:
            raise PaymentServiceUnavailableError("Payment Service is unavailable") from exc

        if response.status_code != httpx.codes.CREATED:
            raise PaymentServiceError(
                f"Payment Service returned status {response.status_code}"
            )

        try:
            return PaymentClientResponse.model_validate(response.json())
        except Exception as exc:
            raise PaymentServiceError("Payment Service returned malformed response") from exc
