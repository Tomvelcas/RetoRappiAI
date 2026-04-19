"""Top-level API router."""

from fastapi import APIRouter

from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
from app.api.routes.metrics import router as metrics_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(metrics_router, prefix="/api/v1/metrics", tags=["metrics"])
api_router.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])
