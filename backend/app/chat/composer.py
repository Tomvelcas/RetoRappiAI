"""Contextual response composition over grounded analytical truths."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Literal

from app.schemas.chat import ChatArtifact, ChatEvidenceItem


@dataclass(frozen=True, slots=True)
class ComposerInput:
    """Inputs used to turn deterministic truths into a product-like chat response."""

    question: str
    language: Literal["es", "en"]
    intent: str
    output_intent: Literal["answer", "chart", "report", "conclusions"]
    confidence: str
    supported: bool
    draft_answer: str
    evidence: list[ChatEvidenceItem]
    warnings: list[str]
    analysis_steps: list[str]
    artifacts: list[ChatArtifact]
    inherited_context: bool
    target_date: date | None = None


def _join_sentences(parts: list[str]) -> str:
    return " ".join(part.strip() for part in parts if part.strip())


def _date_label(value: date | None, language: Literal["es", "en"]) -> str:
    if value is None:
        return "el mismo rango" if language == "es" else "the same range"
    return value.isoformat()


def _artifact_sentence(payload: ComposerInput) -> str:
    if not payload.artifacts:
        return ""
    artifact = payload.artifacts[0]
    if payload.language == "es":
        if payload.output_intent == "chart":
            return f"Le dejo además {artifact.title.lower()} para ver la distribución completa."
        if payload.output_intent == "report":
            return f"El soporte visual queda resumido en {artifact.title.lower()}."
        return f"Puede apoyarse en {artifact.title.lower()} para explorar el detalle."
    if payload.output_intent == "chart":
        return f"I also left {artifact.title.lower()} so you can inspect the full distribution."
    if payload.output_intent == "report":
        return f"The visual support is summarized in {artifact.title.lower()}."
    return f"You can use {artifact.title.lower()} to inspect the detail."


def _method_sentence(payload: ComposerInput) -> str:
    if not payload.analysis_steps:
        return ""
    if payload.language == "es":
        if payload.inherited_context:
            return (
                "Tomé el mismo contexto del hilo y rehice el cálculo con ese rango activo."
            )
        if payload.output_intent in {"report", "conclusions"}:
            return "La lectura sale de un cálculo determinístico sobre el rango activo del hilo."
        return ""
    if payload.inherited_context:
        return "I reused the active thread context and reran the calculation on that same range."
    if payload.output_intent in {"report", "conclusions"}:
        return "This readout comes from a deterministic calculation over the active range."
    return ""


def _evidence_sentence(payload: ComposerInput) -> str:
    if len(payload.evidence) < 2:
        return ""
    lead = payload.evidence[0]
    second = payload.evidence[1]
    if payload.language == "es":
        return (
            f"Como respaldo, también vi {lead.label.lower()} en {lead.value} y "
            f"{second.label.lower()} en {second.value}."
        )
    return (
        f"As supporting context, I also saw {lead.label.lower()} at {lead.value} and "
        f"{second.label.lower()} at {second.value}."
    )


def _warning_sentence(payload: ComposerInput) -> str:
    if not payload.warnings:
        return ""
    warning = payload.warnings[0]
    if payload.language == "es":
        return f"Ojo: {warning}"
    return f"Caution: {warning}"


def _confidence_sentence(payload: ComposerInput) -> str:
    if payload.confidence == "high" or payload.warnings:
        return ""
    if payload.language == "es":
        return f"Esta lectura queda con confianza {payload.confidence}."
    return f"This readout carries {payload.confidence} confidence."


def compose_answer(payload: ComposerInput) -> str:
    """Build a more contextual answer from grounded deterministic truths."""
    if not payload.supported:
        return payload.draft_answer

    parts = [payload.draft_answer]
    if payload.output_intent in {"report", "conclusions"}:
        parts.append(_method_sentence(payload))
        parts.append(_evidence_sentence(payload))
    elif payload.output_intent == "chart":
        parts.append(_artifact_sentence(payload))
    else:
        parts.append(_confidence_sentence(payload))
    if payload.output_intent not in {"chart"}:
        parts.append(_artifact_sentence(payload))
    parts.append(_warning_sentence(payload))
    return _join_sentences(parts)


def compose_follow_ups(payload: ComposerInput) -> list[str]:
    """Generate contextual follow-up questions from what was actually computed."""
    suggestions: list[str] = []

    if payload.language == "es":
        if payload.intent == "unsupported_request":
            suggestions.append(
                "¿Quiere que lo llevemos a cobertura, anomalías o patrón horario?"
            )
        if payload.intent == "metric_definition":
            suggestions.append("¿Quiere ver los días más fuertes y más débiles de la señal?")
        if payload.intent == "data_quality_status":
            suggestions.append("¿Quiere que liste los días con menor cobertura?")
        if payload.artifacts and payload.output_intent != "conclusions":
            suggestions.append("¿Quiere que lo convierta en conclusiones claras?")
        if payload.output_intent != "chart" and payload.intent in {
            "hourly_coverage_profile",
            "weekday_weekend_comparison",
            "weekend_coverage_report",
        }:
            suggestions.append("¿Quiere verlo como gráfico?")
        if payload.intent == "hourly_coverage_lookup":
            suggestions.append(
                (
                    "¿Quiere compararla contra el resto de "
                    f"{_date_label(payload.target_date, payload.language)}?"
                )
            )
        if payload.intent == "hourly_coverage_profile":
            suggestions.append("¿Quiere comparar esa curva entre semana y fines de semana?")
        if payload.intent == "daily_coverage_profile":
            suggestions.append(
                "¿Quiere que destaque los días más débiles y los compare contra el promedio?"
            )
        if payload.intent == "intraday_pattern":
            suggestions.append("¿Quiere que compare ese patrón contra una fecha puntual?")
        if payload.intent == "weekday_weekend_comparison":
            suggestions.append(
                "¿Quiere que lo baje solo a fines de semana y lo detalle por fecha?"
            )
        if payload.intent == "weekend_coverage_report":
            suggestions.append("¿Quiere compararlo contra el baseline de entre semana?")
        if payload.intent == "coverage_extremes":
            suggestions.append("¿Quiere un briefing del día con menor cobertura?")
        if payload.intent == "day_briefing":
            suggestions.append("¿Quiere compararlo contra el día observado anterior?")
        if payload.warnings:
            suggestions.append("¿Quiere que aísle solo la parte del rango con mejor soporte?")
    else:
        if payload.intent == "unsupported_request":
            suggestions.append(
                "Do you want me to move that into coverage, anomalies, or hourly pattern?"
            )
        if payload.intent == "metric_definition":
            suggestions.append(
                "Do you want the strongest and weakest observed days for this signal?"
            )
        if payload.intent == "data_quality_status":
            suggestions.append("Do you want me to list the lowest-coverage days?")
        if payload.artifacts and payload.output_intent != "conclusions":
            suggestions.append("Do you want me to turn this into executive conclusions?")
        if payload.output_intent != "chart" and payload.intent in {
            "hourly_coverage_profile",
            "weekday_weekend_comparison",
            "weekend_coverage_report",
        }:
            suggestions.append("Do you want to see it as a chart?")
        if payload.intent == "hourly_coverage_lookup":
            suggestions.append(
                (
                    "Do you want that hour compared against the rest of "
                    f"{_date_label(payload.target_date, payload.language)}?"
                )
            )
        if payload.intent == "hourly_coverage_profile":
            suggestions.append("Do you want that curve split into weekdays versus weekends?")
        if payload.intent == "daily_coverage_profile":
            suggestions.append("Do you want me to highlight the weakest days against the average?")
        if payload.intent == "intraday_pattern":
            suggestions.append("Do you want that pattern compared against one specific date?")
        if payload.intent == "weekday_weekend_comparison":
            suggestions.append("Do you want a weekend-only breakdown by date?")
        if payload.intent == "weekend_coverage_report":
            suggestions.append("Do you want it compared against the weekday baseline?")
        if payload.intent == "coverage_extremes":
            suggestions.append("Do you want a briefing for the lowest-coverage day?")
        if payload.intent == "day_briefing":
            suggestions.append("Do you want it compared against the prior observed day?")
        if payload.warnings:
            suggestions.append(
                "Do you want me to isolate only the strongest-supported portion of the range?"
            )

    deduped: list[str] = []
    seen: set[str] = set()
    for item in suggestions:
        normalized = item.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(normalized)
    return deduped[:3]
