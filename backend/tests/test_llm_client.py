"""Unit tests for optional LLM enrichment parsing and transport helpers."""

from __future__ import annotations

import json
from io import BytesIO
from urllib import error

import pytest

from app.chat import llm_client
from app.core.config import Settings
from app.schemas.chat import ChatEvidenceItem, ChatQueryRequest, ChatQueryResponse


def _grounded_response() -> ChatQueryResponse:
    return ChatQueryResponse(
        answer="Grounded answer.",
        intent="coverage_extremes",
        supported=True,
        confidence="medium",
        analysis_steps=["step 1"],
        evidence=[
            ChatEvidenceItem(
                label="Coverage",
                value="82.00%",
                source="availability_daily.csv",
            )
        ],
        artifacts=[],
        warnings=["Partial coverage."],
        source_tables=["availability_daily.csv"],
        reasoning_scope="intent=coverage_extremes",
        disclaimer="Deterministic disclaimer.",
    )


class _FakeHTTPResponse:
    def __init__(self, body: dict[str, object]) -> None:
        self._payload = json.dumps(body).encode("utf-8")

    def read(self) -> bytes:
        return self._payload

    def __enter__(self) -> "_FakeHTTPResponse":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None


def test_parse_enrichment_result_accepts_fenced_json() -> None:
    response_body = {
        "output_text": """```json
        {
          "answer": "Respuesta pulida.",
          "hypotheses": ["Hipótesis tentativa."],
          "follow_up_questions": ["¿Quiere compararlo contra la mediana?"],
          "caveats": ["La cobertura sigue siendo parcial."]
        }
        ```"""
    }

    result = llm_client._parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer == "Respuesta pulida."
    assert result.hypotheses == ("Hipótesis tentativa.",)
    assert result.follow_up_questions == ("¿Quiere compararlo contra la mediana?",)
    assert result.caveats == ("La cobertura sigue siendo parcial.",)


def test_parse_enrichment_result_accepts_json_embedded_in_prose() -> None:
    response_body = {
        "output_text": (
            "Here is the grounded rewrite:\n"
            '{'
            '"answer":"Refined answer.",'
            '"hypotheses":[],'
            '"follow_up_questions":["Want the chart too?"],'
            '"caveats":["Coverage is still partial."]'
            '}'
        )
    }

    result = llm_client._parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer == "Refined answer."
    assert result.follow_up_questions == ("Want the chart too?",)


def test_parse_enrichment_result_accepts_relaxed_sectioned_text() -> None:
    response_body = {
        "output_text": """
        Answer: La principal lectura es que el 11 de febrero rompe el patrón
        del resto del período.
        Hypotheses:
        - Puede haber una ventana incompleta o una captura parcial.
        - También podría existir una incidencia temporal de monitoreo.
        Follow-up questions:
        - ¿Quiere que lo compare contra la mediana del período?
        Caveats:
        - La cobertura de ese día sigue siendo baja.
        """
    }

    result = llm_client._parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer.startswith("La principal lectura")
    assert result.hypotheses == (
        "Puede haber una ventana incompleta o una captura parcial.",
        "También podría existir una incidencia temporal de monitoreo.",
    )
    assert result.follow_up_questions == (
        "¿Quiere que lo compare contra la mediana del período?",
    )
    assert result.caveats == ("La cobertura de ese día sigue siendo baja.",)


def test_parse_enrichment_result_accepts_python_style_dict() -> None:
    response_body = {
        "output_text": (
            "{'answer': 'Narrativa útil.', 'hypotheses': ['Hipótesis tentativa'], "
            "'follow_up_questions': [], 'caveats': []}"
        )
    }

    result = llm_client._parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer == "Narrativa útil."
    assert result.hypotheses == ("Hipótesis tentativa",)


