"""Chat endpoints for grounded analytics responses."""

from fastapi import APIRouter, HTTPException, status

from app.schemas.chat import ChatQueryRequest, ChatQueryResponse
from app.services.chat_service import answer_question

router = APIRouter()


@router.post("/query", response_model=ChatQueryResponse)
def query_chat(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Return a grounded response built from deterministic analytics."""
    try:
        return answer_question(payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
