"""Placeholder grounded chat orchestration."""

from app.schemas.chat import ChatQueryRequest, ChatQueryResponse


def compose_grounded_response(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Return a structured response that references deterministic analytics."""
    normalized_question = payload.question.strip()

    return ChatQueryResponse(
        answer=(
            "Based on the current placeholder analytics snapshot, overall availability is "
            "stable and trending slightly upward. Once real metrics are wired in, this "
            "response should cite validated time windows and store-level evidence."
        ),
        grounded_metrics=[
            "Availability Rate: 96.4%",
            "Affected Stores: 14",
            "Incident Hours: 27",
        ],
        reasoning_scope=(
            f"Question received: {normalized_question or 'No question provided.'} "
            "The current scaffold uses deterministic mock metrics only."
        ),
        disclaimer=(
            "This is a scaffold response. Future iterations should constrain language "
            "model output to approved analytics context."
        ),
    )
