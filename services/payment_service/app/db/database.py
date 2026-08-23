from collections.abc import Generator

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import Settings, get_settings


class Base(DeclarativeBase):
    """Declarative base for SQLAlchemy ORM models."""


def build_engine(settings: Settings | None = None) -> Engine:
    """Create a SQLAlchemy engine from application settings."""
    settings = settings or get_settings()
    return create_engine(
        settings.get_database_url(),
        pool_pre_ping=True,
    )


engine = build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for FastAPI dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection(settings: Settings | None = None) -> bool:
    """Verify PostgreSQL connectivity by executing a trivial query."""
    settings = settings or get_settings()
    connectivity_engine = build_engine(settings)
    with connectivity_engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    connectivity_engine.dispose()
    return True
