"""Optional OpenAI-backed enrichment for grounded chat responses."""

from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass
from typing import Any
from urllib import error, request
from urllib.parse import urlparse

from app.core.config import Settings, get_settings
from app.schemas.chat import ChatExternalSource, ChatQueryRequest, ChatQueryResponse

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


class LLMEnrichmentError(RuntimeError):
    """Base exception for LLM enrichment failures."""


class LLMConfigurationError(LLMEnrichmentError):
    """Raised when optional LLM support is requested but not configured."""


class LLMRequestError(LLMEnrichmentError):
    """Raised when the external LLM request fails or returns invalid data."""


@dataclass(frozen=True, slots=True)
class LLMEnrichmentResult:
    """Normalized enrichment payload returned by the optional LLM layer."""

    answer: str
    hypotheses: tuple[str, ...]
    follow_up_questions: tuple[str, ...]
    caveats: tuple[str, ...]
    provider: str
    model: str


@dataclass(frozen=True, slots=True)
class LLMWebResearchResult:
    """External web research used for tentative, sourced hypotheses."""

    summary: str
    hypotheses: tuple[str, ...]
    follow_up_questions: tuple[str, ...]
    caveats: tuple[str, ...]
    sources: tuple[ChatExternalSource, ...]
    provider: str
    model: str


def _user_safe_request_error(message: str) -> str:
    """Remove provider internals from end-user-visible fallback messages."""
    lowered = message.lower()
    if "timed out" in lowered:
        return "The narrative polish service timed out."
    if "processing your request" in lowered:
        return "The narrative polish service was temporarily unavailable."
    if "invalid api key" in lowered or "incorrect api key" in lowered:
        return "The narrative polish service rejected the API key."
    if "rate limit" in lowered:
        return "The narrative polish service is temporarily rate limited."
    if "unusable response" in lowered or "valid json" in lowered:
        return "The narrative polish service returned an unusable response."
    return "The narrative polish service did not complete the request."


def _response_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["answer", "hypotheses", "follow_up_questions", "caveats"],
        "properties": {
            "answer": {
                "type": "string",
                "description": "Natural-language answer grounded in the supplied evidence.",
            },
            "hypotheses": {
                "type": "array",
                "description": "Optional tentative explanations, clearly labeled as hypotheses.",
                "items": {"type": "string"},
            },
            "follow_up_questions": {
                "type": "array",
                "description": "Optional follow-up questions that stay within the supported scope.",
                "items": {"type": "string"},
            },
            "caveats": {
                "type": "array",
                "description": "Explicit caveats tied to coverage, scope, or external context.",
                "items": {"type": "string"},
            },
        },
    }


def _build_system_prompt(
    *,
    allow_hypotheses: bool,
    has_external_context: bool,
) -> str:
    hypothesis_rule = (
        "Hypotheses are allowed, but they must be clearly labeled as tentative and never "
        "presented as observed facts."
        if allow_hypotheses
        else "Do not provide hypotheses or causal speculation."
    )
    external_context_rule = (
        "If external context is present, treat it as user-supplied and unverified. You may "
        "reference it only as possible context, never as confirmed truth."
        if has_external_context
        else "Do not invent external factors or missing context."
    )
    return (
        "You are an analytics-first conversational assistant embedded in a dashboard over "
        "an aggregated time series. Rewrite deterministic backend answers so they sound "
        "helpful, product-like, and conversational, but never change, round away, or "
        "invent numbers. "
        "Never imply store-level, merchant-level, city-level, or root-cause visibility "
        "because the dataset does not support that granularity. Use only the supplied "
        "evidence bundle. If the user asks why something happened, explain only what the "
        "data shows directly, then add tentative hypotheses only when allowed. Always "
        "mention uncertainty when coverage is incomplete or when external context is "
        "unverified. Keep the answer concise, executive, and useful for a demo. "
        "When the question asks about a specific day or hour, briefly mention the "
        "deterministic operation that produced the answer. "
        "If structured JSON formatting fails for any reason, fall back to plain text with "
        "explicit sections in this exact order: Answer:, Hypotheses:, "
        "Follow-up questions:, "
        "Caveats:. "
        f"{hypothesis_rule} {external_context_rule}"
    )


