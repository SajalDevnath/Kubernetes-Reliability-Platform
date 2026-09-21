from fastapi import APIRouter

from app.api.routes import alerts, health, logs, metrics, traces

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(health.observability_router)
health.observability_router.include_router(metrics.router)
health.observability_router.include_router(logs.router)
health.observability_router.include_router(traces.router)
health.observability_router.include_router(alerts.router)
