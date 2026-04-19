"""Placeholder deterministic analytics for dashboard overview data."""

from __future__ import annotations

from typing import Any


def build_overview_snapshot() -> dict[str, Any]:
    """Return mocked metrics shaped like future production analytics output."""
    return {
        "generated_at": "2026-04-18T10:00:00Z",
        "kpis": [
            {
                "label": "Availability Rate",
                "value": "96.4%",
                "change": "+1.2 pts vs. prior period",
            },
            {
                "label": "Affected Stores",
                "value": "14",
                "change": "-3 stores vs. prior period",
            },
            {
                "label": "Incident Hours",
                "value": "27",
                "change": "-8.5% vs. prior period",
            },
        ],
        "trend": [
            {"date": "2026-04-12", "availability_rate": 95.8},
            {"date": "2026-04-13", "availability_rate": 96.1},
            {"date": "2026-04-14", "availability_rate": 96.0},
            {"date": "2026-04-15", "availability_rate": 96.3},
            {"date": "2026-04-16", "availability_rate": 96.2},
            {"date": "2026-04-17", "availability_rate": 96.5},
            {"date": "2026-04-18", "availability_rate": 96.4},
        ],
        "notes": [
            "Placeholder metrics will be replaced by validated deterministic calculations.",
            "Chat responses should cite these analytics outputs rather than invent values.",
        ],
    }