def _build_user_payload(
    chat_request: ChatQueryRequest,
    grounded_response: ChatQueryResponse,
    settings: Settings,
) -> str:
    evidence_items = [
        item.model_dump()
        for item in grounded_response.evidence[: settings.llm_max_evidence_items]
    ]
    warning_items = grounded_response.warnings[: settings.llm_max_warning_items]
    external_context = chat_request.external_context
    if external_context is not None:
        external_context = external_context.strip()[: settings.llm_external_context_max_chars]

    payload = {
        "user_question": chat_request.question,
        "deterministic_answer": grounded_response.answer,
        "intent": grounded_response.intent,
        "supported": grounded_response.supported,
        "confidence": grounded_response.confidence,
        "reasoning_scope": grounded_response.reasoning_scope,
        "time_window": (
            grounded_response.time_window.model_dump(mode="json")
            if grounded_response.time_window is not None
            else None
        ),
        "analysis_steps": list(grounded_response.analysis_steps),
        "evidence": evidence_items,
        "artifacts": [artifact.model_dump(mode="json") for artifact in grounded_response.artifacts],
        "warnings": warning_items,
        "source_tables": grounded_response.source_tables,
        "disclaimer": grounded_response.disclaimer,
        "allow_hypotheses": chat_request.allow_hypotheses,
        "external_context": external_context,
        "token_budget_controls": {
            "max_output_tokens": settings.llm_max_output_tokens,
            "included_evidence_items": len(evidence_items),
            "included_warning_items": len(warning_items),
            "conversation_memory": "disabled",
        },
        "output_contract": {
            "answer": "Main answer in the same language as the user question.",
            "hypotheses": (
                "0-3 tentative explanations only if allowed."
                if chat_request.allow_hypotheses
                else "Always return an empty array."
            ),
            "follow_up_questions": "0-2 grounded follow-up questions.",
            "caveats": "Coverage, scope, or unverified-context caveats that matter.",
        },
    }
    return json.dumps(payload, ensure_ascii=True)


def _build_web_research_prompt() -> str:
    return (
        "You are assisting an analytics-first dashboard. Use web search only to gather "
        "tentative external context that might help explain a date-specific or period-specific "
        "pattern already established by deterministic analytics. Never override the dataset's "
        "numeric facts. Never claim causality as confirmed. Keep every external reason explicitly "
        "tentative. If public context is weak or unrelated, say that clearly. Return either valid "
        "JSON for the expected schema or plain text with sections in this exact order: "
        "Answer:, Hypotheses:, Follow-up questions:, Caveats:."
    )


def _build_web_research_payload(
    chat_request: ChatQueryRequest,
    grounded_response: ChatQueryResponse,
) -> str:
    payload = {
        "user_question": chat_request.question,
        "grounded_answer": grounded_response.answer,
        "time_window": (
            grounded_response.time_window.model_dump(mode="json")
            if grounded_response.time_window is not None
            else None
        ),
        "evidence": [item.model_dump() for item in grounded_response.evidence[:4]],
        "warnings": grounded_response.warnings[:3],
        "instructions": (
            "Look for public events, outages, incidents, holidays, weather, campaigns, "
            "or platform issues that could be relevant to the observed day or period. "
            "If nothing useful appears, say so instead of forcing a hypothesis."
        ),
    }
    return json.dumps(payload, ensure_ascii=True)


def _extract_output_text(response_body: dict[str, Any]) -> str:
    direct_output_text = response_body.get("output_text")
    if isinstance(direct_output_text, str) and direct_output_text.strip():
        return direct_output_text.strip()

    fragments: list[str] = []
    for item in response_body.get("output", []):
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue
            if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                fragments.append(content["text"])
    return "\n".join(fragment for fragment in fragments if fragment.strip()).strip()


def _extract_json_candidate(output_text: str) -> str:
    """Recover a JSON object even when the model wraps it in markdown or prose."""
    stripped = output_text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped

    fenced_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, re.DOTALL)
    if fenced_match:
        return fenced_match.group(1).strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end != -1 and end > start:
        return stripped[start : end + 1].strip()

    return stripped


def _normalize_list(value: Any) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    items = [str(item).strip() for item in value]
    return tuple(item for item in items if item)


