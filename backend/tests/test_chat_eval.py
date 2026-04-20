"""Lightweight AI quality gates for the grounded chat experience."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize(
    ("question", "expected_intent", "supported"),
    [
        ("¿Qué horas suelen ser más altas?", "intraday_pattern", True),
        (
            "¿Cuál fue la hora con menor cobertura el 11 de febrero?",
            "hourly_coverage_lookup",
            True,
        ),
        (
            (
                "Entrégueme conclusiones claras sobre cómo se comporta entre semana "
                "vs fines de semana la cobertura."
            ),
            "weekday_weekend_comparison",
            True,
        ),
        (
            (
                "Podría entregarme un gráfico que compare la cobertura total de todos "
                "los días que tenemos en febrero."
            ),
            "daily_coverage_profile",
            True,
        ),
        ("What days had the lowest coverage?", "coverage_extremes", True),
        ("¿Qué pasó el 2026-02-10?", "day_briefing", True),
        (
            "¿Qué significa synthetic_monitoring_visible_stores?",
            "metric_definition",
            True,
        ),
        ("Which store had the worst availability?", "unsupported_request", False),
    ],
)
def test_chat_intent_routing_contract(
    client: TestClient,
    question: str,
    expected_intent: str,
    supported: bool,
) -> None:
    response = client.post("/api/v1/chat/query", json={"question": question})

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == expected_intent
    assert payload["supported"] is supported
    assert payload["answer"]
    assert payload["answer_mode"] == "deterministic"


def test_chat_quality_gate_preserves_grounding_fields(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "¿Qué días tuvieron la menor cobertura?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["evidence"]
    assert payload["warnings"] == [] or isinstance(payload["warnings"], list)
    assert "intent=coverage_extremes" in payload["reasoning_scope"]
    assert "use_llm=False" in payload["reasoning_scope"]
    assert payload["source_tables"]
    assert payload["disclaimer"]
