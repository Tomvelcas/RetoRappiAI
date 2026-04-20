"""Healthcheck endpoint."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["health"])
def healthcheck() -> HealthResponse:
    """Return service readiness details for local development and CI."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        llm={
            "enabled": settings.llm_enabled,
            "ready": settings.llm_ready,
            "provider": settings.llm_provider,
            "model": settings.openai_model if settings.llm_ready else None,
            "auto_mode": settings.chat_auto_llm,
        },
        chat={
            "memory_enabled": settings.chat_memory_enabled,
            "memory_backend": "sqlite" if settings.chat_memory_enabled else "disabled",
        },
    )
