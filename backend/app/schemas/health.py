"""Schemas for service health responses."""

from pydantic import BaseModel


class HealthLLMStatus(BaseModel):
    """Runtime availability of optional LLM enrichment."""

    enabled: bool
    ready: bool
    provider: str
    model: str | None = None
    auto_mode: bool


class HealthChatStatus(BaseModel):
    """Runtime availability of lightweight chat features."""

    memory_enabled: bool
    memory_backend: str


class HealthResponse(BaseModel):
    """Service health payload plus runtime chat capabilities."""

    status: str
    service: str
    environment: str
    llm: HealthLLMStatus
    chat: HealthChatStatus
