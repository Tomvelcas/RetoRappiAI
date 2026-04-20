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
    build_daily_coverage_profile_summary,
    build_day_briefing_summary,
    build_hourly_coverage_profile_summary,
    build_hourly_coverage_summary,
    build_intraday_summary,
    build_period_comparison,
    build_period_summary,
    build_quality_summary,
    build_selection,
    build_time_window_payload,
    build_weekday_weekend_summary,
    coverage_flag,
    format_hour_label,
    format_percent,
    format_signal,
    get_observed_dataset_window,
)
from app.chat.brain import BrainPlan
from app.chat.composer import ComposerInput, compose_answer, compose_follow_ups
from app.schemas.chat import (
    ChatArtifact,
    ChatArtifactCard,
    ChatArtifactPoint,
    ChatEvidenceItem,
    ChatQueryRequest,
    ChatQueryResponse,
)

SUPPORTED_INTENTS = {
    "trend_summary",
    "period_comparison",
    "intraday_pattern",
    "hourly_coverage_lookup",
    "hourly_coverage_profile",
    "daily_coverage_profile",
    "anomaly_review",
    "data_quality_status",
    "coverage_extremes",
    "day_briefing",
    "weekday_weekend_comparison",
    "weekend_coverage_report",
    "metric_definition",
    "unsupported_request",
}

