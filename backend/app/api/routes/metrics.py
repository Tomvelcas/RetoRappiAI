"""Metrics endpoints backed by deterministic analytics."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.metrics import (
    DailySeriesResponse,
    IntradayProfileResponse,
    MetricsAnomaliesResponse,
    MetricsCoverageExtremesResponse,
    MetricsDayBriefingResponse,
    MetricsOverviewResponse,
    MetricsQualityResponse,
)
from app.services.metrics_service import (
    get_daily_series,
    get_intraday_profile,
    get_metrics_anomalies,
    get_metrics_coverage_extremes,
    get_metrics_day_briefing,
    get_metrics_overview,
    get_metrics_quality,
)

router = APIRouter()

START_DATE_QUERY = Query(default=None)
END_DATE_QUERY = Query(default=None)
OVERVIEW_ANOMALY_LIMIT_QUERY = Query(default=5, ge=1, le=10)
ANOMALY_LIMIT_QUERY = Query(default=5, ge=1, le=20)
COVERAGE_LIMIT_QUERY = Query(default=5, ge=1, le=10)
DAY_BRIEFING_LIMIT_QUERY = Query(default=3, ge=1, le=5)
DAY_BRIEFING_DATE_QUERY = Query(default=None)


def _translate_analytics_error(error: Exception) -> HTTPException:
    if isinstance(error, ValueError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


@router.get("/overview", response_model=MetricsOverviewResponse)
def overview(
    start_date: date | None = START_DATE_QUERY,
    end_date: date | None = END_DATE_QUERY,
    anomaly_limit: int = OVERVIEW_ANOMALY_LIMIT_QUERY,
) -> MetricsOverviewResponse:
    """Return high-level dashboard metrics."""
    try:
        return get_metrics_overview(
            start_date=start_date,
            end_date=end_date,
            anomaly_limit=anomaly_limit,
        )
    except (LookupError, ValueError) as error:
        raise _translate_analytics_error(error) from error


@router.get("/daily", response_model=DailySeriesResponse)
def daily(
    start_date: date | None = START_DATE_QUERY,
    end_date: date | None = END_DATE_QUERY,
) -> DailySeriesResponse:
    """Return the daily time-series for the selected range."""
    try:
        return get_daily_series(start_date=start_date, end_date=end_date)
    except (LookupError, ValueError) as error:
        raise _translate_analytics_error(error) from error


@router.get("/intraday-profile", response_model=IntradayProfileResponse)
def intraday_profile(
    start_date: date | None = START_DATE_QUERY,
    end_date: date | None = END_DATE_QUERY,
) -> IntradayProfileResponse:
    """Return the aggregated intraday profile for the selected range."""
    try:
        return get_intraday_profile(start_date=start_date, end_date=end_date)
    except (LookupError, ValueError) as error:
        raise _translate_analytics_error(error) from error


@router.get("/anomalies", response_model=MetricsAnomaliesResponse)
def anomalies(
    start_date: date | None = START_DATE_QUERY,
    end_date: date | None = END_DATE_QUERY,
    limit: int = ANOMALY_LIMIT_QUERY,
) -> MetricsAnomaliesResponse:
    """Return anomaly highlights for the selected range."""
    try:
        return get_metrics_anomalies(start_date=start_date, end_date=end_date, limit=limit)
    except (LookupError, ValueError) as error:
        raise _translate_analytics_error(error) from error


@router.get("/quality", response_model=MetricsQualityResponse)
def quality(
    start_date: date | None = START_DATE_QUERY,
    end_date: date | None = END_DATE_QUERY,
) -> MetricsQualityResponse:
    """Return quality indicators for the selected range."""
    try:
        return get_metrics_quality(start_date=start_date, end_date=end_date)
    except (LookupError, ValueError) as error:
        raise _translate_analytics_error(error) from error


@router.get("/coverage-extremes", response_model=MetricsCoverageExtremesResponse)
def coverage_extremes(
    start_date: date | None = START_DATE_QUERY,
    end_date: date | None = END_DATE_QUERY,
    limit: int = COVERAGE_LIMIT_QUERY,
) -> MetricsCoverageExtremesResponse:
    """Return the daily rows with the lowest and highest observed coverage."""
    try:
        return get_metrics_coverage_extremes(
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )
    except (LookupError, ValueError) as error:
        raise _translate_analytics_error(error) from error


@router.get("/day-briefing", response_model=MetricsDayBriefingResponse)
def day_briefing(
    target_date: date | None = DAY_BRIEFING_DATE_QUERY,
    anomaly_limit: int = DAY_BRIEFING_LIMIT_QUERY,
) -> MetricsDayBriefingResponse:
    """Return a narrative drill-down for a selected observed day."""
    try:
        return get_metrics_day_briefing(
            target_date=target_date,
            anomaly_limit=anomaly_limit,
        )
    except (LookupError, ValueError) as error:
        raise _translate_analytics_error(error) from error
