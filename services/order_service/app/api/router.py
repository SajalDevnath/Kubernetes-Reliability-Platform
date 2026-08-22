from fastapi import APIRouter

from app.api.routes import orders

api_router = APIRouter()
api_router.include_router(orders.router)
