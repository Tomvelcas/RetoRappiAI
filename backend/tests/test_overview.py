"""Targeted analytics builder coverage tests."""

from __future__ import annotations

from datetime import date

import pytest

from app.analytics.overview import (
    build_anomaly_summary,
    build_day_briefing_summary,
    build_hourly_coverage_summary,
    build_period_comparison,
    build_quality_summary,
    build_selection,
    build_weekday_weekend_summary,
)


def test_build_selection_rejects_ranges_outside_observed_window() -> None:
    with pytest.raises(LookupError, match="outside the observed dataset window"):
        build_selection(date(2025, 1, 1), date(2025, 1, 2))


def test_build_period_comparison_has_no_previous_window_at_dataset_start() -> None:
    selection = build_selection(date(2026, 2, 1), date(2026, 2, 1))

    comparison = build_period_comparison(selection)

    assert comparison["current"]["coverage_ratio"] > 0
    assert comparison["comparison"] is None


def test_build_weekday_weekend_summary_requires_both_segments() -> None:
    selection = build_selection(date(2026, 2, 1), date(2026, 2, 1))

    with pytest.raises(LookupError, match="both weekday and weekend"):
        build_weekday_weekend_summary(selection)


def test_build_anomaly_summary_counts_non_gap_step_changes() -> None:
    selection = build_selection(date(2026, 2, 1), date(2026, 2, 11))

    summary = build_anomaly_summary(selection)

    assert "anomalies" in summary
    assert int(summary["non_gap_step_changes"]) >= 0


def test_build_quality_summary_exposes_processed_quality_fields() -> None:
    selection = build_selection(date(2026, 2, 1), date(2026, 2, 11))

    summary = build_quality_summary(selection)

    assert float(summary["selected_coverage_ratio"]) > 0
    assert str(summary["source_metric_name"])
    assert int(summary["duplicate_window_groups"]) >= 0


def test_build_hourly_coverage_summary_supports_highest_direction() -> None:
    selection = build_selection(date(2026, 2, 11), date(2026, 2, 11))

    summary = build_hourly_coverage_summary(selection, direction="highest")

    assert summary["direction"] == "highest"
    assert summary["focus_bucket"]["coverage_ratio"] >= 0
    assert summary["profile"]


def test_build_day_briefing_summary_defaults_to_latest_observed_day() -> None:
    summary = build_day_briefing_summary()

    assert summary["target_date"] == date(2026, 2, 11)
    assert summary["headline"]
    assert summary["suggested_questions"]
