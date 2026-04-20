"""Settings parsing tests."""

from pathlib import Path

import pytest

from app.core.config import ROOT_DIR, Settings


def test_cors_origins_accepts_plain_string() -> None:
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000")

    assert settings.cors_origins == ["http://localhost:3000"]


def test_cors_origins_accepts_comma_separated_values() -> None:
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000,https://example.com")

    assert settings.cors_origins == ["http://localhost:3000", "https://example.com"]


def test_cors_origins_accepts_json_array() -> None:
    settings = Settings(BACKEND_CORS_ORIGINS='["http://localhost:3000","https://example.com"]')

    assert settings.cors_origins == ["http://localhost:3000", "https://example.com"]


def test_cors_origins_rejects_non_list_json() -> None:
    with pytest.raises(ValueError, match="Expected a JSON list"):
        Settings(BACKEND_CORS_ORIGINS='{"origin":"http://localhost:3000"}')


def test_allowed_hosts_accepts_comma_separated_values() -> None:
    settings = Settings(ALLOWED_HOSTS="localhost,127.0.0.1,backend")

    assert settings.allowed_hosts == ["localhost", "127.0.0.1", "backend"]


def test_allowed_hosts_accepts_empty_string() -> None:
    settings = Settings(ALLOWED_HOSTS="")

    assert settings.allowed_hosts == []


def test_llm_provider_is_normalized() -> None:
    settings = Settings(LLM_PROVIDER="OpenAI")

    assert settings.llm_provider == "openai"


def test_reasoning_effort_accepts_supported_value() -> None:
    settings = Settings(LLM_REASONING_EFFORT="minimal")

    assert settings.llm_reasoning_effort == "minimal"


def test_reasoning_effort_rejects_unknown_value() -> None:
    with pytest.raises(ValueError, match="LLM_REASONING_EFFORT"):
        Settings(LLM_REASONING_EFFORT="extreme")


def test_openai_api_key_whitespace_is_normalized_to_none() -> None:
    settings = Settings(OPENAI_API_KEY="   ")

    assert settings.openai_api_key is None


def test_processed_data_dir_falls_back_to_local_repo_path() -> None:
    settings = Settings(PROCESSED_DATA_DIR="/app/data/processed")

    assert settings.processed_data_dir == ROOT_DIR / "data" / "processed"


def test_chat_memory_db_path_moves_app_path_to_repo_local_sqlite() -> None:
    settings = Settings(CHAT_MEMORY_DB_PATH="/app/state/memory.sqlite3")

    assert settings.chat_memory_db_path == ROOT_DIR / ".local" / "memory.sqlite3"


def test_chat_memory_db_path_turns_directory_into_sqlite_file(tmp_path) -> None:
    settings = Settings(CHAT_MEMORY_DB_PATH=str(tmp_path))

    assert settings.chat_memory_db_path == Path(tmp_path) / "chat_memory.sqlite3"


def test_llm_ready_requires_enabled_openai_and_api_key() -> None:
    assert Settings(LLM_ENABLED=False, OPENAI_API_KEY="key").llm_ready is False
    assert Settings(LLM_ENABLED=True, LLM_PROVIDER="azure", OPENAI_API_KEY="key").llm_ready is False
    assert Settings(LLM_ENABLED=True, LLM_PROVIDER="openai", OPENAI_API_KEY="key").llm_ready is True
