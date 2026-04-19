"""Metrics endpoints backed by deterministic placeholder analytics."""

from fastapi import APIRouter

from app.schemas.metrics import MetricsOverviewResponse
from app.services.metrics_service import get_metrics_overview

router = APIRouter()


@router.get("/overview", response_model=MetricsOverviewResponse)
def overview() -> MetricsOverviewResponse:
    """Return high-level dashboard metrics."""
    return get_metrics_overview()
