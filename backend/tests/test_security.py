"""Security-oriented HTTP behavior tests."""

from fastapi.testclient import TestClient


def test_disallowed_host_is_rejected(client: TestClient) -> None:
    response = client.get("/health", headers={"host": "malicious.example"})

    assert response.status_code == 400
