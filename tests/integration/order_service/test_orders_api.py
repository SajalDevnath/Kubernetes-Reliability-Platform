import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError


@pytest.mark.integration
def test_create_order(order_api_client) -> None:
    response = order_api_client.post(
        "/orders",
        json={"user_id": 1, "total_amount": "49.99"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == 1
    assert data["total_amount"] == "49.99"
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.integration
def test_create_order_creates_payment(order_api_client, payment_db_session) -> None:
    from decimal import Decimal

    from sqlalchemy import select

    response = order_api_client.post(
        "/orders",
        json={"user_id": 10, "total_amount": "33.33"},
    )

    assert response.status_code == 201
    order_id = response.json()["id"]

    with payment_db_session() as session:
        from app.models.payment import Payment

        payment = session.scalars(
            select(Payment).where(Payment.order_id == order_id)
        ).one()
        assert payment.amount == Decimal("33.33")
        assert payment.status.value == "pending"


@pytest.mark.integration
def test_get_order(order_api_client) -> None:
    create_response = order_api_client.post(
        "/orders",
        json={"user_id": 2, "total_amount": "19.99"},
    )
    order_id = create_response.json()["id"]

    response = order_api_client.get(f"/orders/{order_id}")

    assert response.status_code == 200
    assert response.json()["user_id"] == 2


@pytest.mark.integration
def test_list_orders(order_api_client) -> None:
    order_api_client.post("/orders", json={"user_id": 1, "total_amount": "10.00"})
    order_api_client.post("/orders", json={"user_id": 2, "total_amount": "20.00"})

    response = order_api_client.get("/orders")

    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.integration
def test_update_order(order_api_client) -> None:
    create_response = order_api_client.post(
        "/orders",
        json={"user_id": 3, "total_amount": "15.00"},
    )
    order_id = create_response.json()["id"]

    response = order_api_client.patch(
        f"/orders/{order_id}",
        json={"status": "paid"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "paid"


@pytest.mark.integration
def test_delete_order(order_api_client) -> None:
    create_response = order_api_client.post(
        "/orders",
        json={"user_id": 4, "total_amount": "5.00"},
    )
    order_id = create_response.json()["id"]

    delete_response = order_api_client.delete(f"/orders/{order_id}")
    get_response = order_api_client.get(f"/orders/{order_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


@pytest.mark.integration
def test_get_order_not_found(order_api_client) -> None:
    response = order_api_client.get("/orders/99999")

    assert response.status_code == 404


@pytest.mark.integration
def test_create_order_rejects_invalid_amount(order_api_client) -> None:
    response = order_api_client.post(
        "/orders",
        json={"user_id": 1, "total_amount": "0.00"},
    )

    assert response.status_code == 422


@pytest.mark.integration
def test_update_order_empty_payload_returns_422(order_api_client) -> None:
    create_response = order_api_client.post(
        "/orders",
        json={"user_id": 5, "total_amount": "12.00"},
    )
    order_id = create_response.json()["id"]

    response = order_api_client.patch(f"/orders/{order_id}", json={})

    assert response.status_code == 422


@pytest.mark.integration
def test_update_cancelled_order_returns_409(order_api_client) -> None:
    create_response = order_api_client.post(
        "/orders",
        json={"user_id": 6, "total_amount": "8.00"},
    )
    order_id = create_response.json()["id"]
    order_api_client.patch(f"/orders/{order_id}", json={"status": "cancelled"})

    response = order_api_client.patch(f"/orders/{order_id}", json={"status": "paid"})

    assert response.status_code == 409


@pytest.mark.integration
def test_update_paid_order_to_cancelled_returns_409(order_api_client) -> None:
    create_response = order_api_client.post(
        "/orders",
        json={"user_id": 7, "total_amount": "8.00"},
    )
    order_id = create_response.json()["id"]
    order_api_client.patch(f"/orders/{order_id}", json={"status": "paid"})

    response = order_api_client.patch(f"/orders/{order_id}", json={"status": "cancelled"})

    assert response.status_code == 409


@pytest.mark.integration
def test_create_order_returns_503_when_payment_unavailable(order_service_modules) -> None:
    import httpx

    from app.api.routes.orders import get_payment_client
    from app.clients.payment import PaymentServiceClient
    from app.core.config import get_settings
    from app.db.database import Base, engine
    from app.main import app

    def unavailable_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    unavailable_client = httpx.Client(
        transport=httpx.MockTransport(unavailable_handler),
        base_url="http://payment-service",
    )

    def override_payment_client() -> PaymentServiceClient:
        return PaymentServiceClient(
            settings=get_settings(),
            http_client=unavailable_client,
        )

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    app.dependency_overrides[get_payment_client] = override_payment_client

    try:
        with TestClient(app) as client:
            response = client.post(
                "/orders",
                json={"user_id": 8, "total_amount": "11.00"},
            )
    finally:
        app.dependency_overrides.clear()
        unavailable_client.close()

    assert response.status_code == 503

    from sqlalchemy import func, select

    from app.db.database import SessionLocal
    from app.models.order import Order

    with SessionLocal() as session:
        count = session.scalar(
            select(func.count()).select_from(Order).where(Order.user_id == 8)
        )
        assert count == 0


@pytest.mark.integration
def test_create_order_returns_502_when_payment_returns_error(order_service_modules) -> None:
    import httpx

    from app.api.routes.orders import get_payment_client
    from app.clients.payment import PaymentServiceClient
    from app.core.config import get_settings
    from app.db.database import Base, engine
    from app.main import app

    def failing_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"detail": "internal error"})

    failing_client = httpx.Client(
        transport=httpx.MockTransport(failing_handler),
        base_url="http://payment-service",
    )
    settings = get_settings()

    def override_payment_client() -> PaymentServiceClient:
        return PaymentServiceClient(settings=settings, http_client=failing_client)

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    app.dependency_overrides[get_payment_client] = override_payment_client

    try:
        with TestClient(app) as client:
            response = client.post(
                "/orders",
                json={"user_id": 9, "total_amount": "14.00"},
            )
    finally:
        app.dependency_overrides.clear()
        failing_client.close()

    assert response.status_code == 502

    from sqlalchemy import func, select

    from app.db.database import SessionLocal
    from app.models.order import Order

    with SessionLocal() as session:
        count = session.scalar(
            select(func.count()).select_from(Order).where(Order.user_id == 9)
        )
        assert count == 0


@pytest.mark.integration
def test_create_order_returns_504_when_payment_times_out(order_service_modules) -> None:
    import httpx

    from app.api.routes.orders import get_payment_client
    from app.clients.payment import PaymentServiceClient
    from app.core.config import Settings
    from app.db.database import Base, engine
    from app.main import app

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    settings = Settings(
        payment_service_url="http://payment-service",
        payment_service_timeout_seconds=5.0,
    )

    def timeout_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    timeout_client = httpx.Client(
        transport=httpx.MockTransport(timeout_handler),
        base_url=settings.payment_service_url,
    )

    def override_payment_client() -> PaymentServiceClient:
        return PaymentServiceClient(settings=settings, http_client=timeout_client)

    app.dependency_overrides[get_payment_client] = override_payment_client

    try:
        with TestClient(app) as client:
            response = client.post(
                "/orders",
                json={"user_id": 11, "total_amount": "16.00"},
            )
    finally:
        app.dependency_overrides.clear()
        timeout_client.close()

    assert response.status_code == 504

    from sqlalchemy import func, select

    from app.db.database import SessionLocal
    from app.models.order import Order

    with SessionLocal() as session:
        count = session.scalar(
            select(func.count()).select_from(Order).where(Order.user_id == 11)
        )
        assert count == 0
