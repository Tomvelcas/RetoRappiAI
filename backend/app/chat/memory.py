"""Lightweight sqlite-backed conversation context for the analytics copilot."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path

from app.core.config import Settings, get_settings


@dataclass(frozen=True, slots=True)
class ConversationState:
    """Minimal persisted state used to carry analytical context across turns."""

    conversation_id: str
    intent: str
    output_intent: str
    brain_mode: str
    effective_start: date
    effective_end: date
    referenced_dates: tuple[str, ...]
    last_question: str
    updated_at: datetime


class ConversationMemory:
    """Persist and retrieve minimal copilot context using sqlite."""

    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._ensure_database()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_database(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS conversation_state (
                    conversation_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def get(self, conversation_id: str) -> ConversationState | None:
        """Return the last known analytical state for a conversation."""
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT payload_json
                FROM conversation_state
                WHERE conversation_id = ?
                """,
                (conversation_id,),
            ).fetchone()
        if row is None:
            return None
        payload = json.loads(str(row["payload_json"]))
        return ConversationState(
            conversation_id=str(payload["conversation_id"]),
            intent=str(payload["intent"]),
            output_intent=str(payload["output_intent"]),
            brain_mode=str(payload["brain_mode"]),
            effective_start=date.fromisoformat(str(payload["effective_start"])),
            effective_end=date.fromisoformat(str(payload["effective_end"])),
            referenced_dates=tuple(str(item) for item in payload["referenced_dates"]),
            last_question=str(payload["last_question"]),
            updated_at=datetime.fromisoformat(str(payload["updated_at"])),
        )

    def save(self, state: ConversationState) -> None:
        """Upsert the latest analytical state for a conversation."""
        payload = asdict(state)
        payload["effective_start"] = state.effective_start.isoformat()
        payload["effective_end"] = state.effective_end.isoformat()
        payload["referenced_dates"] = list(state.referenced_dates)
        payload["updated_at"] = state.updated_at.isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO conversation_state (conversation_id, payload_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(conversation_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (
                    state.conversation_id,
                    json.dumps(payload, ensure_ascii=True),
                    state.updated_at.isoformat(),
                ),
            )


@lru_cache
def get_conversation_memory(
    db_path: str | None = None,
    *,
    settings: Settings | None = None,
) -> ConversationMemory | None:
    """Return a cached conversation memory store when enabled."""
    runtime_settings = settings or get_settings()
    if not runtime_settings.chat_memory_enabled:
        return None
    resolved_path = Path(db_path) if db_path is not None else runtime_settings.chat_memory_db_path
    return ConversationMemory(resolved_path)


def build_conversation_state(
    *,
    conversation_id: str,
    intent: str,
    output_intent: str,
    brain_mode: str,
    effective_start: date,
    effective_end: date,
    referenced_dates: tuple[date, ...],
    last_question: str,
) -> ConversationState:
    """Normalize state persistence payload for a successful analytical turn."""
    return ConversationState(
        conversation_id=conversation_id,
        intent=intent,
        output_intent=output_intent,
        brain_mode=brain_mode,
        effective_start=effective_start,
        effective_end=effective_end,
        referenced_dates=tuple(item.isoformat() for item in referenced_dates),
        last_question=last_question,
        updated_at=datetime.now(timezone.utc),
    )
