"""Schemas for chat request and response payloads."""

from pydantic import BaseModel, Field


class ChatQueryRequest(BaseModel):
    """Inbound chat request for analytical question answering."""

    question: str = Field(..., min_length=1, description="User question about availability data.")
    conversation_id: str | None = Field(
        default=None,
        description="Optional conversation identifier for future multi-turn support.",
    )


class ChatQueryResponse(BaseModel):
    """Structured grounded response for the chat UI."""

    answer: str
    grounded_metrics: list[str]
    reasoning_scope: str
    disclaimer: str
