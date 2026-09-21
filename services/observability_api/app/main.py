from collections.abc import Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.clients.factory import UpstreamClients
from app.core.config import Settings, get_settings
from app.core.exceptions import ObservabilityApiError
from app.schemas.common import ErrorDetail, ErrorEnvelope


def _build_upstream_clients(settings: Settings) -> UpstreamClients:
    """Create upstream clients for application lifespan."""
    return UpstreamClients.from_settings(settings)


def create_app(
    settings: Settings | None = None,
    upstream_clients_factory: Callable[[Settings], UpstreamClients] | None = None,
) -> FastAPI:
    """Create and configure the FastAPI application."""
    app_settings = settings or get_settings()
    clients_factory = upstream_clients_factory or _build_upstream_clients

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        application.state.upstream_clients = clients_factory(app_settings)
        try:
            yield
        finally:
            application.state.upstream_clients.close()

    application = FastAPI(
        title="Observability API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )
    application.include_router(api_router)

    @application.exception_handler(ObservabilityApiError)
    async def observability_api_error_handler(
        _request: Request,
        exc: ObservabilityApiError,
    ) -> JSONResponse:
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code=exc.code,
                message=exc.message,
                upstream=exc.upstream,
                request_id=None,
            )
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=envelope.model_dump(),
        )

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
