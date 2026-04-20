"""Shared pytest fixtures."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def isolate_test_runtime(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """Keep tests local, deterministic, and independent from the developer runtime."""
    monkeypatch.setenv("CHAT_AUTO_LLM", "false")
    monkeypatch.setenv("CHAT_MEMORY_DB_PATH", str(tmp_path / "chat_memory.sqlite3"))
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def client() -> TestClient:
    """Return a test client for API requests."""
    return TestClient(app)
