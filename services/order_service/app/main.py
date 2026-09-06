from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.db.database import Base, engine
from app.logging import build_log_config, setup_logging
from app.metrics import setup_metrics
from app.models.order import Order  # noqa: F401 — register ORM model metadata
from app.tracing import instrument_app, setup_tracing


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Initialize database tables on application startup."""
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    setup_logging(settings.service_name, settings.log_level)
    setup_tracing(
        settings.service_name,
        enabled=settings.otel_traces_enabled,
        endpoint=settings.otel_exporter_otlp_endpoint,
        engine=engine,
    )

    application = FastAPI(
        title="Order Service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )
    application.include_router(api_router)
    setup_metrics(application, get_settings().service_name)
    instrument_app(application, enabled=settings.otel_traces_enabled)
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
        log_config=build_log_config(settings.service_name, settings.log_level),
    )


if __name__ == "__main__":
    main()
