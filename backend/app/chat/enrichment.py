"""Helpers to optionally enrich grounded responses with an external LLM."""

from __future__ import annotations

from app.chat.llm_client import (
    LLMConfigurationError,
    LLMRequestError,
    generate_openai_enrichment,
)
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse


def _looks_spanish(text: str) -> bool:
    lowered = text.lower()
    return any(
        marker in lowered
        for marker in ["qué", "como ", "cómo", "cobertura", "día", "días", "por qué", "explica"]
    )


def _merge_text_lists(*lists: list[str]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for items in lists:
        for item in items:
            normalized = item.strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            merged.append(normalized)
    return merged


def _build_fallback_response(
    chat_request: ChatQueryRequest,
    grounded_response: ChatQueryResponse,
    message: str,
) -> ChatQueryResponse:
    spanish = _looks_spanish(chat_request.question)
    fallback_message = (
        "Se solicitó enriquecimiento con LLM, pero la respuesta volvió al modo "
        f"determinístico: {message}"
        if spanish
        else (
            "LLM enrichment was requested, but the response fell back to deterministic "
            f"mode: {message}"
        )
    )
    disclaimer_suffix = (
        " Se solicitó enriquecimiento con LLM, pero la respuesta volvió al modo "
        "determinístico."
        if spanish
        else " LLM enrichment was requested, but the response fell back to deterministic mode."
    )
    return grounded_response.model_copy(
        update={
            "answer_mode": "deterministic_fallback",
            "llm_used": False,
            "warnings": _merge_text_lists(grounded_response.warnings, [fallback_message]),
            "disclaimer": f"{grounded_response.disclaimer}{disclaimer_suffix}",
        }
    )


def enrich_chat_response(
    chat_request: ChatQueryRequest,
    grounded_response: ChatQueryResponse,
) -> ChatQueryResponse:
    """Enrich a grounded response when optional LLM support is requested."""
    if not chat_request.use_llm or not grounded_response.supported:
        return grounded_response

    try:
        enrichment = generate_openai_enrichment(chat_request, grounded_response)
    except LLMConfigurationError as error:
        return _build_fallback_response(chat_request, grounded_response, str(error))
    except LLMRequestError as error:
        return _build_fallback_response(chat_request, grounded_response, str(error))

    warnings = _merge_text_lists(grounded_response.warnings, list(enrichment.caveats))
    if chat_request.allow_hypotheses and enrichment.hypotheses:
        spanish = _looks_spanish(chat_request.question)
        warnings = _merge_text_lists(
            warnings,
            [
                "Las hipótesis son interpretaciones tentativas y no hechos observados en el dato."
                if spanish
                else (
                    "Hypotheses are tentative semantic interpretations and not observed "
                    "facts from the dataset."
                )
            ],
        )

    disclaimer_suffix = (
        " La redacción se enriqueció con un LLM, pero la evidencia numérica sigue "
        "saliendo de analítica determinística."
        if _looks_spanish(chat_request.question)
        else (
            " Natural-language framing was enriched with an LLM, but the numeric "
            "evidence still comes from deterministic analytics."
        )
    )

    return grounded_response.model_copy(
        update={
            "answer": enrichment.answer,
            "answer_mode": "llm_enhanced",
            "llm_used": True,
            "llm_provider": enrichment.provider,
            "llm_model": enrichment.model,
            "external_context_used": bool(chat_request.external_context),
            "hypotheses": list(enrichment.hypotheses)
            if chat_request.allow_hypotheses
            else [],
            "follow_up_questions": list(enrichment.follow_up_questions)
            or grounded_response.follow_up_questions,
            "warnings": warnings,
            "disclaimer": f"{grounded_response.disclaimer}{disclaimer_suffix}",
        }
    )