MONTH_ALIASES = {
    "jan": 1,
    "january": 1,
    "enero": 1,
    "feb": 2,
    "february": 2,
    "febrero": 2,
    "mar": 3,
    "march": 3,
    "marzo": 3,
    "apr": 4,
    "april": 4,
    "abril": 4,
    "may": 5,
    "mayo": 5,
    "jun": 6,
    "june": 6,
    "junio": 6,
    "jul": 7,
    "july": 7,
    "julio": 7,
    "aug": 8,
    "august": 8,
    "agosto": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "septiembre": 9,
    "oct": 10,
    "october": 10,
    "octubre": 10,
    "nov": 11,
    "november": 11,
    "noviembre": 11,
    "dec": 12,
    "december": 12,
    "diciembre": 12,
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
    output_intent: Literal["answer", "chart", "report", "conclusions"] = "answer"
    brain_mode: Literal["deterministic", "deterministic_artifact", "hybrid"] = "deterministic"
    inherited_context: bool = False
    planner_notes: tuple[str, ...] = ()


def _observed_default_year() -> int:
    observed_start, observed_end = get_observed_dataset_window()
    return observed_end.year if observed_start.year != observed_end.year else observed_start.year


def _month_number(value: str) -> int | None:
    return MONTH_ALIASES.get(value.lower().strip().rstrip("."))


def _question_tokens(question: str) -> tuple[str, ...]:
    trimmed = (
        fragment.strip(".,;:!?()[]{}\"'")
        for fragment in question.replace(",", " ").split()
    )
    return tuple(token.lower() for token in trimmed if token)


def _safe_int(value: str) -> int | None:
    try:
        return int(value)
    except ValueError:
        return None


def _register_date(
    candidates: dict[str, date],
    *,
    year_value: int,
    month_value: int | None,
    day_value: int | None,
) -> None:
    if month_value is None or day_value is None:
        return
    try:
        resolved_date = date(year_value, month_value, day_value)
    except ValueError:
        return
    candidates[resolved_date.isoformat()] = resolved_date


def _natural_language_dates(question: str) -> tuple[date, ...]:
    candidates: dict[str, date] = {}
    default_year = _observed_default_year()
    tokens = _question_tokens(question)

    for index, token in enumerate(tokens):
        day_value = _safe_int(token)
        if day_value is not None:
            _register_day_first_natural_date(
                candidates,
                tokens=tokens,
                index=index,
                day_value=day_value,
                default_year=default_year,
            )
            continue

        _register_month_first_natural_date(
            candidates,
            tokens=tokens,
            index=index,
            default_year=default_year,
        )

    return tuple(candidates.values())


def _register_day_first_natural_date(
    candidates: dict[str, date],
    *,
    tokens: tuple[str, ...],
    index: int,
    day_value: int,
    default_year: int,
) -> None:
    if index + 2 < len(tokens) and tokens[index + 1] == "de":
        year_value = _natural_date_year(tokens, index + 3, default_year, require_de=True)
        _register_date(
            candidates,
            year_value=year_value,
            month_value=_month_number(tokens[index + 2]),
            day_value=day_value,
        )

    if index + 1 >= len(tokens):
        return

    year_value = _natural_date_year(tokens, index + 2, default_year)
    _register_date(
        candidates,
        year_value=year_value,
        month_value=_month_number(tokens[index + 1]),
        day_value=day_value,
    )


def _register_month_first_natural_date(
    candidates: dict[str, date],
    *,
    tokens: tuple[str, ...],
    index: int,
    default_year: int,
) -> None:
    if index + 1 >= len(tokens):
        return

    _register_date(
        candidates,
        year_value=_natural_date_year(tokens, index + 2, default_year),
        month_value=_month_number(tokens[index]),
        day_value=_safe_int(tokens[index + 1]),
    )


def _natural_date_year(
    tokens: tuple[str, ...],
    index: int,
    default_year: int,
    *,
    require_de: bool = False,
) -> int:
    if require_de:
        if index + 1 >= len(tokens) or tokens[index] != "de":
            return default_year
        year_value = _safe_int(tokens[index + 1])
        return int(year_value) if year_value is not None else default_year

    if index >= len(tokens):
        return default_year
    year_value = _safe_int(tokens[index])
    return int(year_value) if year_value is not None else default_year


def _extract_dates(question: str) -> tuple[date, ...]:
    matches = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", question)
    extracted: dict[str, date] = {
        resolved.isoformat(): resolved for resolved in _natural_language_dates(question)
    }
    for match in matches:
        resolved = date.fromisoformat(match)
        extracted[resolved.isoformat()] = resolved
    return tuple(sorted(extracted.values()))


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


def _asks_action_guidance(question: str) -> bool:
    lowered = question.lower()
    return any(
        marker in lowered
        for marker in [
            "decision",
            "decisión",
            "accion",
            "acción",
            "qué puedo concluir",
            "que puedo concluir",
            "concluir",
            "what should i do",
            "what can i conclude",
            "what decision",
        ]
    )


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


def _is_hourly_coverage_question(question: str, extracted_dates: tuple[date, ...]) -> bool:
    lowered = question.lower()
    has_hour_marker = any(marker in lowered for marker in ["hour", "hours", "hora", "horas"])
    has_coverage_marker = any(marker in lowered for marker in ["coverage", "cobertura"])
    has_extreme_marker = any(
        marker in lowered
        for marker in ["lowest", "highest", "best", "worst", "menor", "mayor", "mejor", "peor"]
    )
    asks_for_typical_pattern = any(
        marker in lowered
        for marker in [
            "usual",
            "usually",
            "typical",
            "pattern",
            "patrón",
            "suelen",
            "tipico",
            "típico",
        ]
    )
    return (
        has_hour_marker
        and has_coverage_marker
        and has_extreme_marker
        and not asks_for_typical_pattern
        and len(extracted_dates) >= 1
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
    if _is_hourly_coverage_question(question, extracted_dates):
        return "hourly_coverage_lookup"
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


def _build_context(
    payload: ChatQueryRequest,
    plan: BrainPlan | None = None,
) -> QuestionContext:
    normalized_question = payload.question.strip()
    selection, extracted_dates = _build_selection_from_question(normalized_question)
    intent = _classify_intent(normalized_question)
    output_intent: Literal["answer", "chart", "report", "conclusions"] = "answer"
    brain_mode: Literal["deterministic", "deterministic_artifact", "hybrid"] = "deterministic"
    inherited_context = False
    planner_notes: tuple[str, ...] = ()
    if plan is not None:
        selection = plan.selection
        extracted_dates = plan.extracted_dates
        intent = plan.intent
        output_intent = plan.output_intent
        brain_mode = plan.brain_mode
        inherited_context = plan.inherited_context
        planner_notes = plan.notes
    if intent not in SUPPORTED_INTENTS:
        intent = "unsupported_request"
    return QuestionContext(
        question=normalized_question,
        language=_detect_language(normalized_question),
        intent=intent,
        wants_explanation=_wants_explanation(normalized_question),
        selection=selection,
        extracted_dates=extracted_dates,
        output_intent=output_intent,
        brain_mode=brain_mode,
        inherited_context=inherited_context,
        planner_notes=planner_notes,
    )


def _evidence(label: str, value: str, source: str) -> ChatEvidenceItem:
    return ChatEvidenceItem(label=label, value=value, source=source)


def _reasoning_scope(context: QuestionContext, payload: ChatQueryRequest) -> str:
    extracted_date_labels = [item.isoformat() for item in context.extracted_dates]
    return (
        f"intent={context.intent}; extracted_dates={extracted_date_labels}; "
        f"output_intent={context.output_intent}; brain_mode={context.brain_mode}; "
        f"inherited_context={context.inherited_context}; "
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
    analysis_steps: list[str] | None = None,
    artifacts: list[ChatArtifact] | None = None,
    follow_up_intent: str | None = None,
    target_date: date | None = None,
    supported: bool = True,
) -> ChatQueryResponse:
    resolved_intent = follow_up_intent or context.intent
    composer_input = ComposerInput(
        question=context.question,
        language=context.language,
        intent=resolved_intent,
        output_intent=context.output_intent,
        confidence=confidence,
        supported=supported,
        draft_answer=answer,
        evidence=evidence,
        warnings=warnings,
        analysis_steps=analysis_steps or [],
        artifacts=artifacts or [],
        inherited_context=context.inherited_context,
        target_date=target_date,
    )
    return ChatQueryResponse(
        answer=compose_answer(composer_input),
        intent=context.intent,
        supported=supported,
        confidence=confidence,
        analysis_steps=analysis_steps or [],
        evidence=evidence,
        artifacts=artifacts or [],
        warnings=warnings,
        follow_up_questions=compose_follow_ups(composer_input),
        source_tables=source_tables,
        reasoning_scope=_reasoning_scope(context, payload),
        disclaimer=disclaimer,
        time_window=build_time_window_payload(context.selection) if supported else None,
    )


def _pp_label(value: float) -> str:
    return f"{value * 100:+.2f} pp"


def _hourly_profile_point_tone(
    *,
    coverage_flag: str,
    hour: int,
    strongest_hour: int,
) -> Literal["accent", "muted", "warning"]:
    if coverage_flag == "low":
        return "warning"
    if hour == strongest_hour:
        return "accent"
    return "muted"


def _daily_profile_point_tone(
    *,
    item_date: str,
    strongest_date: str,
    weakest_date: str,
) -> Literal["accent", "muted", "warning"]:
    if item_date == weakest_date:
        return "warning"
    if item_date == strongest_date:
        return "accent"
    return "muted"


def _hourly_coverage_artifact(
    *,
    context: QuestionContext,
    summary: dict[str, object],
) -> ChatArtifact:
    focus_bucket = summary["focus_bucket"]
    runner_up_bucket = summary["runner_up_bucket"]
    median_ratio = float(summary["selection_median_coverage_ratio"])
    direction = str(summary["direction"])
    comparison_label = (
        "Brecha vs. hora siguiente" if context.language == "es" else "Gap vs next hour"
    )
    if direction == "highest":
        comparison_label = (
            "Brecha vs. hora siguiente más alta"
            if context.language == "es"
            else "Gap vs next-highest hour"
        )
    cards = [
        ChatArtifactCard(
            label="Hora foco" if context.language == "es" else "Focus hour",
            value=(
                f"{focus_bucket['label']} · "
                f"{format_percent(float(focus_bucket['coverage_ratio']))}"
            ),
            detail=(
                f"{focus_bucket['n_points']} / 360 muestras observadas"
                if context.language == "es"
                else f"{focus_bucket['n_points']} / 360 observed samples"
            ),
            tone="warning" if str(focus_bucket["coverage_flag"]) == "low" else "accent",
        ),
        ChatArtifactCard(
            label="Mediana del día" if context.language == "es" else "Day median",
            value=format_percent(median_ratio),
            detail=_pp_label(float(summary["coverage_gap_vs_median"])),
        ),
        ChatArtifactCard(
            label="Posición global" if context.language == "es" else "Global position",
            value=f"{summary['global_rank']} / {summary['global_bucket_count']}",
            detail=(
                "ranking entre buckets horarios observados"
                if context.language == "es"
                else "ranking across observed hourly buckets"
            ),
            tone="muted",
        ),
    ]
    if runner_up_bucket is not None and summary["coverage_gap_vs_runner_up"] is not None:
        cards.append(
            ChatArtifactCard(
                label=comparison_label,
                value=_pp_label(float(summary["coverage_gap_vs_runner_up"])),
                detail=(
                    f"{runner_up_bucket['label']} · "
                    f"{format_percent(float(runner_up_bucket['coverage_ratio']))}"
                ),
                tone="muted",
            )
        )

    points = [
        ChatArtifactPoint(
            label=str(item["label"]),
            value=float(item["coverage_ratio"]),
            formatted_value=format_percent(float(item["coverage_ratio"])),
            detail=f"{item['n_points']} / 360",
            highlight=bool(item["highlight"]),
            tone="warning" if str(item["coverage_flag"]) == "low" else "accent",
        )
        for item in summary["profile"]
    ]

    return ChatArtifact(
        kind="hourly_coverage_chart",
        title=(
            f"Cobertura por hora en {focus_bucket['date']}"
            if context.language == "es"
            else f"Hourly coverage on {focus_bucket['date']}"
        ),
        subtitle=(
            "Cada barra usa puntos observados / 360 esperados."
            if context.language == "es"
            else "Each bar uses observed points / 360 expected samples."
        ),
        cards=cards,
        points=points,
        footnote=str(summary["boundary_note"] or summary["coverage_formula"]),
    )


def _bar_chart_artifact(
    *,
    context: QuestionContext,
    title: str,
    subtitle: str,
    cards: list[ChatArtifactCard],
    points: list[dict[str, object]],
    footnote: str | None = None,
) -> ChatArtifact:
    """Build a generic bar chart artifact for richer conversational answers."""
    artifact_points = [
        ChatArtifactPoint(
            label=str(item["label"]),
            value=float(item["value"]),
            formatted_value=str(item["formatted_value"]),
            detail=str(item["detail"]) if item.get("detail") is not None else None,
            highlight=bool(item.get("highlight", False)),
            tone=str(item.get("tone", "default")),
        )
        for item in points
    ]
    return ChatArtifact(
        kind="bar_chart",
        title=title,
        subtitle=subtitle,
        cards=cards,
        points=artifact_points,
        footnote=footnote,
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


def _hourly_coverage_lookup_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    direction = _coverage_direction(context.question)
    summary = build_hourly_coverage_summary(context.selection, direction=direction)
    focus_bucket = summary["focus_bucket"]
    runner_up_bucket = summary["runner_up_bucket"]
    focus_ratio = float(focus_bucket["coverage_ratio"])
    median_ratio = float(summary["selection_median_coverage_ratio"])
    target_hour_label = f"{focus_bucket['label']}-{int(focus_bucket['hour']):02d}:59"
    comparison_direction = "menor" if direction == "lowest" else "mayor"
    if context.language != "es":
        comparison_direction = "lowest" if direction == "lowest" else "highest"
    runner_up_text = ""
    if runner_up_bucket is not None:
        runner_up_label = f"{runner_up_bucket['label']}-{int(runner_up_bucket['hour']):02d}:59"
        runner_up_ratio = format_percent(float(runner_up_bucket["coverage_ratio"]))
        runner_up_text = (
            f" La siguiente hora comparable fue {runner_up_label}, con {runner_up_ratio}."
            if context.language == "es"
            else f" The next comparable hour was {runner_up_label}, at {runner_up_ratio}."
        )
    boundary_note = str(summary["boundary_note"] or "")
    boundary_text = ""
    if boundary_note:
        boundary_text = (
            " Además, esa hora cae exactamente en el cierre observado del dataset, así que "
            "debe leerse como un bucket truncado."
            if context.language == "es"
            else (
                " It also lands on the observed dataset close, so it should be read as a "
                "truncated bucket."
            )
        )

    answer = (
        (
            f"Filtré los buckets horarios del {focus_bucket['date']} y ordené su cobertura "
            f"como puntos observados sobre 360 esperados por hora. La hora con "
            f"{comparison_direction} cobertura fue {target_hour_label}, con "
            f"{format_percent(focus_ratio)} ({focus_bucket['n_points']} de 360 puntos). "
            f"En ese mismo día la mediana horaria fue {format_percent(median_ratio)}, así "
            f"que esta hora quedó {_pp_label(focus_ratio - median_ratio)} frente al patrón "
            f"del día.{runner_up_text} En el dataset completo ocupa el puesto "
            f"{summary['global_rank']} de {summary['global_bucket_count']} buckets horarios."
            f"{boundary_text}"
        )
        if context.language == "es"
        else (
            f"I filtered hourly buckets for {focus_bucket['date']} and ranked coverage as "
            f"observed points over 360 expected samples per hour. The {comparison_direction} "
            f"coverage hour was {target_hour_label}, at {format_percent(focus_ratio)} "
            f"({focus_bucket['n_points']} of 360 points). The same-day hourly median was "
            f"{format_percent(median_ratio)}, so this bucket sits "
            f"{_pp_label(focus_ratio - median_ratio)} "
            f"from that day pattern.{runner_up_text} Across the full dataset it ranks "
            f"{summary['global_rank']} of {summary['global_bucket_count']} observed hourly buckets."
            f"{boundary_text}"
        )
    )

    warnings: list[str] = []
    if boundary_note:
        warnings.append(
            (
                "La hora foco coincide con un borde del rango observado y se comporta "
                "como un bucket truncado."
            )
            if context.language == "es"
            else (
                "The focus hour lands on an observed-range boundary and behaves like a "
                "truncated bucket."
            )
        )
    if context.wants_explanation:
        warnings.append(_explanation_scope_warning(context.language))

    evidence = [
        _evidence(
            "Hora foco" if context.language == "es" else "Focus hour",
            (
                f"{target_hour_label} | {format_percent(focus_ratio)} | "
                f"{focus_bucket['n_points']} / 360"
            ),
            "availability_hourly.csv",
        ),
        _evidence(
            "Mediana horaria del día" if context.language == "es" else "Same-day hourly median",
            format_percent(median_ratio),
            "availability_hourly.csv",
        ),
        _evidence(
            "Posición global" if context.language == "es" else "Global rank",
            f"{summary['global_rank']} / {summary['global_bucket_count']}",
            "availability_hourly.csv",
        ),
    ]
    if runner_up_bucket is not None:
        evidence.append(
            _evidence(
                "Siguiente hora comparable"
                if context.language == "es"
                else "Next comparable hour",
                (
                    f"{runner_up_bucket['label']}-{int(runner_up_bucket['hour']):02d}:59 | "
                    f"{format_percent(float(runner_up_bucket['coverage_ratio']))}"
                ),
                "availability_hourly.csv",
            )
        )
    if boundary_note:
        evidence.append(
            _evidence(
                "Contexto de borde" if context.language == "es" else "Boundary context",
                boundary_note,
                "availability_quality_report.json",
            )
        )

    analysis_steps = [
        (
            f"Tomé las filas horarias de {focus_bucket['date']}."
            if context.language == "es"
            else f"I filtered hourly rows for {focus_bucket['date']}."
        ),
        (
            "Calculé cobertura por hora como puntos observados / 360 esperados."
            if context.language == "es"
            else "I computed hourly coverage as observed points / 360 expected samples."
        ),
        (
            f"Ordené las horas por cobertura y tomé la {comparison_direction}."
            if context.language == "es"
            else (
                "I ranked the hour buckets by coverage and selected the "
                f"{comparison_direction} one."
            )
        ),
        (
            "Comparé esa hora contra la mediana del mismo día y contra el ranking global."
            if context.language == "es"
            else "I compared that bucket with the same-day median and the global hourly ranking."
        ),
    ]

    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=str(focus_bucket["coverage_flag"]),
        analysis_steps=analysis_steps,
        evidence=evidence,
        artifacts=[_hourly_coverage_artifact(context=context, summary=summary)],
        warnings=warnings,
        source_tables=["availability_hourly.csv", "availability_quality_report.json"],
        disclaimer=(
            "La hora sale de agregación horaria determinística. La cobertura mide puntos "
            "observados frente a 360 muestras esperadas por hora."
            if context.language == "es"
            else (
                "The answer comes from deterministic hourly aggregation. Coverage measures "
                "observed points against 360 expected ten-second samples per hour."
            )
        ),
        follow_up_intent="hourly_coverage_lookup",
        target_date=focus_bucket["date"],
    )


def _hourly_coverage_profile_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    summary = build_hourly_coverage_profile_summary(context.selection)
    strongest_hour = summary["strongest_hour"]
    weakest_hour = summary["weakest_hour"]
    sample_count = int(summary["selection_bucket_count"])
    if context.output_intent == "conclusions":
        answer = (
            (
                f"Las conclusiones más claras del perfil horario son dos: la franja más "
                f"estable cae en {strongest_hour['label']} con "
                f"{format_percent(float(strongest_hour['coverage_ratio']))}, mientras que "
                f"la más frágil cae en {weakest_hour['label']} con "
                f"{format_percent(float(weakest_hour['coverage_ratio']))}. Eso sugiere que "
                "la cobertura no es plana a lo largo del día y que las horas débiles "
                "merecen seguimiento separado."
            )
            if context.language == "es"
            else (
                "The clearest takeaways from the hourly profile are twofold: the most "
                f"stable slot lands at {strongest_hour['label']} with "
                f"{format_percent(float(strongest_hour['coverage_ratio']))}, while the "
                f"weakest one lands at {weakest_hour['label']} with "
                f"{format_percent(float(weakest_hour['coverage_ratio']))}. That suggests "
                "coverage is not flat across the day and the weakest hours deserve their "
                "own follow-up."
            )
        )
    else:
        answer = (
            (
                f"Agregué la cobertura horaria del rango seleccionado y la resumí como puntos "
                f"observados sobre 360 esperados por hora. La hora mejor cubierta es "
                f"{strongest_hour['label']} con "
                f"{format_percent(float(strongest_hour['coverage_ratio']))}, "
                f"mientras que la más frágil es {weakest_hour['label']} con "
                f"{format_percent(float(weakest_hour['coverage_ratio']))}. El gráfico adjunto "
                "muestra esa curva completa por hora."
            )
            if context.language == "es"
            else (
                "I aggregated hourly coverage across the selected range and summarized it as "
                "observed points over 360 expected samples per hour. The best-covered hour is "
                f"{strongest_hour['label']} at "
                f"{format_percent(float(strongest_hour['coverage_ratio']))}, "
                f"while the weakest one is {weakest_hour['label']} at "
                f"{format_percent(float(weakest_hour['coverage_ratio']))}. The attached chart "
                "shows the full hourly curve."
            )
        )
    evidence = [
        _evidence(
            "Hora más estable" if context.language == "es" else "Best-covered hour",
            (
                f"{strongest_hour['label']} | "
                f"{format_percent(float(strongest_hour['coverage_ratio']))}"
            ),
            "availability_hourly.csv",
        ),
        _evidence(
            "Hora más frágil" if context.language == "es" else "Weakest hour",
            (
                f"{weakest_hour['label']} | "
                f"{format_percent(float(weakest_hour['coverage_ratio']))}"
            ),
            "availability_hourly.csv",
        ),
        _evidence(
            "Buckets observados" if context.language == "es" else "Observed buckets",
            str(sample_count),
            "availability_hourly.csv",
        ),
    ]
    analysis_steps = [
        (
            "Tomé los buckets horarios del rango pedido."
            if context.language == "es"
            else "I filtered the hourly buckets for the requested range."
        ),
        (
            "Promedié la cobertura de cada hora del reloj."
            if context.language == "es"
            else "I averaged coverage for each clock hour."
        ),
        (
            "Ordené las horas para detectar el mejor y peor soporte."
            if context.language == "es"
            else "I ranked those hours to find the strongest and weakest support."
        ),
    ]
    artifact = _bar_chart_artifact(
        context=context,
        title=(
            "Cobertura horaria del rango"
            if context.language == "es"
            else "Hourly coverage across the selected range"
        ),
        subtitle=(
            "Cada barra resume una hora del reloj a lo largo del período observado."
            if context.language == "es"
            else "Each bar summarizes one clock hour across the selected period."
        ),
        cards=[
            ChatArtifactCard(
                label="Hora más fuerte" if context.language == "es" else "Strongest hour",
                value=(
                    f"{strongest_hour['label']} · "
                    f"{format_percent(float(strongest_hour['coverage_ratio']))}"
                ),
                detail=(
                    f"{int(float(strongest_hour['avg_points']))} puntos promedio"
                    if context.language == "es"
                    else f"{int(float(strongest_hour['avg_points']))} average points"
                ),
                tone="accent",
            ),
            ChatArtifactCard(
                label="Hora más débil" if context.language == "es" else "Weakest hour",
                value=(
                    f"{weakest_hour['label']} · "
                    f"{format_percent(float(weakest_hour['coverage_ratio']))}"
                ),
                detail=(
                    f"{int(float(weakest_hour['avg_points']))} puntos promedio"
                    if context.language == "es"
                    else f"{int(float(weakest_hour['avg_points']))} average points"
                ),
                tone="warning" if str(weakest_hour["coverage_flag"]) == "low" else "muted",
            ),
        ],
        points=[
            {
                "label": str(item["label"]),
                "value": float(item["coverage_ratio"]),
                "formatted_value": format_percent(float(item["coverage_ratio"])),
                "detail": f"{int(float(item['avg_points']))} pts",
                "highlight": int(item["hour"]) == int(weakest_hour["hour"])
                or int(item["hour"]) == int(strongest_hour["hour"]),
                "tone": (
                    _hourly_profile_point_tone(
                        coverage_flag=str(item["coverage_flag"]),
                        hour=int(item["hour"]),
                        strongest_hour=int(strongest_hour["hour"]),
                    )
                ),
            }
            for item in summary["profile"]
        ],
        footnote=(
            "Cobertura = puntos observados / 360 esperados."
            if context.language == "es"
            else "Coverage = observed points / 360 expected samples."
        ),
    )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=str(weakest_hour["coverage_flag"]),
        analysis_steps=analysis_steps,
        evidence=evidence,
        artifacts=[artifact],
        warnings=[],
        source_tables=["availability_hourly.csv"],
        disclaimer=(
            "El perfil sale de agregación horaria determinística sobre el rango seleccionado."
            if context.language == "es"
            else "The profile comes from deterministic hourly aggregation over the selected range."
        ),
        follow_up_intent="hourly_coverage_profile",
    )


def _daily_coverage_profile_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    summary = build_daily_coverage_profile_summary(context.selection)
    strongest_day = summary["strongest_day"]
    weakest_day = summary["weakest_day"]
    day_count = int(summary["selection_day_count"])
    mean_coverage = float(summary["mean_coverage_ratio"])
    median_coverage = float(summary["median_coverage_ratio"])
    spread = float(summary["coverage_spread"])
    weakest_gap_vs_median = float(summary["weakest_gap_vs_median"])
    action_guidance = _asks_action_guidance(context.question)

    answer = (
        (
            f"La lectura principal del período es que febrero se mantiene bastante estable "
            f"en torno a una mediana de {format_percent(median_coverage)}, pero el "
            f"{weakest_day['date']} rompe ese patrón y cae a "
            f"{format_percent(float(weakest_day['coverage_ratio']))} "
            f"({_pp_label(weakest_gap_vs_median)} contra la mediana). "
            f"El punto más alto aparece en {strongest_day['date']} con "
            f"{format_percent(float(strongest_day['coverage_ratio']))}, así que la brecha "
            f"entre extremos del período queda en {_pp_label(spread)}. "
            + (
                "La decisión prudente es tomar ese día débil primero como una señal de "
                "calidad/cobertura del dato y revisar captura o completitud antes de "
                "convertirlo en una conclusión operativa."
                if action_guidance
                else (
                    "Eso deja al 11 de febrero como el primer candidato para drill-down "
                    "y validación."
                )
            )
        )
        if context.language == "es"
        else (
            f"The main readout is that February stays relatively stable around a "
            f"{format_percent(median_coverage)} median, but {weakest_day['date']} breaks "
            f"that pattern and drops to {format_percent(float(weakest_day['coverage_ratio']))} "
            f"({_pp_label(weakest_gap_vs_median)} versus the median). "
            f"The strongest point lands on {strongest_day['date']} at "
            f"{format_percent(float(strongest_day['coverage_ratio']))}, so the spread "
            f"between extremes is {_pp_label(spread)}. "
            + (
                "The prudent decision is to treat that weak day first as a data-quality "
                "or observation-coverage issue and review capture completeness before "
                "turning it into an operational conclusion."
                if action_guidance
                else "That makes February 11 the first day worth drilling into and validating."
            )
        )
    )
    evidence = [
        _evidence(
            "Cobertura media" if context.language == "es" else "Average coverage",
            format_percent(mean_coverage),
            "availability_daily.csv",
        ),
        _evidence(
            "Día más fuerte" if context.language == "es" else "Strongest day",
            f"{strongest_day['date']} | {format_percent(float(strongest_day['coverage_ratio']))}",
            "availability_daily.csv",
        ),
        _evidence(
            "Día más débil" if context.language == "es" else "Weakest day",
            f"{weakest_day['date']} | {format_percent(float(weakest_day['coverage_ratio']))}",
            "availability_daily.csv",
        ),
    ]
    analysis_steps = [
        (
            "Tomé la cobertura diaria observada para cada fecha del rango."
            if context.language == "es"
            else "I pulled daily observed coverage for each date in the selected range."
        ),
        (
            "Ordené los días para detectar el mejor y el peor soporte."
            if context.language == "es"
            else "I ranked those days to identify the strongest and weakest support."
        ),
        (
            "Resumí el promedio del período y la brecha entre extremos."
            if context.language == "es"
            else "I summarized the period average and the spread between extremes."
        ),
    ]
    artifact = _bar_chart_artifact(
        context=context,
        title=(
            "Cobertura diaria del rango"
            if context.language == "es"
            else "Daily coverage across the selected range"
        ),
        subtitle=(
            "Cada barra corresponde a una fecha observada dentro del período."
            if context.language == "es"
            else "Each bar corresponds to one observed date in the period."
        ),
        cards=[
            ChatArtifactCard(
                label="Cobertura media" if context.language == "es" else "Average coverage",
                value=format_percent(mean_coverage),
                detail=(
                    f"{day_count} días observados"
                    if context.language == "es"
                    else f"{day_count} observed days"
                ),
                tone="accent",
            ),
            ChatArtifactCard(
                label="Mediana" if context.language == "es" else "Median",
                value=format_percent(median_coverage),
                detail=_pp_label(spread),
                tone="muted",
            ),
            ChatArtifactCard(
                label="Día más débil" if context.language == "es" else "Weakest day",
                value=(
                    f"{weakest_day['date']} · "
                    f"{format_percent(float(weakest_day['coverage_ratio']))}"
                ),
                detail=(
                    f"{int(weakest_day['n_points'])} puntos observados"
                    if context.language == "es"
                    else f"{int(weakest_day['n_points'])} observed points"
                ),
                tone="warning" if str(weakest_day["coverage_flag"]) == "low" else "muted",
            ),
        ],
        points=[
            {
                "label": str(item["date"])[5:],
                "value": float(item["coverage_ratio"]),
                "formatted_value": format_percent(float(item["coverage_ratio"])),
                "detail": str(item["date"]),
                "highlight": str(item["date"])
                in {str(strongest_day["date"]), str(weakest_day["date"])},
                "tone": (
                    _daily_profile_point_tone(
                        item_date=str(item["date"]),
                        strongest_date=str(strongest_day["date"]),
                        weakest_date=str(weakest_day["date"]),
                    )
                ),
            }
            for item in summary["profile"]
        ],
        footnote=(
            "Cobertura diaria = puntos observados / puntos esperados dentro de cada fecha."
            if context.language == "es"
            else "Daily coverage = observed points / expected points for each date."
        ),
    )
    warnings: list[str] = []
    if str(weakest_day["coverage_flag"]) != "high":
        warnings.append(
            "Los días más débiles deben leerse como calidad de observación, no como "
            "causa operativa confirmada."
            if context.language == "es"
            else (
                "The weakest days should be read as observation quality, not "
                "confirmed operational causes."
            )
        )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence="high",
        analysis_steps=analysis_steps,
        evidence=evidence,
        artifacts=[artifact],
        warnings=warnings,
        source_tables=["availability_daily.csv"],
        disclaimer=(
            "La comparación por fecha usa cobertura diaria agregada y no infiere "
            "granularidad por tienda."
            if context.language == "es"
            else (
                "This date-by-date comparison uses aggregated daily coverage and "
                "does not infer store-level granularity."
            )
        ),
        follow_up_intent="daily_coverage_profile",
        target_date=weakest_day["date"],
    )


