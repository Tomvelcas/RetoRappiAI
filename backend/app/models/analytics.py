"""Internal typed models for processed analytics data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True, slots=True)
class DailyMetric:
    """Daily aggregate row derived from the processed dataset."""

    date: date
    n_points: int
    min_value: int
    max_value: int
    mean_value: float
    median_value: float
    std_value: float
    first_value: int
    last_value: int
    first_timestamp: datetime
    last_timestamp: datetime
    delta_close_open: float
    pct_change_close_open: float | None
    expected_points_in_observed_span: int
    coverage_ratio_in_observed_span: float


@dataclass(frozen=True, slots=True)
class HourlyMetric:
    """Hourly aggregate row with baseline comparison fields."""

    date: date
    hour: int
    hour_bucket: datetime
    mean_value: float
    median_value: float
    min_value: int
    max_value: int
    std_value: float | None
    first_value: int
    last_value: int
    n_points: int
    delta_close_open: float
    pct_change_close_open: float | None
    baseline_mean: float | None
    baseline_median: float | None
    baseline_std: float | None
    zscore_vs_hour_baseline: float | None
    delta_vs_hour_median: float | None


@dataclass(frozen=True, slots=True)
class HourlyAnomaly:
    """Candidate hourly anomaly row."""

    hour_bucket: datetime
    date: date
    hour: int
    mean_value: float
    baseline_mean: float
    baseline_median: float
    baseline_std: float
    zscore_vs_hour_baseline: float
    delta_vs_hour_median: float
    n_points: int
    anomaly_direction: str


@dataclass(frozen=True, slots=True)
class StepChange:
    """Point-to-point change candidate in the canonical series."""

    timestamp: datetime
    value: int
    delta_10s: float
    pct_change_10s: float | None
    is_gap_or_reset: bool
    timestamp_occurrences: int
    has_conflicting_values: bool


@dataclass(frozen=True, slots=True)
class QualityReport:
    """Dataset-level quality summary loaded from processed JSON."""

    raw_file_count: int
    raw_timestamp_cells: int
    canonical_timestamp_count: int
    duplicate_window_groups: int
    duplicate_window_records: int
    incomplete_window_records: int
    conflicting_timestamp_count: int
    overlapping_timestamp_count: int
    unique_window_count: int
    cadence_seconds_mode: int
    observed_start: datetime
    observed_end: datetime
    expected_points_full_range: int
    missing_points_full_range: int
    missing_ratio_full_range: float
    source_metric_name: str
    source_plot_name: str
