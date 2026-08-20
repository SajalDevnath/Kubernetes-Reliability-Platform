import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


@pytest.fixture
def db_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_repository_create_and_get_by_id(db_session: Session) -> None:
    repository = UserRepository(db_session)
    user = repository.create(UserCreate(email="user@example.com", full_name="Test User"))

    found = repository.get_by_id(user.id)

    assert found is not None
    assert found.email == "user@example.com"


def test_repository_get_by_email(db_session: Session) -> None:
    repository = UserRepository(db_session)
    repository.create(UserCreate(email="user@example.com", full_name="Test User"))

    found = repository.get_by_email("user@example.com")

    assert found is not None
    assert found.full_name == "Test User"


def test_repository_list_users(db_session: Session) -> None:
    repository = UserRepository(db_session)
    repository.create(UserCreate(email="one@example.com", full_name="One"))
    repository.create(UserCreate(email="two@example.com", full_name="Two"))

    users = repository.list_users()

    assert len(users) == 2


def test_repository_update_user(db_session: Session) -> None:
    repository = UserRepository(db_session)
    user = repository.create(UserCreate(email="user@example.com", full_name="Test User"))

    updated = repository.update(user, UserUpdate(full_name="Updated Name"))

    assert updated.full_name == "Updated Name"


def test_repository_delete_user(db_session: Session) -> None:
    repository = UserRepository(db_session)
    user = repository.create(UserCreate(email="user@example.com", full_name="Test User"))

    repository.delete(user)

    assert repository.get_by_id(user.id) is None
