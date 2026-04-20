"""Helpers to optionally enrich grounded responses with an external LLM."""

from __future__ import annotations

from app.chat.llm_client import (
    LLMConfigurationError,
    LLMRequestError,
    generate_openai_enrichment,
    generate_openai_web_research,
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


def _user_safe_fallback_message(message: str, spanish: bool) -> str:
    lowered = message.lower()
    if "request id" in lowered or "req_" in lowered:
        return (
            "el servicio de redacción enriquecida no respondió y mantuve la salida grounded"
            if spanish
            else "the narrative polish service did not respond and the answer stayed grounded"
        )
    return message


def _wants_web_research(chat_request: ChatQueryRequest) -> bool:
    if not chat_request.allow_web_research or not chat_request.allow_hypotheses:
        return False
    lowered = chat_request.question.lower()
    markers = [
        "why",
        "reason",
        "causa",
        "causas",
        "razón",
        "razones",
        "motivo",
        "google",
        "internet",
        "web",
        "news",
        "noticias",
        "investigue",
        "investigar",
        "busque",
        "buscar",
        "hipótesis",
        "hipotesis",
        "possible reasons",
        "possible reason",
        "posibles razones",
    ]
    return any(marker in lowered for marker in markers)


def _build_fallback_response(
    chat_request: ChatQueryRequest,
    grounded_response: ChatQueryResponse,
    message: str,
) -> ChatQueryResponse:
    spanish = _looks_spanish(chat_request.question)
    safe_message = _user_safe_fallback_message(message, spanish)
    fallback_message = (
        "Se pidió redacción enriquecida, pero esta respuesta siguió en modo "
        f"grounded: {safe_message}"
        if spanish
        else (
            "Narrative polish was requested, but this response stayed in grounded "
            f"mode: {safe_message}"
        )
    )
    disclaimer_suffix = (
        " Se pidió redacción enriquecida, pero la respuesta siguió en modo grounded."
        if spanish
        else " Narrative polish was requested, but the response stayed in grounded mode."
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

    response = grounded_response
    try:
        enrichment = generate_openai_enrichment(chat_request, grounded_response)
    except LLMConfigurationError as error:
        response = _build_fallback_response(chat_request, grounded_response, str(error))
    except LLMRequestError as error:
        response = _build_fallback_response(chat_request, grounded_response, str(error))
    else:
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

        response = grounded_response.model_copy(
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

    if not _wants_web_research(chat_request):
        return response

    try:
        web_research = generate_openai_web_research(chat_request, grounded_response)
    except (LLMConfigurationError, LLMRequestError):
        return response

    spanish = _looks_spanish(chat_request.question)
    merged_hypotheses = _merge_text_lists(
        response.hypotheses,
        list(web_research.hypotheses),
    )
    merged_warnings = _merge_text_lists(
        response.warnings,
        list(web_research.caveats),
        [
            (
                "El contexto web es tentativo y no reemplaza la evidencia numérica del dataset."
                if spanish
                else (
                    "Web context is tentative and does not replace the numeric evidence in "
                    "the dataset."
                )
            )
        ],
    )
    merged_follow_ups = _merge_text_lists(
        list(response.follow_up_questions),
        list(web_research.follow_up_questions),
    )
    enriched_answer = (
        f"{response.answer}\n\n"
        + (
            f"Fuera del dataset, la investigación web no confirma una causa, "
            f"pero sí deja este contexto tentativo: {web_research.summary}"
            if spanish
            else (
                "Outside the dataset, web research does not confirm a cause, "
                f"but it does suggest this tentative context: {web_research.summary}"
            )
        )
    )
    cleaned_warnings = [
        item
        for item in merged_warnings
        if "narrative polish was requested" not in item.lower()
        and "se pidió redacción enriquecida" not in item.lower()
    ]

    return response.model_copy(
        update={
            "answer": enriched_answer,
            "answer_mode": "llm_enhanced",
            "llm_used": True,
            "llm_provider": web_research.provider,
            "llm_model": web_research.model,
            "hypotheses": merged_hypotheses if chat_request.allow_hypotheses else [],
            "follow_up_questions": merged_follow_ups,
            "warnings": cleaned_warnings,
            "web_research_used": True,
            "web_sources": list(web_research.sources),
        }
    )
