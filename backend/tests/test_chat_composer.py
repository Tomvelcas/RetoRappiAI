"""Unit tests for contextual chat composition."""

from __future__ import annotations

from datetime import date

from app.chat.composer import ComposerInput, compose_answer, compose_follow_ups
from app.schemas.chat import ChatArtifact, ChatArtifactCard, ChatArtifactPoint, ChatEvidenceItem


def _artifact(title: str = "Cobertura diaria") -> ChatArtifact:
    return ChatArtifact(
        kind="bar_chart",
        title=title,
        subtitle=None,
        cards=[ChatArtifactCard(label="A", value="B")],
        points=[ChatArtifactPoint(label="P", value=1.0, formatted_value="1.0")],
        footnote=None,
    )


def _payload(**overrides) -> ComposerInput:
    base = {
        "question": "¿Qué pasó?",
        "language": "es",
        "intent": "hourly_coverage_profile",
        "output_intent": "answer",
        "confidence": "medium",
        "supported": True,
        "draft_answer": "Lectura grounded.",
        "evidence": [
            ChatEvidenceItem(label="Cobertura", value="82.00%", source="availability_daily.csv"),
            ChatEvidenceItem(
                label="Hora pico",
                value="14:00 (1.2K)",
                source="availability_hourly.csv",
            ),
        ],
        "warnings": [],
        "analysis_steps": ["step 1"],
        "artifacts": [_artifact()],
        "inherited_context": False,
        "target_date": date(2026, 2, 10),
    }
    return ComposerInput(**(base | overrides))


def test_compose_answer_returns_draft_for_unsupported_payload() -> None:
    payload = _payload(
        supported=False,
        draft_answer="No soportado.",
        artifacts=[],
        evidence=[],
        analysis_steps=[],
    )

    assert compose_answer(payload) == "No soportado."


def test_compose_answer_for_report_includes_method_evidence_artifact_and_warning() -> None:
    payload = _payload(
        output_intent="report",
        inherited_context=True,
        warnings=["La cobertura no es alta para el rango."],
    )

    answer = compose_answer(payload)

    assert "Tomé el mismo contexto del hilo" in answer
    assert "Como respaldo" in answer
    assert "cobertura diaria" in answer.lower()
    assert "Ojo: La cobertura no es alta para el rango." in answer


def test_compose_answer_for_answer_mode_adds_confidence_and_artifact_in_english() -> None:
    payload = _payload(
        language="en",
        draft_answer="Grounded readout.",
        warnings=[],
    )

    answer = compose_answer(payload)

    assert "This readout carries medium confidence." in answer
    assert "You can use" in answer


def test_compose_follow_ups_dedupes_and_limits_suggestions() -> None:
    payload = _payload(
        warnings=["warning"],
        output_intent="answer",
    )

    follow_ups = compose_follow_ups(payload)

    assert len(follow_ups) == 3
    assert "¿Quiere que lo convierta en conclusiones claras?" in follow_ups
    assert "¿Quiere verlo como gráfico?" in follow_ups


def test_compose_follow_ups_for_english_coverage_extremes_remain_contextual() -> None:
    payload = _payload(
        language="en",
        intent="coverage_extremes",
        output_intent="answer",
        artifacts=[],
        warnings=[],
    )

    follow_ups = compose_follow_ups(payload)

    assert "Do you want a briefing for the lowest-coverage day?" in follow_ups
