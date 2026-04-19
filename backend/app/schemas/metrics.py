"""Schemas for metrics endpoints."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class TimeWindow(BaseModel):
    """Resolved time window used to build an analytics response."""

    requested_start: date | None
    requested_end: date | None
    effective_start: date
    effective_end: date
    comparison_start: date | None = None
    comparison_end: date | None = None
    observed_dataset_start: datetime
    observed_dataset_end: datetime


class KPI(BaseModel):
    """Summary metric for dashboard cards."""

    key: str
    label: str
    value: float | int | str
    formatted_value: str
    context: str
    change_label: str | None = None
    confidence: Literal["high", "medium", "low"] | None = None


class DailyTrendPoint(BaseModel):
    """Daily trend point for the dashboard."""

    date: date
    mean_signal: float
    median_signal: float
    coverage_ratio: float
    coverage_flag: Literal["high", "medium", "low"]


class IntradayProfilePoint(BaseModel):
    """Aggregated intraday profile point."""

    hour: int
    mean_signal: float
    median_signal: float
    avg_points: float
    coverage_ratio: float
    coverage_flag: Literal["high", "medium", "low"]


class AnomalyHighlight(BaseModel):
    """Hourly anomaly ready for dashboard and chat evidence panels."""

    hour_bucket: datetime
    date: date
    hour: int
    mean_signal: float
    baseline_mean: float
    baseline_median: float
    zscore: float
    delta_vs_hour_median: float
    n_points: int
    anomaly_direction: str
    coverage_flag: Literal["high", "medium", "low"]
    confidence: Literal["high", "medium", "low"]


class QualitySummary(BaseModel):
    """Quality indicators for the selected period and the full dataset."""

    selected_coverage_ratio: float
    selected_coverage_flag: Literal["high", "medium", "low"]
    daily_rows_in_selection: int
    raw_file_count: int
    canonical_timestamp_count: int
    duplicate_window_groups: int
    duplicate_window_records: int
    incomplete_window_records: int
    overlapping_timestamp_count: int
    missing_points_full_range: int
    missing_ratio_full_range: float
    cadence_seconds_mode: int
    observed_start: datetime
    observed_end: datetime
    source_metric_name: str
    source_plot_name: str


class CoverageExtremePoint(BaseModel):
    """Daily coverage extreme for data-quality tables and charts."""

    date: date
    coverage_ratio: float
    coverage_flag: Literal["high", "medium", "low"]
    n_points: int
    expected_points: int
    missing_points: int
    mean_signal: float


class DayBriefingHour(BaseModel):
    """Hourly summary item for a day briefing."""

    hour: int
    label: str
    mean_signal: float
    coverage_ratio: float
    coverage_flag: Literal["high", "medium", "low"]


class DayBriefing(BaseModel):
    """Narrative and supporting analytics for a single observed day."""

    target_date: date
    headline: str
    summary: str
    confidence: Literal["high", "medium", "low"]
    mean_signal: float
    formatted_mean_signal: str
    median_signal: float
    coverage_ratio: float
    coverage_flag: Literal["high", "medium", "low"]
    delta_vs_prior_day: float | None = None
    delta_vs_prior_day_label: str | None = None
    strongest_hour: DayBriefingHour
    weakest_hour: DayBriefingHour
    top_anomalies: list[AnomalyHighlight]
    highlights: list[str]
    cautions: list[str]
    suggested_questions: list[str]


class MetricsOverviewResponse(BaseModel):
    """Overview payload for the main dashboard."""

    generated_at: datetime
    time_window: TimeWindow
    kpis: list[KPI]
    trend: list[DailyTrendPoint]
    intraday_profile: list[IntradayProfilePoint]
    top_anomalies: list[AnomalyHighlight]
    quality: QualitySummary
    notes: list[str]


class DailySeriesResponse(BaseModel):
    """Dedicated daily time-series endpoint payload."""

    generated_at: datetime
    time_window: TimeWindow
    points: list[DailyTrendPoint]


class IntradayProfileResponse(BaseModel):
    """Dedicated intraday profile endpoint payload."""

    generated_at: datetime
    time_window: TimeWindow
    profile: list[IntradayProfilePoint]


class MetricsAnomaliesResponse(BaseModel):
    """Dedicated anomaly endpoint payload."""

    generated_at: datetime
    time_window: TimeWindow
    anomalies: list[AnomalyHighlight]


class MetricsQualityResponse(BaseModel):
    """Dedicated quality endpoint payload."""

    generated_at: datetime
    time_window: TimeWindow
    quality: QualitySummary
    notes: list[str]


class MetricsCoverageExtremesResponse(BaseModel):
    """Coverage extremes endpoint payload."""

    generated_at: datetime
    time_window: TimeWindow
    lowest_coverage_days: list[CoverageExtremePoint]
    highest_coverage_days: list[CoverageExtremePoint]
    notes: list[str]


class MetricsDayBriefingResponse(BaseModel):
    """Narrative snapshot for a single selected day."""

    generated_at: datetime
    time_window: TimeWindow
    briefing: DayBriefing
