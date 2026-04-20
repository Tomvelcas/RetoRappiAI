"""Health endpoint tests."""

from fastapi.testclient import TestClient


def test_healthcheck(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "AI Powered Dashboard API"
    assert isinstance(payload["llm"]["enabled"], bool)
    assert isinstance(payload["llm"]["ready"], bool)
    assert payload["llm"]["provider"]
    assert isinstance(payload["chat"]["memory_enabled"], bool)
    assert payload["chat"]["memory_backend"] in {"sqlite", "disabled"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
