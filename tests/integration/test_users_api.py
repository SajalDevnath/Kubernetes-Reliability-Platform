import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db.database import Base, SessionLocal, engine
from app.main import app


@pytest.fixture
def api_client() -> TestClient:
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")

    with TestClient(app) as client:
        yield client


@pytest.fixture(autouse=True)
def clean_users_table() -> None:
    yield
    try:
        with SessionLocal() as session:
            session.execute(text("DELETE FROM users"))
            session.commit()
    except OperationalError:
        pass


@pytest.mark.integration
def test_create_user(api_client: TestClient) -> None:
    response = api_client.post(
        "/users",
        json={"email": "user@example.com", "full_name": "Test User"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["full_name"] == "Test User"
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data


@pytest.mark.integration
def test_get_user(api_client: TestClient) -> None:
    create_response = api_client.post(
        "/users",
        json={"email": "get@example.com", "full_name": "Get User"},
    )
    user_id = create_response.json()["id"]

    response = api_client.get(f"/users/{user_id}")

    assert response.status_code == 200
    assert response.json()["email"] == "get@example.com"


@pytest.mark.integration
def test_list_users(api_client: TestClient) -> None:
    api_client.post("/users", json={"email": "one@example.com", "full_name": "One"})
    api_client.post("/users", json={"email": "two@example.com", "full_name": "Two"})

    response = api_client.get("/users")

    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.integration
def test_update_user(api_client: TestClient) -> None:
    create_response = api_client.post(
        "/users",
        json={"email": "update@example.com", "full_name": "Before"},
    )
    user_id = create_response.json()["id"]

    response = api_client.patch(
        f"/users/{user_id}",
        json={"full_name": "After"},
    )

    assert response.status_code == 200
    assert response.json()["full_name"] == "After"


@pytest.mark.integration
def test_delete_user(api_client: TestClient) -> None:
    create_response = api_client.post(
        "/users",
        json={"email": "delete@example.com", "full_name": "Delete Me"},
    )
    user_id = create_response.json()["id"]

    delete_response = api_client.delete(f"/users/{user_id}")
    get_response = api_client.get(f"/users/{user_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


@pytest.mark.integration
def test_create_user_rejects_invalid_email(api_client: TestClient) -> None:
    response = api_client.post(
        "/users",
        json={"email": "not-an-email", "full_name": "Invalid"},
    )

    assert response.status_code == 422


@pytest.mark.integration
def test_get_user_not_found(api_client: TestClient) -> None:
    response = api_client.get("/users/99999")

    assert response.status_code == 404


@pytest.mark.integration
def test_create_user_conflict_for_duplicate_email(api_client: TestClient) -> None:
    payload = {"email": "duplicate@example.com", "full_name": "First"}
    api_client.post("/users", json=payload)

    response = api_client.post("/users", json=payload)

    assert response.status_code == 409


@pytest.mark.integration
def test_update_user_empty_payload_returns_422(api_client: TestClient) -> None:
    create_response = api_client.post(
        "/users",
        json={"email": "empty@example.com", "full_name": "Empty Update"},
    )
    user_id = create_response.json()["id"]

    response = api_client.patch(f"/users/{user_id}", json={})

    assert response.status_code == 422
