import pytest

from app.core.config import Settings


def test_database_url_built_from_postgres_components() -> None:
    settings = Settings(
        postgres_host="db.example.com",
        postgres_port=5433,
        postgres_db="users",
        postgres_user="app_user",
        postgres_password="s3cret!",
    )

    assert (
        settings.get_database_url()
        == "postgresql+psycopg2://app_user:s3cret%21@db.example.com:5433/users"
    )


def test_database_url_uses_database_url_override() -> None:
    settings = Settings(
        DATABASE_URL="postgresql+psycopg2://override:pass@localhost:5432/custom_db"
    )

    assert (
        settings.get_database_url()
        == "postgresql+psycopg2://override:pass@localhost:5432/custom_db"
    )


def test_default_postgres_settings_match_env_example() -> None:
    settings = Settings()

    assert settings.postgres_host == "localhost"
    assert settings.postgres_port == 5432
    assert settings.postgres_db == "k8s_reliability"
    assert settings.postgres_user == "app_user"
    assert settings.postgres_password == "change_me"
