from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok_status() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "user-service",
        "environment": "development",
    }


def test_health_response_matches_schema() -> None:
    response = client.get("/health")
    data = response.json()

    assert set(data.keys()) == {"status", "service", "environment"}
    assert data["status"] == "ok"
    assert isinstance(data["service"], str)
    assert isinstance(data["environment"], str)
