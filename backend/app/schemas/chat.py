"""Schemas for chat request and response payloads."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.metrics import TimeWindow


class ChatQueryRequest(BaseModel):
    """Inbound chat request for analytical question answering."""

    question: str = Field(
        ...,
        min_length=1,
        max_length=600,
        description="User question about availability data.",
    )
    conversation_id: str | None = Field(
        default=None,
        description="Optional conversation identifier for future multi-turn support.",
    )
    use_llm: bool = Field(
        default=False,
        description="Enable optional LLM enrichment over the deterministic backend answer.",
    )
    allow_hypotheses: bool = Field(
        default=False,
        description=(
            "Allow clearly labeled, non-validated hypotheses when the user asks for "
            "possible explanations."
        ),
    )
    external_context: str | None = Field(
        default=None,
        max_length=2_000,
        description=(
            "Optional operator-provided context, such as campaigns, outages, or weather. "
            "It is treated as unverified context rather than validated data."
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "question": "¿Qué horas suelen ser más altas?",
                    "use_llm": False,
                    "allow_hypotheses": False,
                },
                {
                    "question": (
                        "¿Qué días tuvieron la menor cobertura y por qué podrían "
                        "verse así?"
                    ),
                    "use_llm": True,
                    "allow_hypotheses": True,
                    "external_context": (
                        "Ese fin de semana hubo una jornada promocional y "
                        "reportes internos de latencia."
                    ),
                },
            ]
        }
    )


class ChatEvidenceItem(BaseModel):
    """Structured evidence item returned alongside a grounded response."""

    label: str
    value: str
    source: str


class ChatQueryResponse(BaseModel):
    """Structured grounded response for the chat UI."""

    answer: str
    intent: str
    supported: bool
    confidence: str
    answer_mode: Literal["deterministic", "llm_enhanced", "deterministic_fallback"] = (
        "deterministic"
    )
    llm_used: bool = False
    llm_provider: str | None = None
    llm_model: str | None = None
    external_context_used: bool = False
    evidence: list[ChatEvidenceItem]
    hypotheses: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    warnings: list[str]
    source_tables: list[str]
    reasoning_scope: str
    disclaimer: str
    time_window: TimeWindow | None = None
