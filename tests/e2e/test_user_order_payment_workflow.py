import pytest
from fastapi.testclient import TestClient


def _find_payment_for_order(payment_api_client: TestClient, order_id: int) -> dict:
    response = payment_api_client.get("/payments")
    assert response.status_code == 200
    payments = response.json()
    matching = [payment for payment in payments if payment["order_id"] == order_id]
    assert len(matching) == 1, f"Expected one payment for order {order_id}, found {len(matching)}"
    return matching[0]


@pytest.mark.e2e
def test_user_order_payment_happy_path(
    user_api_client: TestClient,
    order_api_client: TestClient,
    payment_api_client: TestClient,
) -> None:
    user_response = user_api_client.post(
        "/users",
        json={"email": "e2e-user@example.com", "full_name": "E2E User"},
    )
    assert user_response.status_code == 201
    user_id = user_response.json()["id"]

    order_response = order_api_client.post(
        "/orders",
        json={"user_id": user_id, "total_amount": "49.99"},
    )
    assert order_response.status_code == 201
    order_data = order_response.json()
    order_id = order_data["id"]
    assert order_data["user_id"] == user_id
    assert order_data["total_amount"] == "49.99"
    assert order_data["status"] == "pending"

    payment = _find_payment_for_order(payment_api_client, order_id)
    assert payment["amount"] == "49.99"
    assert payment["status"] == "pending"

    get_order_response = order_api_client.get(f"/orders/{order_id}")
    assert get_order_response.status_code == 200
    retrieved_order = get_order_response.json()
    assert retrieved_order["id"] == order_id
    assert retrieved_order["user_id"] == user_id
    assert retrieved_order["total_amount"] == "49.99"
    assert retrieved_order["status"] == "pending"


@pytest.mark.e2e
def test_user_order_payment_processes_successfully(
    user_api_client: TestClient,
    order_api_client: TestClient,
    payment_api_client: TestClient,
) -> None:
    user_response = user_api_client.post(
        "/users",
        json={"email": "e2e-payment@example.com", "full_name": "E2E Payment User"},
    )
    assert user_response.status_code == 201
    user_id = user_response.json()["id"]

    order_response = order_api_client.post(
        "/orders",
        json={"user_id": user_id, "total_amount": "33.33"},
    )
    assert order_response.status_code == 201
    order_id = order_response.json()["id"]

    payment = _find_payment_for_order(payment_api_client, order_id)
    payment_id = payment["id"]
    assert payment["status"] == "pending"

    patch_response = payment_api_client.patch(
        f"/payments/{payment_id}",
        json={"status": "successful"},
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["status"] == "successful"

    get_payment_response = payment_api_client.get(f"/payments/{payment_id}")
    assert get_payment_response.status_code == 200
    assert get_payment_response.json()["status"] == "successful"
    assert get_payment_response.json()["order_id"] == order_id
    assert get_payment_response.json()["amount"] == "33.33"
