"""Service layer for dashboard metrics."""

from app.analytics.overview import build_overview_snapshot
from app.schemas.metrics import MetricsOverviewResponse


def get_metrics_overview() -> MetricsOverviewResponse:
    """Build the overview payload returned to the frontend dashboard."""
    snapshot = build_overview_snapshot()
    return MetricsOverviewResponse(**snapshot)
