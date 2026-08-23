import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError


@pytest.fixture
def order_api_client(order_service_modules):
    """FastAPI test client for the Order Service."""
    from app.db.database import Base, SessionLocal, engine
    from app.main import app

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    with TestClient(app) as client:
        yield client


@pytest.fixture(autouse=True)
def clean_orders_table(order_service_modules) -> None:
    from app.db.database import SessionLocal

    yield
    try:
        with SessionLocal() as session:
            session.execute(text("DELETE FROM orders"))
            session.commit()
    except OperationalError:
        pass


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