def test_parse_enrichment_result_recovers_truncated_json_payload() -> None:
    response_body = {
        "output_text": (
            '{"answer":"Según el cálculo del dataset, el 2026-02-11 tiene la cobertura más '
            'baja del rango solicitado.","hypotheses":["Hipótesis (tentativa): lluvia '
            'intensa pudo afectar la cobertura.","Hipótesis (tentativa): pudo haber una '
            'incidencia operativa externa."],"follow_up_questions":["¿Quiere que lo compare'
        )
    }

    result = llm_client._parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer.startswith("Según el cálculo del dataset")
    assert result.hypotheses == (
        "Hipótesis (tentativa): lluvia intensa pudo afectar la cobertura.",
        "Hipótesis (tentativa): pudo haber una incidencia operativa externa.",
    )
    assert result.follow_up_questions == ()


def test_parse_enrichment_result_rejects_missing_answer() -> None:
    with pytest.raises(llm_client.LLMRequestError, match="usable answer"):
        llm_client._parse_enrichment_result(
            {
                "output_text": (
                    '{"answer":"","hypotheses":[],"follow_up_questions":[],"caveats":[]}'
                )
            },
            provider="openai",
            model="gpt-5-mini",
        )


def test_extract_output_text_reads_nested_message_fragments() -> None:
    output_text = llm_client._extract_output_text(
        {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {"type": "output_text", "text": "First fragment."},
                        {"type": "output_text", "text": "Second fragment."},
                    ],
                }
            ]
        }
    )

    assert output_text == "First fragment.\nSecond fragment."


def test_coerce_jsonish_payload_accepts_trailing_commas() -> None:
    parsed = llm_client._coerce_jsonish_payload(
        '{"answer":"ok","hypotheses":["x",],"follow_up_questions":[],"caveats":[]}'
    )

    assert parsed is not None
    assert parsed["answer"] == "ok"


def test_normalize_list_discards_empty_values() -> None:
    assert llm_client._normalize_list([" a ", "", "   ", "b"]) == ("a", "b")
    assert llm_client._normalize_list("not-a-list") == ()


def test_collect_web_sources_reads_tools_and_annotations_without_duplicates() -> None:
    sources = llm_client._collect_web_sources(
        {
            "output": [
                {
                    "type": "web_search_call",
                    "action": {
                        "sources": [
                            {"url": "https://example.com/one", "title": "Example One"},
                            {"url": "https://example.com/one", "title": "Duplicate"},
                        ]
                    },
                },
                {
                    "type": "message",
                    "content": [
                        {
                            "annotations": [
                                {
                                    "type": "url_citation",
                                    "url": "https://example.com/two",
                                    "title": "Example Two",
                                }
                            ]
                        }
                    ],
                },
            ]
        }
    )

    assert len(sources) == 2
    assert sources[0].domain == "example.com"
    assert sources[1].title == "Example Two"


def test_user_safe_request_error_sanitizes_common_provider_failures() -> None:
    assert llm_client._user_safe_request_error("Invalid API key supplied.") == (
        "The narrative polish service rejected the API key."
    )
    assert llm_client._user_safe_request_error("Request timed out after 30 seconds.") == (
        "The narrative polish service timed out."
    )


def test_generate_openai_enrichment_rejects_missing_configuration() -> None:
    chat_request = ChatQueryRequest(question="What happened?", use_llm=True)
    grounded_response = _grounded_response()

    with pytest.raises(llm_client.LLMConfigurationError, match="disabled"):
        llm_client.generate_openai_enrichment(
            chat_request,
            grounded_response,
            settings=Settings(LLM_ENABLED=False),
        )

    with pytest.raises(llm_client.LLMConfigurationError, match="Unsupported LLM provider"):
        llm_client.generate_openai_enrichment(
            chat_request,
            grounded_response,
            settings=Settings(
                LLM_ENABLED=True,
                LLM_PROVIDER="anthropic",
                OPENAI_API_KEY="key",
            ),
        )

    with pytest.raises(llm_client.LLMConfigurationError, match="OPENAI_API_KEY"):
        llm_client.generate_openai_enrichment(
            chat_request,
            grounded_response,
            settings=Settings(LLM_ENABLED=True, LLM_PROVIDER="openai", OPENAI_API_KEY=""),
        )