def _coerce_jsonish_payload(candidate: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        parsed = None

    if isinstance(parsed, dict):
        return parsed

    try:
        parsed = ast.literal_eval(candidate)
    except (SyntaxError, ValueError):
        parsed = None

    if isinstance(parsed, dict):
        return parsed

    cleaned = re.sub(r",\s*([}\]])", r"\1", candidate)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _extract_relaxed_sections(output_text: str) -> dict[str, Any]:
    stripped = re.sub(r"```(?:json)?|```", "", output_text).strip()
    section_patterns = {
        "answer": re.compile(r"^(answer|respuesta)\s*:\s*(.*)$", re.IGNORECASE),
        "hypotheses": re.compile(
            r"^(hypotheses|possible reasons|hip[oó]tesis|posibles razones)\s*:\s*(.*)$",
            re.IGNORECASE,
        ),
        "follow_up_questions": re.compile(
            (
                r"^(follow-up questions|follow up questions|next questions|"
                r"preguntas siguientes|siguientes preguntas)\s*:\s*(.*)$"
            ),
            re.IGNORECASE,
        ),
        "caveats": re.compile(
            r"^(caveats|warnings|advertencias|cautelas)\s*:\s*(.*)$",
            re.IGNORECASE,
        ),
    }

    buckets: dict[str, list[str]] = {
        "answer": [],
        "hypotheses": [],
        "follow_up_questions": [],
        "caveats": [],
    }
    current_section = "answer"

    for raw_line in stripped.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        matched_section = None
        remainder = ""
        for section_name, pattern in section_patterns.items():
            match = pattern.match(line)
            if match:
                matched_section = section_name
                remainder = match.group(2).strip()
                break

        if matched_section is not None:
            current_section = matched_section
            if remainder:
                buckets[current_section].append(re.sub(r"^[\-\*\u2022]\s*", "", remainder))
            continue

        cleaned_line = re.sub(r"^[\-\*\u2022]\s*", "", line)
        buckets[current_section].append(cleaned_line)

    answer = " ".join(buckets["answer"]).strip()
    return {
        "answer": answer or stripped,
        "hypotheses": buckets["hypotheses"],
        "follow_up_questions": buckets["follow_up_questions"],
        "caveats": buckets["caveats"],
    }


def _parse_enrichment_result(
    response_body: dict[str, Any],
    *,
    provider: str,
    model: str,
) -> LLMEnrichmentResult:
    output_text = _extract_output_text(response_body)
    if not output_text:
        msg = "The LLM response did not contain a text payload."
        raise LLMRequestError(msg)

    json_candidate = _extract_json_candidate(output_text)
    parsed = _coerce_jsonish_payload(json_candidate)
    if parsed is None:
        parsed = _extract_relaxed_sections(output_text)

    answer = str(parsed.get("answer", "")).strip()
    if not answer:
        msg = "The LLM response did not return a usable answer."
        raise LLMRequestError(msg)

    return LLMEnrichmentResult(
        answer=answer,
        hypotheses=_normalize_list(parsed.get("hypotheses")),
        follow_up_questions=_normalize_list(parsed.get("follow_up_questions")),
        caveats=_normalize_list(parsed.get("caveats")),
        provider=provider,
        model=model,
    )


def _collect_web_sources(response_body: dict[str, Any]) -> tuple[ChatExternalSource, ...]:
    collected: list[ChatExternalSource] = []
    seen: set[str] = set()

    def _append_source(url: str | None, title: str | None) -> None:
        if not url:
            return
        normalized_url = str(url).strip()
        if not normalized_url or normalized_url in seen:
            return
        seen.add(normalized_url)
        domain = urlparse(normalized_url).netloc or normalized_url
        collected.append(
            ChatExternalSource(
                title=(title or domain).strip(),
                url=normalized_url,
                domain=domain,
            )
        )

    for item in response_body.get("output", []):
        if not isinstance(item, dict):
            continue
        if item.get("type") == "web_search_call":
            action = item.get("action")
            if isinstance(action, dict):
                for source in action.get("sources", []):
                    if isinstance(source, dict):
                        _append_source(source.get("url"), source.get("title"))
        if item.get("type") == "message":
            for content in item.get("content", []):
                if not isinstance(content, dict):
                    continue
                for annotation in content.get("annotations", []):
                    if not isinstance(annotation, dict):
                        continue
                    if annotation.get("type") == "url_citation":
                        _append_source(annotation.get("url"), annotation.get("title"))

    return tuple(collected[:8])


def generate_openai_enrichment(
    chat_request: ChatQueryRequest,
    grounded_response: ChatQueryResponse,
    settings: Settings | None = None,
) -> LLMEnrichmentResult:
    """Call the OpenAI Responses API to enrich a deterministic answer."""
    runtime_settings = settings or get_settings()
    if not runtime_settings.llm_enabled:
        msg = "Optional LLM support is disabled in backend configuration."
        raise LLMConfigurationError(msg)
    if runtime_settings.llm_provider != "openai":
        msg = f"Unsupported LLM provider: {runtime_settings.llm_provider}."
        raise LLMConfigurationError(msg)
    if not runtime_settings.openai_api_key:
        msg = "OPENAI_API_KEY is required when LLM enrichment is enabled."
        raise LLMConfigurationError(msg)

    body = {
        "model": runtime_settings.openai_model,
        "instructions": _build_system_prompt(
            allow_hypotheses=chat_request.allow_hypotheses,
            has_external_context=bool(chat_request.external_context),
        ),
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": _build_user_payload(
                            chat_request,
                            grounded_response,
                            runtime_settings,
                        ),
                    }
                ],
            }
        ],
        "reasoning": {"effort": runtime_settings.llm_reasoning_effort},
        "max_output_tokens": runtime_settings.llm_max_output_tokens,
        "store": False,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "grounded_chat_enrichment",
                "strict": True,
                "schema": _response_schema(),
            }
        },
    }

    raw_request = request.Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {runtime_settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(raw_request, timeout=runtime_settings.llm_timeout_seconds) as response:
            response_body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as http_error:
        error_body = http_error.read().decode("utf-8", errors="ignore")
        try:
            parsed_error = json.loads(error_body)
            message = parsed_error.get("error", {}).get("message") or error_body
        except json.JSONDecodeError:
            message = error_body or str(http_error)
        raise LLMRequestError(_user_safe_request_error(message)) from http_error
    except error.URLError as url_error:
        raise LLMRequestError("The narrative polish service could not be reached.") from url_error
    except TimeoutError as timeout_error:
        raise LLMRequestError("The narrative polish service timed out.") from timeout_error

    return _parse_enrichment_result(
        response_body,
        provider=runtime_settings.llm_provider,
        model=runtime_settings.openai_model,
    )


def generate_openai_web_research(
    chat_request: ChatQueryRequest,
    grounded_response: ChatQueryResponse,
    settings: Settings | None = None,
) -> LLMWebResearchResult:
    """Use OpenAI web search to gather sourced external context for tentative hypotheses."""
    runtime_settings = settings or get_settings()
    if not runtime_settings.llm_enabled:
        msg = "Optional LLM support is disabled in backend configuration."
        raise LLMConfigurationError(msg)
    if runtime_settings.llm_provider != "openai":
        msg = f"Unsupported LLM provider: {runtime_settings.llm_provider}."
        raise LLMConfigurationError(msg)
    if not runtime_settings.openai_api_key:
        msg = "OPENAI_API_KEY is required when LLM enrichment is enabled."
        raise LLMConfigurationError(msg)

    body = {
        "model": runtime_settings.openai_model,
        "instructions": _build_web_research_prompt(),
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": _build_web_research_payload(chat_request, grounded_response),
                    }
                ],
            }
        ],
        "reasoning": {"effort": runtime_settings.llm_reasoning_effort},
        "max_output_tokens": runtime_settings.llm_max_output_tokens,
        "store": False,
        "tools": [{"type": "web_search"}],
        "tool_choice": "auto",
        "include": ["web_search_call.action.sources"],
    }

    raw_request = request.Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {runtime_settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(raw_request, timeout=runtime_settings.llm_timeout_seconds) as response:
            response_body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as http_error:
        error_body = http_error.read().decode("utf-8", errors="ignore")
        try:
            parsed_error = json.loads(error_body)
            message = parsed_error.get("error", {}).get("message") or error_body
        except json.JSONDecodeError:
            message = error_body or str(http_error)
        raise LLMRequestError(_user_safe_request_error(message)) from http_error
    except error.URLError as url_error:
        raise LLMRequestError("The web research service could not be reached.") from url_error
    except TimeoutError as timeout_error:
        raise LLMRequestError("The web research service timed out.") from timeout_error

    parsed = _parse_enrichment_result(
        response_body,
        provider=runtime_settings.llm_provider,
        model=runtime_settings.openai_model,
    )
    return LLMWebResearchResult(
        summary=parsed.answer,
        hypotheses=parsed.hypotheses,
        follow_up_questions=parsed.follow_up_questions,
        caveats=parsed.caveats,
        sources=_collect_web_sources(response_body),
        provider=parsed.provider,
        model=parsed.model,
    )
