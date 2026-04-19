"""Service layer for chatbot orchestration."""

from app.chat.orchestrator import compose_grounded_response
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse


def answer_question(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Delegate the response to the chat orchestration module."""
    return compose_grounded_response(payload)
