"""Schemas for service health responses."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Basic service health payload."""

    status: str
    service: str
    environment: str
