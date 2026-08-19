from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.database import Base, SessionLocal, build_engine, get_db


def test_build_engine_returns_sqlalchemy_engine() -> None:
    settings = Settings(
        postgres_host="localhost",
        postgres_port=5432,
        postgres_db="test_db",
        postgres_user="test_user",
        postgres_password="test_password",
    )

    test_engine = build_engine(settings)

    assert isinstance(test_engine, Engine)
    test_engine.dispose()


def test_session_local_creates_session() -> None:
    session = SessionLocal()

    assert isinstance(session, Session)
    session.close()


def test_get_db_yields_and_closes_session() -> None:
    session_generator = get_db()
    session = next(session_generator)

    assert isinstance(session, Session)
    assert session.is_active

    session_generator.close()


def test_declarative_base_is_configured() -> None:
    assert hasattr(Base, "metadata")
    assert Base.metadata.tables == {}
