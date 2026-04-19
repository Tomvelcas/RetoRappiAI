"""Metrics endpoint tests."""

from fastapi.testclient import TestClient


def test_metrics_overview_returns_placeholder_data(client: TestClient) -> None:
    response = client.get("/api/v1/metrics/overview")

    assert response.status_code == 200
    payload = response.json()
    assert "kpis" in payload
    assert len(payload["kpis"]) == 3
    assert payload["trend"][0]["availability_rate"] > 0
