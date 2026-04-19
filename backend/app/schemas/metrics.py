"""Schemas for metrics endpoints."""

from pydantic import BaseModel


class KPI(BaseModel):
    """Summary metric for dashboard cards."""

    label: str
    value: str
    change: str


class TrendPoint(BaseModel):
    """Single point in a time series trend."""

    date: str
    availability_rate: float


class MetricsOverviewResponse(BaseModel):
    """Overview payload for the main dashboard."""

    generated_at: str
    kpis: list[KPI]
    trend: list[TrendPoint]
    notes: list[str]
