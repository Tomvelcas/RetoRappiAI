"""Grounded chat orchestration over deterministic analytics outputs."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

from app.analytics.overview import (
    DateSelection,
    build_anomaly_summary,
    build_coverage_extremes_summary,
    build_day_briefing_summary,
    build_intraday_summary,
    build_period_comparison,
    build_period_summary,
    build_quality_summary,
    build_selection,
    build_time_window_payload,
    coverage_flag,
    format_hour_label,
    format_percent,
    format_signal,
)
from app.schemas.chat import ChatEvidenceItem, ChatQueryRequest, ChatQueryResponse

SUPPORTED_INTENTS = {
    "trend_summary",
    "period_comparison",
    "intraday_pattern",
    "anomaly_review",
    "data_quality_status",
    "coverage_extremes",
    "day_briefing",
    "metric_definition",
    "unsupported_request",
}


@dataclass(frozen=True, slots=True)
class QuestionContext:
    """Normalized chat question metadata used for deterministic orchestration."""

    question: str
    language: Literal["es", "en"]
    intent: str
    wants_explanation: bool
    selection: DateSelection
    extracted_dates: tuple[date, ...]


def _extract_dates(question: str) -> tuple[date, ...]:
    matches = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", question)
    return tuple(date.fromisoformat(match) for match in matches)


def _detect_language(question: str) -> Literal["es", "en"]:
    lowered = question.lower()
    spanish_markers = [
        "qué",
        "que ",
        "cómo",
        "como ",
        "hora",
        "horas",
        "calidad",
        "métrica",
        "anom",
        "cobertura",
        "día",
        "días",
        "por qué",
        "explica",
    ]
    return "es" if any(marker in lowered for marker in spanish_markers) else "en"


def _wants_explanation(question: str) -> bool:
    lowered = question.lower()
    markers = ["why", "por qué", "porque", "explica", "explain", "reason", "razón", "motivo"]
    return any(marker in lowered for marker in markers)


def _coverage_direction(question: str) -> Literal["lowest", "highest"]:
    lowered = question.lower()
    highest_markers = ["highest", "best", "mayor", "mejor", "más alta", "mas alta"]
    return "highest" if any(marker in lowered for marker in highest_markers) else "lowest"


def _is_day_briefing_question(question: str, extracted_dates: tuple[date, ...]) -> bool:
    if len(extracted_dates) != 1:
        return False
    lowered = question.lower()
    return any(
        marker in lowered
        for marker in [
            "what happened",
            "qué pasó",
            "que paso",
            "briefing",
            "brief",
            "summary",
            "resumen",
            "ese día",
            "that day",
        ]
    )


def _classify_intent(question: str) -> str:
    lowered = question.lower()
    extracted_dates = _extract_dates(question)
    if "metric" in lowered or "métrica" in lowered or "synthetic_monitoring" in lowered:
        return "metric_definition"
    unsupported_keywords = [
        "store",
        "stores",
        "tienda",
        "tiendas",
        "merchant",
        "city",
        "root cause",
        "merchant_id",
    ]
    if any(keyword in lowered for keyword in unsupported_keywords):
        return "unsupported_request"
    if _is_day_briefing_question(question, extracted_dates):
        return "day_briefing"
    if ("coverage" in lowered or "cobertura" in lowered) and any(
        keyword in lowered
        for keyword in [
            "lowest",
            "highest",
            "best",
            "worst",
            "menor",
            "mayor",
            "mejor",
            "peor",
            "days",
            "day",
            "día",
            "días",
        ]
    ):
        return "coverage_extremes"
    if any(
        keyword in lowered
        for keyword in [
            "quality",
            "calidad",
            "coverage",
            "cobertura",
            "gap",
            "duplic",
            "incomplete",
            "complete",
        ]
    ):
        return "data_quality_status"
    if any(
        keyword in lowered
        for keyword in ["anomaly", "anomal", "outlier", "desvi", "spike", "caída", "drop"]
    ):
        return "anomaly_review"
    if any(
        keyword in lowered
        for keyword in ["hour", "hours", "hora", "horas", "pattern", "patrón", "peak", "pico"]
    ):
        return "intraday_pattern"
    if len(extracted_dates) >= 2 and any(
        keyword in lowered for keyword in ["compare", "versus", "vs", "compar", "contra"]
    ):
        return "period_comparison"
    return "trend_summary"


def _build_selection_from_question(question: str) -> tuple[DateSelection, tuple[date, ...]]:
    dates = _extract_dates(question)
    if len(dates) >= 2:
        selection = build_selection(start_date=min(dates), end_date=max(dates))
    elif len(dates) == 1:
        selection = build_selection(start_date=dates[0], end_date=dates[0])
    else:
        selection = build_selection()
    return selection, dates


def _build_context(payload: ChatQueryRequest) -> QuestionContext:
    normalized_question = payload.question.strip()
    selection, extracted_dates = _build_selection_from_question(normalized_question)
    intent = _classify_intent(normalized_question)
    if intent not in SUPPORTED_INTENTS:
        intent = "unsupported_request"
    return QuestionContext(
        question=normalized_question,
        language=_detect_language(normalized_question),
        intent=intent,
        wants_explanation=_wants_explanation(normalized_question),
        selection=selection,
        extracted_dates=extracted_dates,
    )


def _evidence(label: str, value: str, source: str) -> ChatEvidenceItem:
    return ChatEvidenceItem(label=label, value=value, source=source)


def _reasoning_scope(context: QuestionContext, payload: ChatQueryRequest) -> str:
    extracted_date_labels = [item.isoformat() for item in context.extracted_dates]
    return (
        f"intent={context.intent}; extracted_dates={extracted_date_labels}; "
        f"use_llm={payload.use_llm}; allow_hypotheses={payload.allow_hypotheses}"
    )


def _explanation_scope_warning(language: Literal["es", "en"]) -> str:
    return (
        "Puedo describir el patrón y la evidencia del dato, pero no observo causalidad "
        "directa en este dataset."
        if language == "es"
        else (
            "I can describe the pattern and supporting evidence, but this dataset does "
            "not expose direct causality."
        )
    )


def _follow_up_questions(
    intent: str,
    language: Literal["es", "en"],
    *,
    target_date: date | None = None,
) -> list[str]:
    date_label = target_date.isoformat() if target_date is not None else "ese día"
    follow_ups_es = {
        "unsupported_request": [
            "¿Quiere que revise cobertura, anomalías o patrón horario en su lugar?",
            "¿Quiere que resuma los días con menor cobertura del rango observado?",
        ],
        "metric_definition": [
            "¿Quiere que le muestre los días más fuertes y más débiles de la señal?",
            "¿Quiere revisar el patrón intradiario típico de esta métrica?",
        ],
        "data_quality_status": [
            "¿Quiere que liste los días con menor cobertura?",
            "¿Quiere un briefing del día más incompleto del rango?",
        ],
        "coverage_extremes": [
            "¿Quiere un briefing detallado del día con menor cobertura?",
            "¿Quiere comparar esos días contra el período previo?",
        ],
        "day_briefing": [
            f"¿Quiere comparar {date_label} contra el día observado anterior?",
            "¿Quiere revisar si las anomalías horarias estuvieron alineadas con la cobertura?",
        ],
        "intraday_pattern": [
            "¿Quiere comparar el patrón horario entre dos fechas específicas?",
            "¿Quiere que revise si las horas bajas coinciden con anomalías?",
        ],
        "anomaly_review": [
            "¿Quiere un briefing del día donde apareció la anomalía principal?",
            "¿Quiere revisar la cobertura del rango donde se detectó esa anomalía?",
        ],
        "period_comparison": [
            "¿Quiere bajar el análisis al mejor y peor día del período actual?",
            "¿Quiere revisar cobertura y anomalías del período actual por separado?",
        ],
        "trend_summary": [
            "¿Quiere que baje el análisis al día más débil del rango?",
            "¿Quiere revisar el patrón horario típico del mismo período?",
        ],
    }
    follow_ups_en = {
        "unsupported_request": [
            "Do you want me to review coverage, anomalies, or hourly pattern instead?",
            "Do you want the lowest-coverage days in the observed range?",
        ],
        "metric_definition": [
            "Do you want the strongest and weakest observed days for this signal?",
            "Do you want the typical intraday pattern for this metric?",
        ],
        "data_quality_status": [
            "Do you want me to list the lowest-coverage days?",
            "Do you want a briefing for the most incomplete observed day?",
        ],
        "coverage_extremes": [
            "Do you want a detailed briefing for the lowest-coverage day?",
            "Do you want to compare those days against the prior period?",
        ],
        "day_briefing": [
            f"Do you want to compare {date_label} against the prior observed day?",
            "Do you want me to check whether hourly anomalies aligned with coverage?",
        ],
        "intraday_pattern": [
            "Do you want to compare the hourly profile across two specific dates?",
            "Do you want me to check whether low hours align with anomalies?",
        ],
        "anomaly_review": [
            "Do you want a briefing for the day where the main anomaly occurred?",
            "Do you want coverage details for the range where that anomaly was detected?",
        ],
        "period_comparison": [
            "Do you want me to drill into the best and weakest day of the current period?",
            "Do you want coverage and anomalies broken out for the current period?",
        ],
        "trend_summary": [
            "Do you want me to drill down into the weakest day in the range?",
            "Do you want the typical hourly pattern for the same period?",
        ],
    }
    follow_ups = follow_ups_es if language == "es" else follow_ups_en
    return follow_ups.get(intent, follow_ups["trend_summary"])


def _chat_response(
    *,
    context: QuestionContext,
    payload: ChatQueryRequest,
    answer: str,
    confidence: str,
    evidence: list[ChatEvidenceItem],
    warnings: list[str],
    source_tables: list[str],
    disclaimer: str,
    follow_up_intent: str | None = None,
    target_date: date | None = None,
    supported: bool = True,
) -> ChatQueryResponse:
    resolved_intent = follow_up_intent or context.intent
    return ChatQueryResponse(
        answer=answer,
        intent=context.intent,
        supported=supported,
        confidence=confidence,
        evidence=evidence,
        warnings=warnings,
        follow_up_questions=_follow_up_questions(
            resolved_intent,
            context.language,
            target_date=target_date,
        ),
        source_tables=source_tables,
        reasoning_scope=_reasoning_scope(context, payload),
        disclaimer=disclaimer,
        time_window=build_time_window_payload(context.selection) if supported else None,
    )


def _unsupported_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    answer = (
        (
            "Puedo ayudarle con lo que sí está soportado por el dashboard, pero no con "
            "preguntas por tienda, merchant o causa raíz porque ese nivel no existe en "
            "este dataset."
        )
        if context.language == "es"
        else (
            "I can help with what the dashboard truly supports, but not with store-level, "
            "merchant-level, or root-cause questions because that granularity is not present "
            "in this dataset."
        )
    )
    evidence = [
        _evidence(
            "Alcance analítico soportado"
            if context.language == "es"
            else "Supported analytical scope",
            "Solo serie temporal agregada"
            if context.language == "es"
            else "Aggregated time series only",
            "docs/DATA_DICTIONARY.md",
        )
    ]
    warnings = [
        (
            "Las preguntas por tienda o causalidad específica se rechazan "
            "intencionalmente."
        )
        if context.language == "es"
        else "Store-level or causal questions are intentionally rejected."
    ]
    disclaimer = (
        "El asistente está restringido a análisis agregados y grounded sobre data procesada."
        if context.language == "es"
        else "The assistant is constrained to aggregated, grounded analytics over processed data."
    )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence="high",
        evidence=evidence,
        warnings=warnings,
        source_tables=[
            "availability_daily.csv",
            "availability_hourly.csv",
            "availability_quality_report.json",
        ],
        disclaimer=disclaimer,
        follow_up_intent="unsupported_request",
        supported=False,
    )


def _metric_definition_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    warnings: list[str] = []
    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    answer = (
        (
            "Con lo que tengo hoy, trato `synthetic_monitoring_visible_stores` como una "
            "señal agregada observada. Sirve para análisis temporal y comparación de "
            "patrones, pero no para fijar una definición de negocio más fuerte sin "
            "validación adicional."
        )
        if context.language == "es"
        else (
            "With the evidence available today, I treat "
            "`synthetic_monitoring_visible_stores` as an observed aggregated signal. "
            "It is useful for temporal analytics and pattern comparison, but not for "
            "locking in a stronger business definition without additional validation."
        )
    )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence="high",
        evidence=[
            _evidence(
                "Identificador de métrica"
                if context.language == "es"
                else "Metric identifier",
                "synthetic_monitoring_visible_stores",
                "availability_quality_report.json",
            )
        ],
        warnings=warnings
        + [
            (
                "La semántica de negocio se mantiene deliberadamente prudente."
            )
            if context.language == "es"
            else "Business semantics remain intentionally cautious."
        ],
        source_tables=["availability_quality_report.json"],
        disclaimer=(
            "Los números provienen de analítica determinística sobre data procesada."
            if context.language == "es"
            else "Numbers come from deterministic analytics over processed data."
        ),
        follow_up_intent="metric_definition",
    )


def _quality_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    quality = build_quality_summary(context.selection)
    selected_coverage = float(quality["selected_coverage_ratio"])
    selected_flag = str(quality["selected_coverage_flag"])
    warnings: list[str] = []

    answer = (
        (
            f"Viendo el rango seleccionado, la cobertura observada es "
            f"{format_percent(selected_coverage)} y su nivel de confianza es "
            f"{selected_flag}. Además, el dataset completo arrastra "
            f"{quality['duplicate_window_groups']} grupos duplicados y "
            f"{quality['incomplete_window_records']} ventanas incompletas."
        )
        if context.language == "es"
        else (
            f"Looking at the selected range, observed coverage is "
            f"{format_percent(selected_coverage)} with {selected_flag} confidence. "
            f"The full dataset also carries {quality['duplicate_window_groups']} "
            f"duplicate groups and {quality['incomplete_window_records']} incomplete windows."
        )
    )
    if selected_flag != "high":
        warnings.append(
            "La cobertura no es alta para el rango seleccionado."
            if context.language == "es"
            else "Coverage is not high for the selected range."
        )
    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence="high" if selected_flag == "high" else "medium",
        evidence=[
            _evidence(
                "Cobertura del rango" if context.language == "es" else "Selected coverage",
                format_percent(selected_coverage),
                "availability_daily.csv",
            ),
            _evidence(
                "Grupos duplicados" if context.language == "es" else "Duplicate window groups",
                str(quality["duplicate_window_groups"]),
                "availability_quality_report.json",
            ),
            _evidence(
                "Ventanas incompletas" if context.language == "es" else "Incomplete windows",
                str(quality["incomplete_window_records"]),
                "availability_quality_report.json",
            ),
        ],
        warnings=warnings,
        source_tables=["availability_daily.csv", "availability_quality_report.json"],
        disclaimer=(
            "La calidad se calcula de forma determinística y limita qué tan fuerte puede "
            "ser la interpretación."
            if context.language == "es"
            else (
                "Quality is computed deterministically and limits how strong any "
                "interpretation can be."
            )
        ),
        follow_up_intent="data_quality_status",
    )


def _coverage_extremes_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    summary = build_coverage_extremes_summary(context.selection, limit=3)
    direction = _coverage_direction(context.question)
    key = "highest_coverage_days" if direction == "highest" else "lowest_coverage_days"
    extreme_days = summary[key]
    warnings: list[str] = []
    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    if not extreme_days:
        answer = (
            "No encontré días suficientes para resumir extremos de cobertura."
            if context.language == "es"
            else "I did not find enough days to summarize coverage extremes."
        )
        confidence = "medium"
    else:
        day_summary = "; ".join(
            f"{item['date']}: {format_percent(float(item['coverage_ratio']))}"
            for item in extreme_days
        )
        answer = (
            (
                f"Revisando la cobertura del rango, los días con "
                f"{'mayor' if direction == 'highest' else 'menor'} cobertura son "
                f"{day_summary}."
            )
            if context.language == "es"
            else (
                f"Looking at coverage across the selected range, the days with the "
                f"{'highest' if direction == 'highest' else 'lowest'} coverage are "
                f"{day_summary}."
            )
        )
        confidence = "high"

    evidence = [
        _evidence(
            (
                "Cobertura más alta" if direction == "highest" else "Cobertura más baja"
            )
            if context.language == "es"
            else ("Highest coverage day" if direction == "highest" else "Lowest coverage day"),
            (
                f"{extreme_days[0]['date']} | "
                f"{format_percent(float(extreme_days[0]['coverage_ratio']))}"
            )
            if extreme_days
            else "-",
            "availability_daily.csv",
        )
    ]
    for item in extreme_days[1:3]:
        evidence.append(
            _evidence(
                "Día adicional" if context.language == "es" else "Additional day",
                f"{item['date']} | {format_percent(float(item['coverage_ratio']))}",
                "availability_daily.csv",
            )
        )

    target_date = extreme_days[0]["date"] if extreme_days else None
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=confidence,
        evidence=evidence,
        warnings=warnings,
        source_tables=["availability_daily.csv"],
        disclaimer=(
            "La cobertura se calcula como puntos observados sobre puntos esperados dentro "
            "del rango seleccionado."
            if context.language == "es"
            else (
                "Coverage is computed as observed points over expected points inside the "
                "selected range."
            )
        ),
        follow_up_intent="coverage_extremes",
        target_date=target_date,
    )


def _day_briefing_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    target_date = context.selection.effective_start
    briefing = build_day_briefing_summary(target_date=target_date)
    warnings = list(briefing["cautions"])
    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    summary = str(briefing["summary"])
    answer = (
        f"Revisé el {briefing['target_date']}. {summary}"
        if context.language == "es"
        else f"I reviewed {briefing['target_date']}. {summary}"
    )

    evidence = [
        _evidence(
            "Señal media del día" if context.language == "es" else "Mean signal for the day",
            str(briefing["formatted_mean_signal"]),
            "availability_daily.csv",
        ),
        _evidence(
            "Cobertura del día" if context.language == "es" else "Coverage for the day",
            format_percent(float(briefing["coverage_ratio"])),
            "availability_daily.csv",
        ),
        _evidence(
            "Hora más fuerte" if context.language == "es" else "Strongest hour",
            str(briefing["strongest_hour"]["label"]),
            "availability_hourly.csv",
        ),
    ]
    top_anomalies = list(briefing["top_anomalies"])
    if top_anomalies:
        top_anomaly = top_anomalies[0]
        evidence.append(
            _evidence(
                "Anomalía principal" if context.language == "es" else "Top anomaly",
                (
                    f"{top_anomaly['date']} "
                    f"{format_hour_label(int(top_anomaly['hour']))} "
                    f"| z={float(top_anomaly['zscore']):.2f}"
                ),
                "availability_hourly_anomalies.csv",
            )
        )

    disclaimer = (
        "El briefing combina señal diaria, patrón horario, anomalías y cobertura del mismo día."
        if context.language == "es"
        else (
            "The briefing combines daily signal, hourly pattern, anomalies, and coverage "
            "for the same day."
        )
    )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=str(briefing["confidence"]),
        evidence=evidence,
        warnings=warnings,
        source_tables=[
            "availability_daily.csv",
            "availability_hourly.csv",
            "availability_hourly_anomalies.csv",
        ],
        disclaimer=disclaimer,
        follow_up_intent="day_briefing",
        target_date=target_date,
    )


def _intraday_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    intraday = build_intraday_summary(context.selection)
    peak_hour = intraday["peak_hour"]
    low_hour = intraday["low_hour"]
    peak_hour_label = format_hour_label(int(peak_hour["hour"]))
    low_hour_label = format_hour_label(int(low_hour["hour"]))

    warnings: list[str] = []
    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    answer = (
        (
            f"Mirando el patrón horario del rango, el nivel medio más alto aparece "
            f"alrededor de las {peak_hour_label} y el más bajo alrededor de las "
            f"{low_hour_label}."
        )
        if context.language == "es"
        else (
            f"Looking at the hourly profile of the selected range, the signal peaks "
            f"around {peak_hour_label} and is lowest around {low_hour_label}."
        )
    )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence="high",
        evidence=[
            _evidence(
                "Hora pico típica" if context.language == "es" else "Typical peak hour",
                f"{peak_hour_label} ({format_signal(float(peak_hour['mean_signal']))})",
                "availability_hourly.csv",
            ),
            _evidence(
                "Hora baja típica" if context.language == "es" else "Typical low hour",
                f"{low_hour_label} ({format_signal(float(low_hour['mean_signal']))})",
                "availability_hourly.csv",
            ),
        ],
        warnings=warnings,
        source_tables=["availability_hourly.csv"],
        disclaimer=(
            "El patrón intradiario se deriva de agregación horaria determinística."
            if context.language == "es"
            else "The intraday pattern comes from deterministic hourly aggregation."
        ),
        follow_up_intent="intraday_pattern",
    )


def _anomaly_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    anomaly_summary = build_anomaly_summary(context.selection)
    anomalies = anomaly_summary["anomalies"]
    warnings: list[str] = []

    if not anomalies:
        answer = (
            "No vi anomalías horarias destacadas en el rango seleccionado."
            if context.language == "es"
            else "I did not see highlighted hourly anomalies in the selected range."
        )
        confidence = "medium"
        evidence: list[ChatEvidenceItem] = []
        target_date = None
    else:
        top = anomalies[0]
        top_hour_label = format_hour_label(int(top["hour"]))
        target_date = top["date"]
        answer = (
            (
                f"La anomalía más fuerte del rango aparece el {top['date']} a las "
                f"{top_hour_label}, con z-score {top['zscore']:.2f} y cobertura "
                f"{top['coverage_flag']}."
            )
            if context.language == "es"
            else (
                f"The strongest anomaly in the selected range appears on {top['date']} at "
                f"{top_hour_label}, with z-score {top['zscore']:.2f} and "
                f"{top['coverage_flag']} coverage."
            )
        )
        evidence = [
            _evidence(
                "Anomalía principal" if context.language == "es" else "Top anomaly",
                f"{top['date']} {top_hour_label} | z={top['zscore']:.2f}",
                "availability_hourly_anomalies.csv",
            )
        ]
        if int(anomaly_summary["non_gap_step_changes"]) > 0:
            evidence.append(
                _evidence(
                    "Saltos sin gap/reset"
                    if context.language == "es"
                    else "Non-gap step changes",
                    str(anomaly_summary["non_gap_step_changes"]),
                    "availability_step_changes.csv",
                )
            )
        confidence = str(top["confidence"])
        if top["confidence"] != "high":
            warnings.append(
                (
                    "La anomalía principal debe leerse con cautela porque su soporte no "
                    "es completamente fuerte."
                )
                if context.language == "es"
                else (
                    "The top anomaly should be read with caution because its support is "
                    "not fully strong."
                )
            )

    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=confidence,
        evidence=evidence,
        warnings=warnings,
        source_tables=["availability_hourly_anomalies.csv", "availability_step_changes.csv"],
        disclaimer=(
            "Las anomalías se detectan contra un baseline horario y deben leerse junto a "
            "la cobertura."
            if context.language == "es"
            else (
                "Anomalies are detected against an hourly baseline and should be read "
                "alongside coverage."
            )
        ),
        follow_up_intent="anomaly_review",
        target_date=target_date,
    )


def _period_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    comparison = (
        build_period_comparison(context.selection)
        if context.intent == "period_comparison"
        else None
    )
    summary = comparison["current"] if comparison else build_period_summary(context.selection)
    mean_signal = float(summary["mean_signal"])
    selected_coverage = float(summary["coverage_ratio"])
    warnings: list[str] = []

    if context.intent == "period_comparison" and comparison["comparison"] is not None:
        previous_signal = float(comparison["comparison"]["mean_signal"])
        delta_pct = (
            ((mean_signal - previous_signal) / previous_signal) * 100 if previous_signal else 0.0
        )
        answer = (
            (
                f"Comparando los períodos que me pidió, el nivel medio de señal cambió "
                f"{delta_pct:+.1f}%. El período actual tiene cobertura "
                f"{format_percent(selected_coverage)}."
            )
            if context.language == "es"
            else (
                f"Across the periods you asked for, the mean signal changed by "
                f"{delta_pct:+.1f}%. The current period has "
                f"{format_percent(selected_coverage)} observed coverage."
            )
        )
        evidence = [
            _evidence(
                "Señal media actual"
                if context.language == "es"
                else "Current mean signal",
                format_signal(mean_signal),
                "availability_daily.csv",
            ),
            _evidence(
                "Señal media previa"
                if context.language == "es"
                else "Previous mean signal",
                format_signal(previous_signal),
                "availability_daily.csv",
            ),
        ]
    else:
        answer = (
            (
                f"Con el rango que tengo seleccionado, la señal media es "
                f"{format_signal(mean_signal)} con cobertura observada de "
                f"{format_percent(selected_coverage)}. El día más fuerte es "
                f"{summary['best_day'].date.isoformat()} y el más débil es "
                f"{summary['weakest_day'].date.isoformat()}."
            )
            if context.language == "es"
            else (
                f"For the selected range, the mean signal is {format_signal(mean_signal)} "
                f"with {format_percent(selected_coverage)} observed coverage. The "
                f"strongest day is {summary['best_day'].date.isoformat()} and the weakest "
                f"day is {summary['weakest_day'].date.isoformat()}."
            )
        )
        evidence = [
            _evidence(
                "Señal media" if context.language == "es" else "Mean signal",
                format_signal(mean_signal),
                "availability_daily.csv",
            ),
            _evidence(
                "Cobertura" if context.language == "es" else "Coverage",
                format_percent(selected_coverage),
                "availability_daily.csv",
            ),
            _evidence(
                "Día más fuerte" if context.language == "es" else "Strongest day",
                summary["best_day"].date.isoformat(),
                "availability_daily.csv",
            ),
        ]

    confidence = coverage_flag(selected_coverage)
    if confidence != "high":
        warnings.append(
            "La cobertura del rango seleccionado no es alta."
            if context.language == "es"
            else "Coverage for the selected range is not high."
        )
    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=confidence,
        evidence=evidence,
        warnings=warnings,
        source_tables=["availability_daily.csv"],
        disclaimer=(
            "Los números provienen de analítica determinística sobre data procesada."
            if context.language == "es"
            else (
                "Numbers come from deterministic analytics over processed data. Language "
                "stays grounded to the supported scope."
            )
        ),
        follow_up_intent=context.intent,
    )


def compose_grounded_response(payload: ChatQueryRequest) -> ChatQueryResponse:
    """Return a structured grounded response from deterministic analytics."""
    context = _build_context(payload)
    if context.intent == "unsupported_request":
        return _unsupported_response(context, payload)
    if context.intent == "metric_definition":
        return _metric_definition_response(context, payload)
    if context.intent == "data_quality_status":
        return _quality_response(context, payload)
    if context.intent == "coverage_extremes":
        return _coverage_extremes_response(context, payload)
    if context.intent == "day_briefing":
        return _day_briefing_response(context, payload)
    if context.intent == "intraday_pattern":
        return _intraday_response(context, payload)
    if context.intent == "anomaly_review":
        return _anomaly_response(context, payload)
    return _period_response(context, payload)
