from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserRepository:
    """PostgreSQL data access for users."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, user_data: UserCreate) -> User:
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            is_active=user_data.is_active,
        )
        self.db.add(user)
        try:
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email)
        return self.db.scalar(statement)

    def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        statement = select(User).order_by(User.id).offset(skip).limit(limit)
        return list(self.db.scalars(statement).all())

    def update(self, user: User, user_data: UserUpdate) -> User:
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        try:
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()
