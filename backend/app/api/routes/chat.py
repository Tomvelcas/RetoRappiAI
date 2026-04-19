"""Chat endpoints for grounded analytics responses."""

from fastapi import APIRouter

from app.schemas.chat import ChatQueryRequest, ChatQueryResponse
from app.services.chat_service import answer_question

router = APIRouter()


@router.post("/query", response_model=ChatQueryResponse)
def query_chat(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Return a mocked grounded response shaped for future orchestration."""
    return answer_question(payload)