def test_generate_openai_enrichment_successfully_builds_request(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def _fake_urlopen(raw_request, timeout: float):
        captured["timeout"] = timeout
        captured["body"] = json.loads(raw_request.data.decode("utf-8"))
        return _FakeHTTPResponse(
            {
                "output_text": (
                    '{"answer":"Polished answer.","hypotheses":[],'
                    '"follow_up_questions":[],"caveats":[]}'
                )
            }
        )

    monkeypatch.setattr("app.chat.llm_client.request.urlopen", _fake_urlopen)

    result = llm_client.generate_openai_enrichment(
        ChatQueryRequest(
            question="What happened?",
            use_llm=True,
            allow_hypotheses=True,
            external_context="Operator note.",
        ),
        _grounded_response(),
        settings=Settings(
            LLM_ENABLED=True,
            LLM_PROVIDER="openai",
            OPENAI_API_KEY="key",
            OPENAI_MODEL="gpt-5-mini",
        ),
    )

    assert result.answer == "Polished answer."
    assert captured["timeout"] == 20.0
    assert captured["body"]["model"] == "gpt-5-mini"
    assert captured["body"]["input"][0]["content"][0]["type"] == "input_text"


def test_generate_openai_enrichment_maps_http_and_network_failures(monkeypatch) -> None:
    http_error = error.HTTPError(
        url="https://api.openai.com/v1/responses",
        code=401,
        msg="Unauthorized",
        hdrs=None,
        fp=BytesIO(b'{"error":{"message":"Invalid API key."}}'),
    )

    monkeypatch.setattr(
        "app.chat.llm_client.request.urlopen",
        lambda *args, **kwargs: (_ for _ in ()).throw(http_error),
    )

    with pytest.raises(llm_client.LLMRequestError, match="rejected the API key"):
        llm_client.generate_openai_enrichment(
            ChatQueryRequest(question="What happened?", use_llm=True),
            _grounded_response(),
            settings=Settings(LLM_ENABLED=True, LLM_PROVIDER="openai", OPENAI_API_KEY="key"),
        )

    monkeypatch.setattr(
        "app.chat.llm_client.request.urlopen",
        lambda *args, **kwargs: (_ for _ in ()).throw(error.URLError("offline")),
    )

    with pytest.raises(llm_client.LLMRequestError, match="could not be reached"):
        llm_client.generate_openai_enrichment(
            ChatQueryRequest(question="What happened?", use_llm=True),
            _grounded_response(),
            settings=Settings(LLM_ENABLED=True, LLM_PROVIDER="openai", OPENAI_API_KEY="key"),
        )


def test_generate_openai_web_research_returns_sources(monkeypatch) -> None:
    def _fake_urlopen(raw_request, timeout: float):
        return _FakeHTTPResponse(
            {
                "output_text": (
                    '{"answer":"Tentative context.","hypotheses":["Possible outage."],'
                    '"follow_up_questions":["Need the raw chart?"],"caveats":["Unverified."]}'
                ),
                "output": [
                    {
                        "type": "web_search_call",
                        "action": {
                            "sources": [
                                {"url": "https://example.com/source", "title": "Example source"}
                            ]
                        },
                    }
                ],
            }
        )

    monkeypatch.setattr("app.chat.llm_client.request.urlopen", _fake_urlopen)

    result = llm_client.generate_openai_web_research(
        ChatQueryRequest(
            question="Why did coverage drop?",
            use_llm=True,
            allow_hypotheses=True,
            allow_web_research=True,
        ),
        _grounded_response(),
        settings=Settings(LLM_ENABLED=True, LLM_PROVIDER="openai", OPENAI_API_KEY="key"),
    )

    assert result.summary == "Tentative context."
    assert result.hypotheses == ("Possible outage.",)
    assert result.sources[0].url == "https://example.com/source"
