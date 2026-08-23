import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError


@pytest.fixture
def payment_api_client(payment_service_modules):
    """FastAPI test client for the Payment Service."""
    from app.db.database import Base, engine
    from app.main import app

    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    with TestClient(app) as client:
        yield client


@pytest.fixture(autouse=True)
def clean_payments_table(payment_service_modules) -> None:
    from app.db.database import SessionLocal

    yield
    try:
        with SessionLocal() as session:
            session.execute(text("DELETE FROM payments"))
            session.commit()
    except OperationalError:
        pass


@pytest.mark.integration
def test_create_payment(payment_api_client) -> None:
    response = payment_api_client.post(
        "/payments",
        json={"order_id": 1, "amount": "49.99"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["order_id"] == 1
    assert data["amount"] == "49.99"
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.integration
def test_get_payment(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 2, "amount": "19.99"},
    )
    payment_id = create_response.json()["id"]

    response = payment_api_client.get(f"/payments/{payment_id}")

    assert response.status_code == 200
    assert response.json()["order_id"] == 2


@pytest.mark.integration
def test_list_payments(payment_api_client) -> None:
    payment_api_client.post("/payments", json={"order_id": 1, "amount": "10.00"})
    payment_api_client.post("/payments", json={"order_id": 2, "amount": "20.00"})

    response = payment_api_client.get("/payments")

    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.integration
def test_update_pending_payment(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 3, "amount": "15.00"},
    )
    payment_id = create_response.json()["id"]

    response = payment_api_client.patch(
        f"/payments/{payment_id}",
        json={"amount": "18.00"},
    )

    assert response.status_code == 200
    assert response.json()["amount"] == "18.00"


@pytest.mark.integration
def test_update_pending_to_successful(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 4, "amount": "25.00"},
    )
    payment_id = create_response.json()["id"]

    response = payment_api_client.patch(
        f"/payments/{payment_id}",
        json={"status": "successful"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "successful"


@pytest.mark.integration
def test_update_pending_to_failed(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 5, "amount": "30.00"},
    )
    payment_id = create_response.json()["id"]

    response = payment_api_client.patch(
        f"/payments/{payment_id}",
        json={"status": "failed"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "failed"


@pytest.mark.integration
def test_update_invalid_status_transition_returns_409(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 6, "amount": "12.00"},
    )
    payment_id = create_response.json()["id"]
    payment_api_client.patch(f"/payments/{payment_id}", json={"status": "successful"})

    response = payment_api_client.patch(
        f"/payments/{payment_id}",
        json={"status": "failed"},
    )

    assert response.status_code == 409


@pytest.mark.integration
def test_update_terminal_payment_amount_returns_409(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 7, "amount": "8.00"},
    )
    payment_id = create_response.json()["id"]
    payment_api_client.patch(f"/payments/{payment_id}", json={"status": "successful"})

    response = payment_api_client.patch(
        f"/payments/{payment_id}",
        json={"amount": "10.00"},
    )

    assert response.status_code == 409


@pytest.mark.integration
def test_delete_payment(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 8, "amount": "5.00"},
    )
    payment_id = create_response.json()["id"]

    delete_response = payment_api_client.delete(f"/payments/{payment_id}")
    get_response = payment_api_client.get(f"/payments/{payment_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


@pytest.mark.integration
def test_get_payment_not_found(payment_api_client) -> None:
    response = payment_api_client.get("/payments/99999")

    assert response.status_code == 404


@pytest.mark.integration
def test_create_payment_rejects_invalid_amount(payment_api_client) -> None:
    response = payment_api_client.post(
        "/payments",
        json={"order_id": 1, "amount": "0.00"},
    )

    assert response.status_code == 422


@pytest.mark.integration
def test_update_payment_empty_payload_returns_422(payment_api_client) -> None:
    create_response = payment_api_client.post(
        "/payments",
        json={"order_id": 9, "amount": "12.00"},
    )
    payment_id = create_response.json()["id"]

    response = payment_api_client.patch(f"/payments/{payment_id}", json={})

    assert response.status_code == 422
