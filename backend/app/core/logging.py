"""Logging configuration."""

import logging


def configure_logging() -> None:
    """Apply a simple structured-ish logging baseline for local development."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
