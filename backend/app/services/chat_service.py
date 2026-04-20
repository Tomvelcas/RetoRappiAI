"""Service layer for chatbot orchestration."""

from app.chat.brain import ChatBrain
from app.chat.enrichment import enrich_chat_response
from app.chat.memory import build_conversation_state, get_conversation_memory
from app.chat.orchestrator import compose_grounded_response
from app.core.config import get_settings
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse


def answer_question(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Delegate the response to the chat orchestration module."""
    settings = get_settings()
    memory = get_conversation_memory()
    conversation_state = None
    if payload.conversation_id and memory is not None:
        conversation_state = memory.get(payload.conversation_id)

    plan = ChatBrain(settings=settings).plan(
        payload.question,
        conversation_id=payload.conversation_id,
        force_use_llm=payload.use_llm,
        conversation_state=conversation_state,
    )

    effective_payload = payload.model_copy(update={"use_llm": plan.should_use_llm})
    grounded_response = compose_grounded_response(effective_payload, plan)

    if payload.conversation_id and memory is not None and grounded_response.supported:
        memory.save(
            build_conversation_state(
                conversation_id=payload.conversation_id,
                intent=plan.intent,
                output_intent=plan.output_intent,
                brain_mode=plan.brain_mode,
                effective_start=plan.selection.effective_start,
                effective_end=plan.selection.effective_end,
                referenced_dates=plan.extracted_dates,
                last_question=payload.question.strip(),
            )
        )

    return enrich_chat_response(effective_payload, grounded_response)
