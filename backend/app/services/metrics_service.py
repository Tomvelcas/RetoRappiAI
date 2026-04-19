"""Service layer for dashboard metrics."""

from __future__ import annotations

from datetime import date

from app.analytics.overview import (
    build_anomaly_snapshot,
    build_coverage_extremes_snapshot,
    build_daily_timeseries,
    build_day_briefing_snapshot,
    build_intraday_profile,
    build_overview_snapshot,
    build_quality_snapshot,
)
from app.schemas.metrics import (
    DailySeriesResponse,
    IntradayProfileResponse,
    MetricsAnomaliesResponse,
    MetricsCoverageExtremesResponse,
    MetricsDayBriefingResponse,
    MetricsOverviewResponse,
    MetricsQualityResponse,
)


def get_metrics_overview(
    start_date: date | None = None,
    end_date: date | None = None,
    anomaly_limit: int = 5,
) -> MetricsOverviewResponse:
    """Build the overview payload returned to the frontend dashboard."""
    snapshot = build_overview_snapshot(
        start_date=start_date,
        end_date=end_date,
        anomaly_limit=anomaly_limit,
    )
    return MetricsOverviewResponse(**snapshot)


def get_daily_series(
    start_date: date | None = None,
    end_date: date | None = None,
) -> DailySeriesResponse:
    """Return the daily time-series payload for the dashboard."""
    snapshot = build_daily_timeseries(start_date=start_date, end_date=end_date)
    return DailySeriesResponse(**snapshot)


def get_intraday_profile(
    start_date: date | None = None,
    end_date: date | None = None,
) -> IntradayProfileResponse:
    """Return the intraday profile payload for the dashboard."""
    snapshot = build_intraday_profile(start_date=start_date, end_date=end_date)
    return IntradayProfileResponse(**snapshot)


def get_metrics_anomalies(
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 5,
) -> MetricsAnomaliesResponse:
    """Return anomaly highlights for the selected period."""
    snapshot = build_anomaly_snapshot(start_date=start_date, end_date=end_date, limit=limit)
    return MetricsAnomaliesResponse(**snapshot)


def get_metrics_quality(
    start_date: date | None = None,
    end_date: date | None = None,
) -> MetricsQualityResponse:
    """Return quality indicators for the selected period."""
    snapshot = build_quality_snapshot(start_date=start_date, end_date=end_date)
    return MetricsQualityResponse(**snapshot)


def get_metrics_coverage_extremes(
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 5,
) -> MetricsCoverageExtremesResponse:
    """Return the best and worst daily coverage rows for the selected period."""
    snapshot = build_coverage_extremes_snapshot(
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    return MetricsCoverageExtremesResponse(**snapshot)


def get_metrics_day_briefing(
    target_date: date | None = None,
    anomaly_limit: int = 3,
) -> MetricsDayBriefingResponse:
    """Return the day briefing payload for a selected observed day."""
    snapshot = build_day_briefing_snapshot(
        target_date=target_date,
        anomaly_limit=anomaly_limit,
    )
    return MetricsDayBriefingResponse(**snapshot)
