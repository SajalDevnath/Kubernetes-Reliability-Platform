from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import UserEmailConflictError, UserNotFoundError
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.user import UserService


@pytest.fixture
def mock_repository() -> MagicMock:
    return MagicMock()


@pytest.fixture
def user_service(mock_repository: MagicMock) -> UserService:
    service = UserService(db=MagicMock())
    service.repository = mock_repository
    return service


def test_create_user_returns_created_user(user_service: UserService, mock_repository: MagicMock) -> None:
    user_data = UserCreate(email="user@example.com", full_name="Test User")
    created_user = User(id=1, email=user_data.email, full_name=user_data.full_name, is_active=True)
    mock_repository.get_by_email.return_value = None
    mock_repository.create.return_value = created_user

    result = user_service.create_user(user_data)

    assert result == created_user
    mock_repository.create.assert_called_once_with(user_data)


def test_create_user_raises_conflict_for_duplicate_email(
    user_service: UserService,
    mock_repository: MagicMock,
) -> None:
    user_data = UserCreate(email="user@example.com", full_name="Test User")
    mock_repository.get_by_email.return_value = User(
        id=1,
        email=user_data.email,
        full_name="Existing User",
        is_active=True,
    )

    with pytest.raises(UserEmailConflictError):
        user_service.create_user(user_data)


def test_create_user_handles_integrity_error(
    user_service: UserService,
    mock_repository: MagicMock,
) -> None:
    user_data = UserCreate(email="user@example.com", full_name="Test User")
    mock_repository.get_by_email.return_value = None
    mock_repository.create.side_effect = IntegrityError("insert", {}, Exception())

    with pytest.raises(UserEmailConflictError):
        user_service.create_user(user_data)


def test_get_user_raises_not_found(user_service: UserService, mock_repository: MagicMock) -> None:
    mock_repository.get_by_id.return_value = None

    with pytest.raises(UserNotFoundError):
        user_service.get_user(99)


def test_update_user_raises_conflict_for_duplicate_email(
    user_service: UserService,
    mock_repository: MagicMock,
) -> None:
    existing_user = User(id=1, email="user@example.com", full_name="Test User", is_active=True)
    other_user = User(id=2, email="other@example.com", full_name="Other User", is_active=True)
    mock_repository.get_by_id.return_value = existing_user
    mock_repository.get_by_email.return_value = other_user

    with pytest.raises(UserEmailConflictError):
        user_service.update_user(1, UserUpdate(email="other@example.com"))


def test_delete_user_raises_not_found(user_service: UserService, mock_repository: MagicMock) -> None:
    mock_repository.get_by_id.return_value = None

    with pytest.raises(UserNotFoundError):
        user_service.delete_user(99)
