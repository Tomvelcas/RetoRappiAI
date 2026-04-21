"""Application configuration."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Typed environment-driven application settings."""

    app_name: str = Field(default="AI Powered Dashboard API", alias="APP_NAME")
    app_env: str = Field(default="local", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8418, alias="APP_PORT")
    processed_data_dir: Path = Field(
        default=ROOT_DIR / "data" / "processed",
        alias="PROCESSED_DATA_DIR",
    )
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default=["http://localhost:3418"],
        alias="BACKEND_CORS_ORIGINS",
    )
    allowed_hosts: Annotated[list[str], NoDecode] = Field(
        default=["localhost", "127.0.0.1", "testserver"],
        alias="ALLOWED_HOSTS",
    )
    llm_enabled: bool = Field(default=False, alias="LLM_ENABLED")
    llm_provider: str = Field(default="openai", alias="LLM_PROVIDER")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-5-mini", alias="OPENAI_MODEL")
    llm_timeout_seconds: float = Field(default=20.0, alias="LLM_TIMEOUT_SECONDS")
    llm_reasoning_effort: str = Field(default="low", alias="LLM_REASONING_EFFORT")
    llm_max_output_tokens: int = Field(
        default=520,
        alias="LLM_MAX_OUTPUT_TOKENS",
        ge=64,
        le=2_000,
    )
    llm_max_evidence_items: int = Field(
        default=5,
        alias="LLM_MAX_EVIDENCE_ITEMS",
        ge=1,
        le=10,
    )
    llm_max_warning_items: int = Field(
        default=4,
        alias="LLM_MAX_WARNING_ITEMS",
        ge=0,
        le=10,
    )
    llm_external_context_max_chars: int = Field(
        default=600,
        alias="LLM_EXTERNAL_CONTEXT_MAX_CHARS",
        ge=100,
        le=4_000,
    )
    chat_auto_llm: bool = Field(default=True, alias="CHAT_AUTO_LLM")
    chat_memory_enabled: bool = Field(default=True, alias="CHAT_MEMORY_ENABLED")
    chat_memory_db_path: Path = Field(
        default=ROOT_DIR / ".local" / "chat_memory.sqlite3",
        alias="CHAT_MEMORY_DB_PATH",
    )
    chat_memory_max_turns: int = Field(
        default=8,
        alias="CHAT_MEMORY_MAX_TURNS",
        ge=2,
        le=20,
    )

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @staticmethod
    def _parse_string_list(value: str | list[str]) -> list[str]:
        """Allow plain strings, comma-separated values, or JSON arrays."""
        if isinstance(value, list):
            return value
        value = value.strip()
        if not value:
            return []
        if value.startswith("[") or value.startswith("{"):
            parsed = json.loads(value)
            if not isinstance(parsed, list):
                msg = "Expected a JSON list."
                raise ValueError(msg)
            return [str(item).strip() for item in parsed if str(item).strip()]
        return [item.strip() for item in value.split(",") if item.strip()]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Allow plain strings, comma-separated values, or JSON arrays."""
        return cls._parse_string_list(value)

    @field_validator("allowed_hosts", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, value: str | list[str]) -> list[str]:
        """Allow plain strings, comma-separated values, or JSON arrays."""
        return cls._parse_string_list(value)

    @field_validator("processed_data_dir", mode="after")
    @classmethod
    def resolve_processed_data_dir(cls, value: Path) -> Path:
        """Fall back to the repo-local processed path during local execution."""
        if value.exists():
            return value
        local_default = ROOT_DIR / "data" / "processed"
        if local_default.exists():
            return local_default
        return value

    @field_validator("chat_memory_db_path", mode="after")
    @classmethod
    def resolve_chat_memory_db_path(cls, value: Path) -> Path:
        """Default chat memory to a repo-local sqlite file during local execution."""
        if str(value).startswith("/app/") and not Path("/app").exists():
            return ROOT_DIR / ".local" / value.name
        if value.is_dir():
            return value / "chat_memory.sqlite3"
        return value

    @field_validator("llm_provider", mode="before")
    @classmethod
    def normalize_llm_provider(cls, value: str) -> str:
        """Normalize the provider name for simpler runtime checks."""
        return value.strip().lower()

    @field_validator("openai_api_key", mode="before")
    @classmethod
    def normalize_openai_api_key(cls, value: str | None) -> str | None:
        """Normalize empty or whitespace-only API keys to None."""
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("llm_reasoning_effort", mode="before")
    @classmethod
    def validate_reasoning_effort(cls, value: str) -> str:
        """Restrict reasoning effort to the supported GPT-5-style values."""
        normalized = value.strip().lower()
        allowed = {"minimal", "low", "medium", "high"}
        if normalized not in allowed:
            msg = "LLM_REASONING_EFFORT must be one of: minimal, low, medium, high."
            raise ValueError(msg)
        return normalized

    @property
    def llm_ready(self) -> bool:
        """Return whether optional LLM enrichment is fully configured."""
        if not self.llm_enabled:
            return False
        if self.llm_provider != "openai":
            return False
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()
