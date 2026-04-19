"""Settings parsing tests."""

from pathlib import Path

from app.core.config import Settings


def test_cors_origins_accepts_plain_string() -> None:
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000")

    assert settings.cors_origins == ["http://localhost:3000"]


def test_cors_origins_accepts_comma_separated_values() -> None:
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000,https://example.com")

    assert settings.cors_origins == ["http://localhost:3000", "https://example.com"]


def test_cors_origins_accepts_json_array() -> None:
    settings = Settings(BACKEND_CORS_ORIGINS='["http://localhost:3000","https://example.com"]')

    assert settings.cors_origins == ["http://localhost:3000", "https://example.com"]


def test_allowed_hosts_accepts_comma_separated_values() -> None:
    settings = Settings(ALLOWED_HOSTS="localhost,127.0.0.1,backend")

    assert settings.allowed_hosts == ["localhost", "127.0.0.1", "backend"]


def test_llm_provider_is_normalized() -> None:
    settings = Settings(LLM_PROVIDER="OpenAI")

    assert settings.llm_provider == "openai"


def test_reasoning_effort_accepts_supported_value() -> None:
    settings = Settings(LLM_REASONING_EFFORT="minimal")

    assert settings.llm_reasoning_effort == "minimal"


def test_openai_api_key_whitespace_is_normalized_to_none() -> None:
    settings = Settings(OPENAI_API_KEY="   ")

    assert settings.openai_api_key is None


def test_processed_data_dir_falls_back_to_local_repo_path() -> None:
    settings = Settings(PROCESSED_DATA_DIR="/app/data/processed")

    assert settings.processed_data_dir == Path.cwd().parent / "data" / "processed"
