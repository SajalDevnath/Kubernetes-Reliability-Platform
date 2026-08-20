from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import UserEmailConflictError, UserNotFoundError
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Business logic for user management."""

    def __init__(self, db: Session) -> None:
        self.repository = UserRepository(db)

    def create_user(self, user_data: UserCreate) -> User:
        if self.repository.get_by_email(user_data.email):
            raise UserEmailConflictError("Email already registered")

        try:
            return self.repository.create(user_data)
        except IntegrityError as exc:
            raise UserEmailConflictError("Email already registered") from exc

    def get_user(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(f"User {user_id} not found")
        return user

    def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        return self.repository.list_users(skip=skip, limit=limit)

    def update_user(self, user_id: int, user_data: UserUpdate) -> User:
        user = self.get_user(user_id)

        if user_data.email is not None and user_data.email != user.email:
            existing = self.repository.get_by_email(user_data.email)
            if existing is not None and existing.id != user_id:
                raise UserEmailConflictError("Email already registered")

        try:
            return self.repository.update(user, user_data)
        except IntegrityError as exc:
            raise UserEmailConflictError("Email already registered") from exc

    def delete_user(self, user_id: int) -> None:
        user = self.get_user(user_id)
        self.repository.delete(user)
