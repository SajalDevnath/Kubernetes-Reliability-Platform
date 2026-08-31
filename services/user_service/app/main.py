from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.db.database import Base, engine
from app.models.user import User  # noqa: F401 — register ORM model metadata


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Initialize database tables on application startup."""
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="User Service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )
    application.include_router(api_router)
    return application


app = create_app()


def main() -> None:
    """Run the application with uvicorn."""
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=settings.app_env == "development",
    )


if __name__ == "__main__":
    main()
