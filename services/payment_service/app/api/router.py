from fastapi import APIRouter

from app.api.routes import health, payments

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(payments.router)
