import pytest
from sqlalchemy.exc import OperationalError

from app.db.database import check_database_connection


@pytest.mark.integration
def test_postgresql_connectivity() -> None:
    """Verify live PostgreSQL connectivity when a database server is available."""
    try:
        assert check_database_connection() is True
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not available: {exc}")
