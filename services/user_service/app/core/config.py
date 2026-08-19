from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_env: str = "development"
    log_level: str = "info"
    service_name: str = "user-service"
    host: str = "0.0.0.0"
    port: int = 8001

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "k8s_reliability"
    postgres_user: str = "app_user"
    postgres_password: str = Field(default="change_me")

    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")

    def get_database_url(self) -> str:
        """Return the SQLAlchemy database URL from env override or components."""
        if self.database_url:
            return self.database_url

        user = quote_plus(self.postgres_user)
        password = quote_plus(self.postgres_password)
        return (
            f"postgresql+psycopg2://{user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
