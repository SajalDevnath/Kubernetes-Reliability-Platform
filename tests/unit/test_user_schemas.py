import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate, UserUpdate


def test_user_create_requires_valid_email() -> None:
    with pytest.raises(ValidationError):
        UserCreate(email="not-an-email", full_name="Test User")


def test_user_create_rejects_empty_full_name() -> None:
    with pytest.raises(ValidationError):
        UserCreate(email="user@example.com", full_name="")


def test_user_create_accepts_valid_data() -> None:
    user = UserCreate(email="user@example.com", full_name="Test User")

    assert user.email == "user@example.com"
    assert user.full_name == "Test User"
    assert user.is_active is True


def test_user_update_allows_partial_fields() -> None:
    update = UserUpdate(full_name="Updated Name")

    assert update.full_name == "Updated Name"
    assert update.email is None
    assert update.is_active is None


def test_user_update_rejects_empty_full_name() -> None:
    with pytest.raises(ValidationError):
        UserUpdate(full_name="")
