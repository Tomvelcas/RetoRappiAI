"""Chat endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.chat.llm_client import LLMConfigurationError, LLMRequestError, LLMWebResearchResult
from app.schemas.chat import ChatExternalSource, ChatQueryResponse


def test_chat_rejects_store_level_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "Which store had the worst availability?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "unsupported_request"
    assert payload["supported"] is False
    assert payload["warnings"]
    assert payload["answer_mode"] == "deterministic"
    assert payload["llm_used"] is False


def test_chat_supports_intraday_pattern_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "¿Qué horas suelen ser más altas?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "intraday_pattern"
    assert payload["supported"] is True
    assert payload["evidence"]
    assert "availability_hourly.csv" in payload["source_tables"]
    assert payload["answer_mode"] == "deterministic"
    assert payload["follow_up_questions"]


def test_chat_supports_hourly_coverage_lookup_with_natural_date(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "¿Cuál fue la hora con menor cobertura el 11 de febrero?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "hourly_coverage_lookup"
    assert payload["supported"] is True
    assert payload["analysis_steps"]
    assert payload["artifacts"]
    assert payload["artifacts"][0]["kind"] == "hourly_coverage_chart"
    assert payload["source_tables"] == [
        "availability_hourly.csv",
        "availability_quality_report.json",
    ]
    assert "15:00-15:59" in payload["answer"]
    assert payload["time_window"]["effective_start"] == "2026-02-11"
    assert payload["time_window"]["effective_end"] == "2026-02-11"


def test_chat_supports_quality_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "How complete is the dataset between 2026-02-10 and 2026-02-10?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "data_quality_status"
    assert payload["supported"] is True
    assert payload["time_window"]["effective_start"] == "2026-02-10"
    assert payload["time_window"]["effective_end"] == "2026-02-10"


def test_chat_supports_metric_definition_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "¿Qué significa synthetic_monitoring_visible_stores?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "metric_definition"
    assert payload["supported"] is True
    assert payload["source_tables"] == ["availability_quality_report.json"]


def test_chat_supports_anomaly_review_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "Revise las anomalías horarias del rango."},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "anomaly_review"
    assert payload["supported"] is True
    assert "availability_hourly_anomalies.csv" in payload["source_tables"]


def test_chat_supports_period_comparison_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "Compare 2026-02-10 vs 2026-02-11."},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "period_comparison"
    assert payload["supported"] is True
    assert payload["evidence"]


def test_chat_supports_default_trend_summary_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "How is the signal behaving overall?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "trend_summary"
    assert payload["supported"] is True
    assert payload["source_tables"] == ["availability_daily.csv"]


def test_chat_supports_hourly_coverage_profile_chart_request(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": (
                "Genéreme un gráfico de barras para mostrar cómo se comportan los "
                "horarios a lo largo del mes de febrero y su cobertura."
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "hourly_coverage_profile"
    assert payload["supported"] is True
    assert payload["artifacts"]
    assert payload["artifacts"][0]["kind"] == "bar_chart"
    assert payload["source_tables"] == ["availability_hourly.csv"]


def test_chat_supports_daily_coverage_profile_chart_request(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": (
                "Podría entregarme un gráfico que compare la cobertura total de todos "
                "los días que tenemos en febrero."
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "daily_coverage_profile"
    assert payload["supported"] is True
    assert payload["artifacts"]
    assert payload["artifacts"][0]["kind"] == "bar_chart"
    assert payload["source_tables"] == ["availability_daily.csv"]


def test_chat_supports_extreme_day_vs_average_chart_request(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": (
                "Podria generarme ahora una gráfica que compare el día de menor cobertura "
                "con el promedio de los demás? así puedo saber que tan desfasado estan los datos"
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "coverage_extreme_vs_average"
    assert payload["supported"] is True
    assert payload["artifacts"]
    assert payload["artifacts"][0]["kind"] == "bar_chart"
    assert len(payload["artifacts"][0]["points"]) == 2
    assert "focus_direction=lowest" in payload["reasoning_scope"]
    assert payload["source_tables"] == ["availability_daily.csv"]


def test_chat_supports_weekday_weekend_comparison_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": (
                "Entrégueme conclusiones claras sobre cómo se comporta entre semana "
                "vs fines de semana la cobertura."
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "weekday_weekend_comparison"
    assert payload["supported"] is True
    assert payload["artifacts"]
    assert payload["analysis_steps"]
    assert payload["source_tables"] == ["availability_daily.csv"]


def test_chat_supports_weekend_report_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": (
                "Cree un reporte detallado de cómo fue fluctuando la cobertura "
                "en fines de semana."
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "weekend_coverage_report"
    assert payload["supported"] is True
    assert payload["artifacts"]
    assert payload["artifacts"][0]["kind"] == "bar_chart"


def test_chat_translates_validation_errors_to_400(
    client: TestClient,
    monkeypatch,
) -> None:
    def _raise_value_error(*args, **kwargs) -> None:
        raise ValueError("Pregunta inválida.")

    monkeypatch.setattr("app.api.routes.chat.answer_question", _raise_value_error)

    response = client.post(
        "/api/v1/chat/query",
        json={"question": "forzar error"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Pregunta inválida."


def test_chat_translates_missing_context_errors_to_404(
    client: TestClient,
    monkeypatch,
) -> None:
    def _raise_lookup_error(*args, **kwargs) -> None:
        raise LookupError("No se encontró el contexto solicitado.")

    monkeypatch.setattr("app.api.routes.chat.answer_question", _raise_lookup_error)

    response = client.post(
        "/api/v1/chat/query",
        json={"question": "forzar missing context"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "No se encontró el contexto solicitado."


def test_chat_reuses_conversation_context_for_follow_up(
    client: TestClient,
    monkeypatch,
    tmp_path,
) -> None:
    from app.chat.memory import ConversationMemory

    temp_memory = ConversationMemory(tmp_path / "chat_memory.sqlite3")
    monkeypatch.setattr(
        "app.services.chat_service.get_conversation_memory",
        lambda settings=None: temp_memory,
    )

    first = client.post(
        "/api/v1/chat/query",
        json={
            "conversation_id": "session-follow-up",
            "question": (
                "Genéreme un gráfico de barras para mostrar cómo se comportan los "
                "horarios a lo largo del mes de febrero y su cobertura."
            ),
        },
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/chat/query",
        json={
            "conversation_id": "session-follow-up",
            "question": "Ahora conviértalo en conclusiones claras.",
        },
    )

    assert second.status_code == 200
    payload = second.json()

    assert payload["intent"] == "hourly_coverage_profile"
    assert "inherited_context=True" in payload["reasoning_scope"]
    assert payload["time_window"]["effective_start"] == "2026-02-01"
    assert payload["time_window"]["effective_end"] == "2026-02-11"


def test_chat_promotes_referential_extreme_day_follow_up_to_chart(
    client: TestClient,
    monkeypatch,
    tmp_path,
) -> None:
    from app.chat.memory import ConversationMemory

    temp_memory = ConversationMemory(tmp_path / "chat_memory.sqlite3")
    monkeypatch.setattr(
        "app.services.chat_service.get_conversation_memory",
        lambda settings=None: temp_memory,
    )

    first = client.post(
        "/api/v1/chat/query",
        json={
            "conversation_id": "session-extreme-follow-up",
            "question": "¿Qué día tuvo la menor cobertura?",
        },
    )
    assert first.status_code == 200
    assert first.json()["intent"] == "coverage_extremes"

    second = client.post(
        "/api/v1/chat/query",
        json={
            "conversation_id": "session-extreme-follow-up",
            "question": (
                "Podria generarme ahora una gráfica que compare ese día con el promedio "
                "de los demás?"
            ),
        },
    )

    assert second.status_code == 200
    payload = second.json()

    assert payload["intent"] == "coverage_extreme_vs_average"
    assert payload["artifacts"]
    assert payload["artifacts"][0]["kind"] == "bar_chart"
    assert len(payload["artifacts"][0]["points"]) == 2
    assert "inherited_context=True" in payload["reasoning_scope"]
    assert "focus_direction=lowest" in payload["reasoning_scope"]


def test_chat_supports_coverage_extremes_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "¿Qué días tuvieron la menor cobertura?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "coverage_extremes"
    assert payload["supported"] is True
    assert payload["evidence"]
    assert payload["source_tables"] == ["availability_daily.csv"]
    assert payload["follow_up_questions"]


def test_chat_supports_day_briefing_question(client: TestClient) -> None:
    response = client.post(
        "/api/v1/chat/query",
        json={"question": "¿Qué pasó el 2026-02-10?"},
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["intent"] == "day_briefing"
    assert payload["supported"] is True
    assert payload["source_tables"] == [
        "availability_daily.csv",
        "availability_hourly.csv",
        "availability_hourly_anomalies.csv",
    ]
    assert payload["follow_up_questions"]
    assert payload["answer"]


def test_chat_falls_back_when_llm_is_requested_but_disabled(
    client: TestClient,
    monkeypatch,
) -> None:
    def _raise_disabled(*args, **kwargs) -> None:
        raise LLMConfigurationError("Optional LLM support is disabled in backend configuration.")

    monkeypatch.setattr("app.chat.enrichment.generate_openai_enrichment", _raise_disabled)

    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": "¿Qué días tuvieron la menor cobertura y por qué podrían verse así?",
            "use_llm": True,
            "allow_hypotheses": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["supported"] is True
    assert payload["answer_mode"] == "deterministic_fallback"
    assert payload["llm_used"] is False
    assert payload["warnings"]


def test_chat_hides_provider_internals_when_llm_request_fails(
    client: TestClient,
    monkeypatch,
) -> None:
    def _raise_request_error(*args, **kwargs) -> None:
        raise LLMRequestError(
            "The narrative polish service was temporarily unavailable. "
            "Please include request id req_123."
        )

    monkeypatch.setattr("app.chat.enrichment.generate_openai_enrichment", _raise_request_error)

    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": "¿Qué pasó el 2026-02-11 y qué decisión podría tomar?",
            "use_llm": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["answer_mode"] == "deterministic_fallback"
    assert "req_123" not in " ".join(payload["warnings"])


def test_chat_can_add_web_research_hypotheses_when_requested(
    client: TestClient,
    monkeypatch,
) -> None:
    def _raise_request_error(*args, **kwargs) -> None:
        raise LLMRequestError("The narrative polish service returned an unusable response.")

    def _fake_web_research(*args, **kwargs) -> LLMWebResearchResult:
        return LLMWebResearchResult(
            summary=(
                "public reporting around that date suggests a temporary platform disruption "
                "may have affected observability."
            ),
            hypotheses=(
                "A temporary platform or monitoring disruption may have reduced observed coverage.",
            ),
            follow_up_questions=(
                "Do you want the outside context separated from the dataset view?",
            ),
            caveats=("Public reporting is suggestive, not a confirmed root cause.",),
            sources=(
                ChatExternalSource(
                    title="Example source",
                    url="https://example.com/source",
                    domain="example.com",
                ),
            ),
            provider="openai",
            model="gpt-5-mini",
        )

    monkeypatch.setattr("app.chat.enrichment.generate_openai_enrichment", _raise_request_error)
    monkeypatch.setattr("app.chat.enrichment.generate_openai_web_research", _fake_web_research)

    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": (
                "¿Cuál fue el día con menor cobertura y cuál cree que es la razón de esto? "
                "Si considera necesario, búsquelo en internet."
            ),
            "use_llm": True,
            "allow_hypotheses": True,
            "allow_web_research": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["answer_mode"] == "llm_enhanced"
    assert payload["llm_used"] is True
    assert payload["web_research_used"] is True
    assert payload["hypotheses"]
    assert payload["web_sources"]
    assert "búsquelo en internet" not in payload["answer"].lower()
    assert "contexto tentativo" in payload["answer"].lower()


def test_chat_can_return_llm_enhanced_payload(
    client: TestClient,
    monkeypatch,
) -> None:
    def _fake_enrich(payload, grounded_response: ChatQueryResponse) -> ChatQueryResponse:
        return grounded_response.model_copy(
            update={
                "answer": "Respuesta enriquecida con redacción semántica controlada.",
                "answer_mode": "llm_enhanced",
                "llm_used": True,
                "llm_provider": "openai",
                "llm_model": "gpt-5-mini",
                "hypotheses": ["Podría influir una ventana incompleta o latencia operativa."],
                "follow_up_questions": ["¿Quiere comparar ese día contra el baseline diario?"],
                "external_context_used": True,
            }
        )

    monkeypatch.setattr("app.services.chat_service.enrich_chat_response", _fake_enrich)

    response = client.post(
        "/api/v1/chat/query",
        json={
            "question": "¿Qué días tuvieron la menor cobertura y por qué podrían verse así?",
            "use_llm": True,
            "allow_hypotheses": True,
            "external_context": "Hubo una promoción fuerte y notas de latencia ese día.",
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["answer_mode"] == "llm_enhanced"
    assert payload["llm_used"] is True
    assert payload["llm_model"] == "gpt-5-mini"
    assert payload["hypotheses"]
    assert payload["follow_up_questions"]
    assert payload["external_context_used"] is True
