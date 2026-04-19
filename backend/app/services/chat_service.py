"""Service layer for chatbot orchestration."""

from app.chat.enrichment import enrich_chat_response
from app.chat.orchestrator import compose_grounded_response
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse


def answer_question(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Delegate the response to the chat orchestration module."""
    grounded_response = compose_grounded_response(payload)
    return enrich_chat_response(payload, grounded_response)