def _weekday_weekend_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    summary = build_weekday_weekend_summary(context.selection)
    weekday = summary["weekday"]
    weekend = summary["weekend"]
    gap = float(summary["coverage_gap"])
    answer = (
        (
            f"Comparé la cobertura agregada entre semana versus fines de semana en el rango "
            f"seleccionado. Entre semana la cobertura quedó en "
            f"{format_percent(float(weekday['coverage_ratio']))}, mientras que fines de "
            f"semana quedó en {format_percent(float(weekend['coverage_ratio']))}. La brecha "
            f"es {_pp_label(gap)} a favor de "
            f"{'fines de semana' if gap > 0 else 'entre semana'}."
        )
        if context.language == "es"
        else (
            "I compared aggregate coverage between weekdays and weekends in the selected "
            f"range. Weekdays land at {format_percent(float(weekday['coverage_ratio']))}, "
            f"while weekends land at {format_percent(float(weekend['coverage_ratio']))}. "
            f"The gap is {_pp_label(gap)} in favor of "
            f"{'weekends' if gap > 0 else 'weekdays'}."
        )
    )
    evidence = [
        _evidence(
            "Entre semana" if context.language == "es" else "Weekday coverage",
            format_percent(float(weekday["coverage_ratio"])),
            "availability_daily.csv",
        ),
        _evidence(
            "Fin de semana" if context.language == "es" else "Weekend coverage",
            format_percent(float(weekend["coverage_ratio"])),
            "availability_daily.csv",
        ),
        _evidence(
            "Brecha" if context.language == "es" else "Gap",
            _pp_label(gap),
            "availability_daily.csv",
        ),
    ]
    analysis_steps = [
        (
            "Separé los días observados entre semana y fin de semana."
            if context.language == "es"
            else "I split observed days into weekday and weekend segments."
        ),
        (
            "Agregué cobertura por segmento como puntos observados sobre esperados."
            if context.language == "es"
            else "I aggregated coverage for each segment as observed over expected points."
        ),
        (
            "Comparé ambos grupos y medí la brecha en puntos porcentuales."
            if context.language == "es"
            else "I compared the two groups and measured the gap in percentage points."
        ),
    ]
    artifact = _bar_chart_artifact(
        context=context,
        title=(
            "Entre semana vs fin de semana"
            if context.language == "es"
            else "Weekday vs weekend coverage"
        ),
        subtitle=(
            "Comparación agregada de cobertura diaria por tipo de día."
            if context.language == "es"
            else "Aggregate daily coverage comparison by day type."
        ),
        cards=[
            ChatArtifactCard(
                label="Entre semana" if context.language == "es" else "Weekdays",
                value=format_percent(float(weekday["coverage_ratio"])),
                detail=(
                    f"{weekday['day_count']} días"
                    if context.language == "es"
                    else f"{weekday['day_count']} days"
                ),
                tone="accent",
            ),
            ChatArtifactCard(
                label="Fines de semana" if context.language == "es" else "Weekends",
                value=format_percent(float(weekend["coverage_ratio"])),
                detail=(
                    f"{weekend['day_count']} días"
                    if context.language == "es"
                    else f"{weekend['day_count']} days"
                ),
                tone="warning" if str(weekend["coverage_flag"]) == "low" else "muted",
            ),
        ],
        points=[
            {
                "label": "weekday" if context.language == "en" else "semana",
                "value": float(weekday["coverage_ratio"]),
                "formatted_value": format_percent(float(weekday["coverage_ratio"])),
                "detail": (
                    f"{weekday['day_count']} días"
                    if context.language == "es"
                    else f"{weekday['day_count']} days"
                ),
                "highlight": float(weekday["coverage_ratio"]) >= float(weekend["coverage_ratio"]),
                "tone": "accent",
            },
            {
                "label": "weekend" if context.language == "en" else "fin de semana",
                "value": float(weekend["coverage_ratio"]),
                "formatted_value": format_percent(float(weekend["coverage_ratio"])),
                "detail": (
                    f"{weekend['day_count']} días"
                    if context.language == "es"
                    else f"{weekend['day_count']} days"
                ),
                "highlight": float(weekend["coverage_ratio"]) > float(weekday["coverage_ratio"]),
                "tone": "warning" if str(weekend["coverage_flag"]) == "low" else "muted",
            },
        ],
        footnote=(
            "La comparación usa cobertura diaria agregada, no comportamiento por tienda."
            if context.language == "es"
            else "The comparison uses aggregated daily coverage, not store-level behavior."
        ),
    )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=(
            "high"
            if str(weekday["coverage_flag"]) == "high" and str(weekend["coverage_flag"]) == "high"
            else "medium"
        ),
        analysis_steps=analysis_steps,
        evidence=evidence,
        artifacts=[artifact],
        warnings=[],
        source_tables=["availability_daily.csv"],
        disclaimer=(
            "La comparación se apoya en cobertura diaria agregada por segmento temporal."
            if context.language == "es"
            else "The comparison relies on aggregated daily coverage by time segment."
        ),
        follow_up_intent="weekday_weekend_comparison",
    )


