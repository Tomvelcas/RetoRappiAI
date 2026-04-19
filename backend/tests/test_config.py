"""Settings parsing tests."""

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
