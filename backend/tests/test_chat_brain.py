"""Planner and conversation-memory tests for the analytics copilot."""

from __future__ import annotations

from datetime import date, datetime, timezone

from app.chat.brain import ChatBrain, _selection_from_question, extract_dates
from app.chat.memory import ConversationMemory, ConversationState
from app.core.config import Settings


def test_brain_builds_hourly_profile_chart_plan_for_month_question() -> None:
    brain = ChatBrain(settings=Settings(LLM_ENABLED=False))

    plan = brain.plan(
        (
            "Genéreme un gráfico de barras para mostrar cómo se comportan los "
            "horarios a lo largo del mes de febrero y su cobertura."
        ),
        conversation_id=None,
        force_use_llm=False,
    )

    assert plan.intent == "hourly_coverage_profile"
    assert plan.output_intent == "chart"
    assert plan.brain_mode == "deterministic_artifact"
    assert plan.selection.effective_start == date(2026, 2, 1)
    assert plan.selection.effective_end == date(2026, 2, 11)


def test_brain_builds_hybrid_weekday_weekend_conclusion_plan() -> None:
    brain = ChatBrain(
        settings=Settings(
            LLM_ENABLED=True,
            CHAT_AUTO_LLM=True,
            OPENAI_API_KEY="test-key",
        )
    )

    plan = brain.plan(
        (
            "Entrégueme conclusiones claras sobre cómo se comporta entre semana "
            "vs fines de semana la cobertura."
        ),
        conversation_id=None,
        force_use_llm=False,
    )

    assert plan.intent == "weekday_weekend_comparison"
    assert plan.output_intent == "conclusions"
    assert plan.brain_mode == "hybrid"
    assert plan.should_use_llm is True


def test_brain_reuses_conversation_context_for_referential_follow_up() -> None:
    brain = ChatBrain(settings=Settings(LLM_ENABLED=False))
    state = ConversationState(
        conversation_id="session-1",
        intent="hourly_coverage_profile",
        output_intent="chart",
        brain_mode="deterministic_artifact",
        effective_start=date(2026, 2, 1),
        effective_end=date(2026, 2, 11),
        referenced_dates=(),
        last_question="Muéstreme un gráfico horario de febrero.",
        updated_at=datetime.now(timezone.utc),
    )

    plan = brain.plan(
        "Ahora conviértalo en conclusiones claras.",
        conversation_id="session-1",
        force_use_llm=False,
        conversation_state=state,
    )

    assert plan.intent == "hourly_coverage_profile"
    assert plan.output_intent == "conclusions"
    assert plan.inherited_context is True
    assert plan.selection.effective_start == date(2026, 2, 1)
    assert plan.selection.effective_end == date(2026, 2, 11)


def test_brain_routes_explicit_extreme_day_vs_average_chart_request() -> None:
    brain = ChatBrain(settings=Settings(LLM_ENABLED=False))

    plan = brain.plan(
        (
            "Podria generarme ahora una gráfica que compare el día de menor cobertura "
            "con el promedio de los demás? así puedo saber que tan desfasado estan los datos"
        ),
        conversation_id=None,
        force_use_llm=False,
    )

    assert plan.intent == "coverage_extreme_vs_average"
    assert plan.output_intent == "chart"
    assert plan.brain_mode == "deterministic_artifact"
    assert plan.focus_direction == "lowest"


def test_brain_promotes_referential_extreme_day_chart_follow_up() -> None:
    brain = ChatBrain(settings=Settings(LLM_ENABLED=False))
    state = ConversationState(
        conversation_id="session-compare-extreme",
        intent="coverage_extremes",
        output_intent="answer",
        brain_mode="deterministic",
        effective_start=date(2026, 2, 1),
        effective_end=date(2026, 2, 11),
        referenced_dates=(),
        last_question="¿Qué día tuvo la menor cobertura?",
        updated_at=datetime.now(timezone.utc),
    )

    plan = brain.plan(
        "Podria generarme ahora una gráfica que compare ese día con el promedio de los demás?",
        conversation_id="session-compare-extreme",
        force_use_llm=False,
        conversation_state=state,
    )

    assert plan.intent == "coverage_extreme_vs_average"
    assert plan.output_intent == "chart"
    assert plan.inherited_context is True
    assert plan.focus_direction == "lowest"
    assert any("extreme-day versus average comparison" in note for note in plan.notes)


def test_conversation_memory_round_trip(tmp_path) -> None:
    memory = ConversationMemory(tmp_path / "chat_memory.sqlite3")
    state = ConversationState(
        conversation_id="session-2",
        intent="weekday_weekend_comparison",
        output_intent="conclusions",
        brain_mode="hybrid",
        effective_start=date(2026, 2, 1),
        effective_end=date(2026, 2, 11),
        referenced_dates=("2026-02-11",),
        last_question="¿Qué conclusiones saca?",
        updated_at=datetime.now(timezone.utc),
    )

    memory.save(state)
    loaded = memory.get("session-2")

    assert loaded is not None
    assert loaded.intent == "weekday_weekend_comparison"
    assert loaded.output_intent == "conclusions"
    assert loaded.effective_end == date(2026, 2, 11)


def test_extract_dates_supports_natural_language_and_iso_fragments() -> None:
    extracted = extract_dates("Compare 2026-02-10 against 11 de febrero de 2026 please.")

    assert extracted == (date(2026, 2, 10), date(2026, 2, 11))


def test_selection_from_question_uses_month_alias_when_no_explicit_day() -> None:
    selection, extracted_dates = _selection_from_question("Muéstreme el mes de febrero 2026.")

    assert extracted_dates == ()
    assert selection.effective_start == date(2026, 2, 1)
    assert selection.effective_end == date(2026, 2, 11)


def test_brain_force_use_llm_promotes_deterministic_plan_to_hybrid() -> None:
    brain = ChatBrain(settings=Settings(LLM_ENABLED=False, CHAT_AUTO_LLM=False))

    plan = brain.plan(
        "What days had the lowest coverage?",
        conversation_id=None,
        force_use_llm=True,
    )

    assert plan.intent == "coverage_extremes"
    assert plan.brain_mode == "hybrid"
    assert plan.should_use_llm is True


def test_brain_inherits_intraday_family_for_referential_answer_follow_up() -> None:
    brain = ChatBrain(settings=Settings(LLM_ENABLED=False))
    state = ConversationState(
        conversation_id="session-3",
        intent="intraday_pattern",
        output_intent="answer",
        brain_mode="deterministic",
        effective_start=date(2026, 2, 1),
        effective_end=date(2026, 2, 11),
        referenced_dates=(),
        last_question="What is the intraday pattern?",
        updated_at=datetime.now(timezone.utc),
    )

    plan = brain.plan(
        "Explain that more clearly.",
        conversation_id="session-3",
        force_use_llm=False,
        conversation_state=state,
    )

    assert plan.intent == "intraday_pattern"
    assert plan.inherited_context is True
    assert plan.selection.effective_start == date(2026, 2, 1)
    assert plan.notes