def _weekend_coverage_report_response(
    context: QuestionContext,
    payload: ChatQueryRequest,
) -> ChatQueryResponse:
    summary = build_weekday_weekend_summary(context.selection)
    weekend_low = summary["weekend_low"]
    weekend_high = summary["weekend_high"]
    weekend = summary["weekend"]
    weekday = summary["weekday"]
    weekend_points = summary["weekend_points"]
    answer = (
        (
            f"Armé un reporte específico para fines de semana. En el rango seleccionado, la "
            f"cobertura promedio de fines de semana fue "
            f"{format_percent(float(weekend['coverage_ratio']))} frente a "
            f"{format_percent(float(weekday['coverage_ratio']))} entre semana. Dentro de "
            f"los fines de semana observados, el punto más débil fue {weekend_low['date']} "
            f"con {format_percent(float(weekend_low['coverage_ratio']))} y el más fuerte "
            f"fue {weekend_high['date']} con "
            f"{format_percent(float(weekend_high['coverage_ratio']))}."
        )
        if context.language == "es"
        else (
            "I built a weekend-focused report. In the selected range, average weekend "
            f"coverage is {format_percent(float(weekend['coverage_ratio']))} versus "
            f"{format_percent(float(weekday['coverage_ratio']))} on weekdays. Within the "
            f"observed weekends, the weakest point is {weekend_low['date']} at "
            f"{format_percent(float(weekend_low['coverage_ratio']))} and the strongest is "
            f"{weekend_high['date']} at {format_percent(float(weekend_high['coverage_ratio']))}."
        )
    )
    evidence = [
        _evidence(
            "Cobertura promedio weekend"
            if context.language == "es"
            else "Average weekend coverage",
            format_percent(float(weekend["coverage_ratio"])),
            "availability_daily.csv",
        ),
        _evidence(
            "Weekend más débil" if context.language == "es" else "Weakest weekend point",
            f"{weekend_low['date']} | {format_percent(float(weekend_low['coverage_ratio']))}",
            "availability_daily.csv",
        ),
        _evidence(
            "Weekend más fuerte" if context.language == "es" else "Strongest weekend point",
            f"{weekend_high['date']} | {format_percent(float(weekend_high['coverage_ratio']))}",
            "availability_daily.csv",
        ),
    ]
    analysis_steps = [
        (
            "Filtré solo los días de fin de semana del rango."
            if context.language == "es"
            else "I filtered only weekend days inside the selected range."
        ),
        (
            "Resumí su cobertura agregada y su rango de fluctuación."
            if context.language == "es"
            else "I summarized their aggregate coverage and fluctuation range."
        ),
        (
            "Tomé como referencia el baseline de entre semana."
            if context.language == "es"
            else "I used weekday coverage as the baseline reference."
        ),
    ]
    artifact = _bar_chart_artifact(
        context=context,
        title=(
            "Cobertura en fines de semana"
            if context.language == "es"
            else "Weekend coverage"
        ),
        subtitle=(
            "Cada barra corresponde a un día de fin de semana observado."
            if context.language == "es"
            else "Each bar corresponds to one observed weekend day."
        ),
        cards=[
            ChatArtifactCard(
                label="Promedio weekend" if context.language == "es" else "Weekend average",
                value=format_percent(float(weekend["coverage_ratio"])),
                detail=(
                    f"{weekend['day_count']} días observados"
                    if context.language == "es"
                    else f"{weekend['day_count']} observed days"
                ),
                tone="accent",
            ),
            ChatArtifactCard(
                label="Baseline semana" if context.language == "es" else "Weekday baseline",
                value=format_percent(float(weekday["coverage_ratio"])),
                detail=_pp_label(float(summary["coverage_gap"])),
                tone="muted",
            ),
        ],
        points=[
            {
                "label": str(item["date"])[5:],
                "value": float(item["coverage_ratio"]),
                "formatted_value": format_percent(float(item["coverage_ratio"])),
                "detail": str(item["date"]),
                "highlight": str(item["date"]) == str(weekend_low["date"])
                or str(item["date"]) == str(weekend_high["date"]),
                "tone": (
                    "warning"
                    if str(item["coverage_flag"]) == "low"
                    else "accent"
                    if str(item["date"]) == str(weekend_high["date"])
                    else "muted"
                ),
            }
            for item in weekend_points
        ],
        footnote=(
            "Los fines de semana se comparan contra cobertura diaria agregada."
            if context.language == "es"
            else "Weekend days are compared using aggregated daily coverage."
        ),
    )
    warnings: list[str] = []
    if len(weekend_points) < 2:
        warnings.append(
            "Hay pocos fines de semana observados, así que la lectura debe ser prudente."
            if context.language == "es"
            else (
                "Only a few weekend observations are available, so interpretation "
                "should stay cautious."
            )
        )
    return _chat_response(
        context=context,
        payload=payload,
        answer=answer,
        confidence=str(weekend["coverage_flag"]),
        analysis_steps=analysis_steps,
        evidence=evidence,
        artifacts=[artifact],
        warnings=warnings,
        source_tables=["availability_daily.csv"],
        disclaimer=(
            "El reporte usa cobertura diaria agregada y no explica causas operativas."
            if context.language == "es"
            else "The report uses aggregated daily coverage and does not infer operational causes."
        ),
        follow_up_intent="weekend_coverage_report",
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
    action_guidance = _asks_action_guidance(context.question)
    strongest_hour = briefing["strongest_hour"]
    weakest_hour = briefing["weakest_hour"]
    top_anomalies = list(briefing["top_anomalies"])
    top_anomaly = top_anomalies[0] if top_anomalies else None

    if context.language == "es":
        answer_parts = [
            (
                f"La conclusión más firme para {briefing['target_date']} es que el día debe "
                f"leerse primero como un día de cobertura frágil: cerró con "
                f"{format_percent(float(briefing['coverage_ratio']))} y señal media de "
                f"{briefing['formatted_mean_signal']}."
            ),
            (
                f"Dentro del día, la franja más fuerte fue {strongest_hour['label']} y la "
                f"más débil {weakest_hour['label']}."
            ),
        ]
        if top_anomaly is not None:
            answer_parts.append(
                (
                    f"La desviación horaria más marcada apareció cerca de "
                    f"{format_hour_label(int(top_anomaly['hour']))} con confianza "
                    f"{top_anomaly['confidence']}."
                )
            )
        if action_guidance:
            answer_parts.append(
                (
                    "Si tuviera que tomar una decisión, empezaría por auditar captura, "
                    "completitud o monitoreo de ese día antes de atribuir el movimiento a "
                    "un cambio real del negocio."
                )
            )
        if context.wants_explanation:
            answer_parts.append(
                (
                    "Puedo plantear hipótesis o contrastarlo con contexto externo, pero no "
                    "confirmar una causa raíz solo con este dataset."
                )
            )
        answer = " ".join(answer_parts)
    else:
        answer_parts = [
            (
                f"The strongest conclusion for {briefing['target_date']} is that the day "
                f"should first be read as a fragile-coverage day: it closed at "
                f"{format_percent(float(briefing['coverage_ratio']))} with a mean signal of "
                f"{briefing['formatted_mean_signal']}."
            ),
            (
                f"Inside the day, the strongest slot was {strongest_hour['label']} and the "
                f"weakest was {weakest_hour['label']}."
            ),
        ]
        if top_anomaly is not None:
            answer_parts.append(
                (
                    f"The sharpest hourly deviation appeared around "
                    f"{format_hour_label(int(top_anomaly['hour']))} with "
                    f"{top_anomaly['confidence']} confidence."
                )
            )
        if action_guidance:
            answer_parts.append(
                (
                    "If I had to make one decision, I would audit capture completeness or "
                    "monitoring quality for that date before treating the movement as a real "
                    "business change."
                )
            )
        if context.wants_explanation:
            answer_parts.append(
                (
                    "I can suggest hypotheses or contrast it with external context, but I "
                    "cannot confirm root cause from this dataset alone."
                )
            )
        answer = " ".join(answer_parts)

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


def compose_grounded_response(
    payload: ChatQueryRequest,
    plan: BrainPlan | None = None,
) -> ChatQueryResponse:
    """Return a structured grounded response from deterministic analytics."""
    context = _build_context(payload, plan)
    if context.intent == "unsupported_request":
        return _unsupported_response(context, payload)
    if context.intent == "metric_definition":
        return _metric_definition_response(context, payload)
    if context.intent == "data_quality_status":
        return _quality_response(context, payload)
    if context.intent == "hourly_coverage_profile":
        return _hourly_coverage_profile_response(context, payload)
    if context.intent == "daily_coverage_profile":
        return _daily_coverage_profile_response(context, payload)
    if context.intent == "weekday_weekend_comparison":
        return _weekday_weekend_response(context, payload)
    if context.intent == "weekend_coverage_report":
        return _weekend_coverage_report_response(context, payload)
    if context.intent == "coverage_extremes":
        return _coverage_extremes_response(context, payload)
    if context.intent == "day_briefing":
        return _day_briefing_response(context, payload)
    if context.intent == "hourly_coverage_lookup":
        return _hourly_coverage_lookup_response(context, payload)
    if context.intent == "intraday_pattern":
        return _intraday_response(context, payload)
    if context.intent == "anomaly_review":
        return _anomaly_response(context, payload)
    return _period_response(context, payload)
