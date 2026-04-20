"""Unit tests for optional LLM enrichment parsing."""

from app.chat.llm_client import _parse_enrichment_result


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

    result = _parse_enrichment_result(
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

    result = _parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer == "Refined answer."
    assert result.follow_up_questions == ("Want the chart too?",)


def test_parse_enrichment_result_accepts_relaxed_sectioned_text() -> None:
    response_body = {
        "output_text": """
        Answer: La principal lectura es que el 11 de febrero rompe el patrón del resto del período.
        Hypotheses:
        - Puede haber una ventana incompleta o una captura parcial.
        - También podría existir una incidencia temporal de monitoreo.
        Follow-up questions:
        - ¿Quiere que lo compare contra la mediana del período?
        Caveats:
        - La cobertura de ese día sigue siendo baja.
        """
    }

    result = _parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer.startswith("La principal lectura")
    assert result.hypotheses == (
        "Puede haber una ventana incompleta o una captura parcial.",
        "También podría existir una incidencia temporal de monitoreo.",
    )
    assert result.follow_up_questions == ("¿Quiere que lo compare contra la mediana del período?",)
    assert result.caveats == ("La cobertura de ese día sigue siendo baja.",)


def test_parse_enrichment_result_accepts_python_style_dict() -> None:
    response_body = {
        "output_text": (
            "{'answer': 'Narrativa útil.', 'hypotheses': ['Hipótesis tentativa'], "
            "'follow_up_questions': [], 'caveats': []}"
        )
    }

    result = _parse_enrichment_result(
        response_body,
        provider="openai",
        model="gpt-5-mini",
    )

    assert result.answer == "Narrativa útil."
    assert result.hypotheses == ("Hipótesis tentativa",)
