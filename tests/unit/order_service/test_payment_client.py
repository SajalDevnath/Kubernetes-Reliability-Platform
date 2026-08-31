import json
from decimal import Decimal

import httpx
import pytest


def _payment_response_json(order_id: int = 1, amount: str = "10.00") -> dict[str, object]:
    return {
        "id": 1,
        "order_id": order_id,
        "amount": amount,
        "status": "pending",
        "created_at": "2026-08-25T12:00:00+00:00",
        "updated_at": "2026-08-25T12:00:00+00:00",
    }


def test_payment_client_create_payment_success(order_service_modules) -> None:
    payment_service_client = order_service_modules["PaymentServiceClient"]
    settings = order_service_modules["Settings"](
        payment_service_url="http://payment-service",
        payment_service_timeout_seconds=5.0,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/payments"
        assert json.loads(request.content) == {"order_id": 1, "amount": "10.00"}
        return httpx.Response(201, json=_payment_response_json())

    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.payment_service_url,
    )
    client = payment_service_client(settings=settings, http_client=http_client)

    response = client.create_payment(order_id=1, amount=Decimal("10.00"))

    assert response.order_id == 1
    assert response.amount == Decimal("10.00")
    assert response.status == "pending"


def test_payment_client_raises_unavailable_on_connection_error(order_service_modules) -> None:
    payment_service_client = order_service_modules["PaymentServiceClient"]
    payment_service_unavailable_error = order_service_modules["PaymentServiceUnavailableError"]
    settings = order_service_modules["Settings"](
        payment_service_url="http://payment-service",
        payment_service_timeout_seconds=5.0,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.payment_service_url,
    )
    client = payment_service_client(settings=settings, http_client=http_client)

    with pytest.raises(payment_service_unavailable_error):
        client.create_payment(order_id=1, amount=Decimal("10.00"))


def test_payment_client_raises_timeout(order_service_modules) -> None:
    payment_service_client = order_service_modules["PaymentServiceClient"]
    payment_service_timeout_error = order_service_modules["PaymentServiceTimeoutError"]
    settings = order_service_modules["Settings"](
        payment_service_url="http://payment-service",
        payment_service_timeout_seconds=5.0,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.payment_service_url,
    )
    client = payment_service_client(settings=settings, http_client=http_client)

    with pytest.raises(payment_service_timeout_error):
        client.create_payment(order_id=1, amount=Decimal("10.00"))


def test_payment_client_raises_error_on_non_201_response(order_service_modules) -> None:
    payment_service_client = order_service_modules["PaymentServiceClient"]
    payment_service_error = order_service_modules["PaymentServiceError"]
    settings = order_service_modules["Settings"](
        payment_service_url="http://payment-service",
        payment_service_timeout_seconds=5.0,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"detail": "internal error"})

    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.payment_service_url,
    )
    client = payment_service_client(settings=settings, http_client=http_client)

    with pytest.raises(payment_service_error):
        client.create_payment(order_id=1, amount=Decimal("10.00"))


def test_payment_client_raises_error_on_malformed_response(order_service_modules) -> None:
    payment_service_client = order_service_modules["PaymentServiceClient"]
    payment_service_error = order_service_modules["PaymentServiceError"]
    settings = order_service_modules["Settings"](
        payment_service_url="http://payment-service",
        payment_service_timeout_seconds=5.0,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(201, json={"unexpected": "payload"})

    http_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url=settings.payment_service_url,
    )
    client = payment_service_client(settings=settings, http_client=http_client)

    with pytest.raises(payment_service_error):
        client.create_payment(order_id=1, amount=Decimal("10.00"))
