"""Planning layer that decides how the analytics copilot should answer a question."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

from app.analytics.overview import DateSelection, build_selection, get_observed_dataset_window
from app.chat.memory import ConversationState
from app.core.config import Settings, get_settings

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

REFERENTIAL_MARKERS = [
    "eso",
    "esa",
    "ese",
    "esto",
    "same",
    "that",
    "it",
    "ahora",
    "mismo",
    "mismas",
]


@dataclass(frozen=True, slots=True)
class BrainPlan:
    """Structured plan emitted by the chat brain before deterministic execution."""

    conversation_id: str | None
    intent: str
    selection: DateSelection
    extracted_dates: tuple[date, ...]
    output_intent: Literal["answer", "chart", "report", "conclusions"]
    brain_mode: Literal["deterministic", "deterministic_artifact", "hybrid"]
    should_use_llm: bool
    inherited_context: bool
    notes: tuple[str, ...]


def _default_year() -> int:
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
    resolved: dict[str, date],
    *,
    year_value: int,
    month_value: int | None,
    day_value: int | None,
) -> None:
    if month_value is None or day_value is None:
        return
    try:
        parsed = date(year_value, month_value, day_value)
    except ValueError:
        return
    resolved[parsed.isoformat()] = parsed


def _extract_iso_dates(question: str) -> tuple[date, ...]:
    matches = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", question)
    return tuple(date.fromisoformat(match) for match in matches)


def _extract_natural_dates(question: str) -> tuple[date, ...]:
    resolved: dict[str, date] = {}
    default_year = _default_year()
    tokens = _question_tokens(question)

    for index, token in enumerate(tokens):
        day_value = _safe_int(token)
        if day_value is not None:
            _register_day_first_date(
                resolved,
                tokens=tokens,
                index=index,
                day_value=day_value,
                default_year=default_year,
            )
            continue

        _register_month_first_date(
            resolved,
            tokens=tokens,
            index=index,
            default_year=default_year,
        )

    return tuple(sorted(resolved.values()))


def _register_day_first_date(
    resolved: dict[str, date],
    *,
    tokens: tuple[str, ...],
    index: int,
    day_value: int,
    default_year: int,
) -> None:
    if index + 2 >= len(tokens) or tokens[index + 1] != "de":
        return

    month_value = _month_number(tokens[index + 2])
    year_value = default_year
    if (
        index + 4 < len(tokens)
        and tokens[index + 3] == "de"
        and _safe_int(tokens[index + 4]) is not None
    ):
        year_value = int(tokens[index + 4])

    _register_date(
        resolved,
        year_value=year_value,
        month_value=month_value,
        day_value=day_value,
    )


def _register_month_first_date(
    resolved: dict[str, date],
    *,
    tokens: tuple[str, ...],
    index: int,
    default_year: int,
) -> None:
    month_value = _month_number(tokens[index])
    if month_value is None or index + 1 >= len(tokens):
        return

    day_value = _safe_int(tokens[index + 1])
    year_value = default_year
    if index + 2 < len(tokens) and _safe_int(tokens[index + 2]) is not None:
        year_value = int(tokens[index + 2])

    _register_date(
        resolved,
        year_value=year_value,
        month_value=month_value,
        day_value=day_value,
    )


def extract_dates(question: str) -> tuple[date, ...]:
    """Extract explicit dates from natural-language and ISO question fragments."""
    resolved: dict[str, date] = {
        parsed.isoformat(): parsed for parsed in _extract_natural_dates(question)
    }
    for parsed in _extract_iso_dates(question):
        resolved[parsed.isoformat()] = parsed
    return tuple(sorted(resolved.values()))


def _extract_month(question: str) -> tuple[int, int] | None:
    default_year = _default_year()
    tokens = _question_tokens(question)

    for index, token in enumerate(tokens):
        month_token = token
        month_index = index
        if token == "mes" and index + 2 < len(tokens) and tokens[index + 1] == "de":
            month_token = tokens[index + 2]
            month_index = index + 2

        month_value = _month_number(month_token)
        if month_value is None:
            continue

        year_value = default_year
        if (
            month_index + 2 < len(tokens)
            and tokens[month_index + 1] == "de"
            and _safe_int(tokens[month_index + 2]) is not None
        ):
            year_value = int(tokens[month_index + 2])
        return year_value, month_value

    return None


def _selection_from_question(question: str) -> tuple[DateSelection, tuple[date, ...]]:
    extracted_dates = extract_dates(question)
    if len(extracted_dates) >= 2:
        return (
            build_selection(start_date=min(extracted_dates), end_date=max(extracted_dates)),
            extracted_dates,
        )
    if len(extracted_dates) == 1:
        return (
            build_selection(start_date=extracted_dates[0], end_date=extracted_dates[0]),
            extracted_dates,
        )

    month_selection = _extract_month(question)
    if month_selection is not None:
        year_value, month_value = month_selection
        month_start = date(year_value, month_value, 1)
        if month_value == 12:
            month_end = date(year_value + 1, 1, 1)
        else:
            month_end = date(year_value, month_value + 1, 1)
        return build_selection(month_start, date.fromordinal(month_end.toordinal() - 1)), ()

    return build_selection(), ()


def _coverage_direction(question: str) -> Literal["lowest", "highest"]:
    lowered = question.lower()
    highest_markers = ["highest", "best", "mayor", "mejor", "más alta", "mas alta"]
    return "highest" if any(marker in lowered for marker in highest_markers) else "lowest"


def _detect_output_intent(question: str) -> Literal["answer", "chart", "report", "conclusions"]:
    lowered = question.lower()
    if any(
        marker in lowered
        for marker in ["chart", "graph", "gráfico", "grafico", "barras", "bar chart", "plot"]
    ):
        return "chart"
    if any(
        marker in lowered
        for marker in ["report", "reporte", "brief", "briefing", "detalle", "detallado"]
    ):
        return "report"
    if any(
        marker in lowered
        for marker in ["conclusion", "conclusión", "conclusions", "insight", "insights"]
    ):
        return "conclusions"
    return "answer"


def _asks_weekday_weekend(question: str) -> bool:
    lowered = question.lower()
    return (
        any(marker in lowered for marker in ["weekday", "weekdays", "entre semana"])
        and any(
            marker in lowered
            for marker in ["weekend", "weekends", "fin de semana", "fines de semana"]
        )
    )


def _asks_weekend_report(question: str) -> bool:
    lowered = question.lower()
    return any(
        marker in lowered for marker in ["weekend", "weekends", "fin de semana", "fines de semana"]
    ) and any(
        marker in lowered
        for marker in ["coverage", "cobertura", "fluct", "comport", "report", "reporte"]
    )


def _asks_hourly_month_chart(question: str) -> bool:
    lowered = question.lower()
    return (
        any(
            marker in lowered
            for marker in ["hora", "horas", "hour", "hours", "horario", "horarios"]
        )
        and any(marker in lowered for marker in ["coverage", "cobertura"])
        and _detect_output_intent(question) == "chart"
    )


def _asks_daily_coverage_chart(question: str) -> bool:
    lowered = question.lower()
    has_chart = _detect_output_intent(question) == "chart"
    has_coverage = any(marker in lowered for marker in ["coverage", "cobertura"])
    has_day_marker = any(
        marker in lowered
        for marker in ["día", "días", "dia", "dias", "day", "days", "fechas", "dates"]
    )
    has_compare_marker = any(
        marker in lowered
        for marker in [
            "compare",
            "compar",
            "todos",
            "all",
            "cada",
            "por día",
            "por dia",
            "across",
        ]
    )
    has_hour_marker = any(
        marker in lowered for marker in ["hora", "horas", "hour", "hours", "horario", "horarios"]
    )
    return (
        has_chart
        and has_coverage
        and has_day_marker
        and has_compare_marker
        and not has_hour_marker
    )


def _is_referential_follow_up(question: str) -> bool:
    lowered = question.lower()
    return any(marker in lowered for marker in REFERENTIAL_MARKERS)


def _plan_direct_intent(
    question: str,
    output_intent: Literal["answer", "chart", "report", "conclusions"],
) -> tuple[str, Literal["deterministic", "deterministic_artifact", "hybrid"]]:
    if _asks_weekday_weekend(question):
        return "weekday_weekend_comparison", _report_or_chart_mode(output_intent)
    if _asks_weekend_report(question):
        return "weekend_coverage_report", _report_or_chart_mode(output_intent)
    if _asks_hourly_month_chart(question):
        return "hourly_coverage_profile", "deterministic_artifact"
    if _asks_daily_coverage_chart(question):
        return "daily_coverage_profile", "deterministic_artifact"

    import app.chat.orchestrator as chat_orchestrator

    intent = chat_orchestrator._classify_intent(question)
    if output_intent == "chart":
        return intent, "deterministic_artifact"
    if output_intent in {"report", "conclusions"}:
        return intent, "hybrid"
    return intent, "deterministic"


def _report_or_chart_mode(
    output_intent: Literal["answer", "chart", "report", "conclusions"],
) -> Literal["deterministic_artifact", "hybrid"]:
    if output_intent in {"report", "conclusions"}:
        return "hybrid"
    return "deterministic_artifact"


def _reuse_conversation_context(
    *,
    question: str,
    selection: DateSelection,
    extracted_dates: tuple[date, ...],
    output_intent: Literal["answer", "chart", "report", "conclusions"],
    intent: str,
    conversation_state: ConversationState | None,
) -> tuple[DateSelection, str, bool, tuple[str, ...]]:
    if (
        conversation_state is None
        or not _is_referential_follow_up(question)
        or extracted_dates
        or _extract_month(question) is not None
    ):
        return selection, intent, False, ()

    next_selection = build_selection(
        start_date=conversation_state.effective_start,
        end_date=conversation_state.effective_end,
    )
    notes = ["Reused the active analytical window from conversation memory."]
    next_intent = intent
    if output_intent != "answer":
        next_intent = conversation_state.intent
        notes.append("Kept the previous analysis family and changed only the output style.")
    elif intent in {"trend_summary", "intraday_pattern"}:
        next_intent = conversation_state.intent
        notes.append("Inherited the last analysis family because the follow-up was referential.")

    return next_selection, next_intent, True, tuple(notes)


class ChatBrain:
    """Plan how the copilot should answer before execution happens."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def plan(
        self,
        question: str,
        *,
        conversation_id: str | None,
        force_use_llm: bool,
        conversation_state: ConversationState | None = None,
    ) -> BrainPlan:
        """Return a structured execution plan for the given question."""
        selection, extracted_dates = _selection_from_question(question)
        output_intent = _detect_output_intent(question)
        intent, brain_mode = _plan_direct_intent(question, output_intent)
        selection, intent, inherited_context, notes = _reuse_conversation_context(
            question=question,
            selection=selection,
            extracted_dates=extracted_dates,
            output_intent=output_intent,
            intent=intent,
            conversation_state=conversation_state,
        )

        should_use_llm = force_use_llm or (
            self._settings.llm_ready
            and self._settings.chat_auto_llm
            and brain_mode == "hybrid"
        )
        if should_use_llm and brain_mode == "deterministic":
            brain_mode = "hybrid"

        return BrainPlan(
            conversation_id=conversation_id,
            intent=intent,
            selection=selection,
            extracted_dates=extracted_dates,
            output_intent=output_intent,
            brain_mode=brain_mode,
            should_use_llm=should_use_llm,
            inherited_context=inherited_context,
            notes=notes,
        )
