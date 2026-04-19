"""Access layer for processed analytical artifacts."""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.models.analytics import DailyMetric, HourlyAnomaly, HourlyMetric, QualityReport, StepChange


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _parse_int(value: str) -> int:
    return int(value)


def _parse_float(value: str) -> float:
    return float(value)


def _parse_optional_float(value: str) -> float | None:
    return None if value == "" else float(value)


def _parse_bool(value: str) -> bool:
    return value == "True"


@dataclass(frozen=True, slots=True)
class ProcessedDataset:
    """Fully loaded processed dataset used by analytics services."""

    daily: tuple[DailyMetric, ...]
    hourly: tuple[HourlyMetric, ...]
    anomalies: tuple[HourlyAnomaly, ...]
    step_changes: tuple[StepChange, ...]
    quality_report: QualityReport


class ProcessedAnalyticsRepository:
    """Load and serve processed analytics artifacts from disk."""

    def __init__(self, processed_dir: Path) -> None:
        self._processed_dir = processed_dir

    def load(self) -> ProcessedDataset:
        """Load the processed dataset into typed in-memory structures."""
        return ProcessedDataset(
            daily=self._load_daily(),
            hourly=self._load_hourly(),
            anomalies=self._load_anomalies(),
            step_changes=self._load_step_changes(),
            quality_report=self._load_quality_report(),
        )

    def _artifact_path(self, filename: str) -> Path:
        path = self._processed_dir / filename
        if not path.exists():
            msg = f"Processed analytics artifact not found: {path}"
            raise FileNotFoundError(msg)
        return path

    def _load_daily(self) -> tuple[DailyMetric, ...]:
        rows: list[DailyMetric] = []
        with self._artifact_path("availability_daily.csv").open(
            newline="", encoding="utf-8"
        ) as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                rows.append(
                    DailyMetric(
                        date=_parse_date(row["date"]),
                        n_points=_parse_int(row["n_points"]),
                        min_value=_parse_int(row["min_value"]),
                        max_value=_parse_int(row["max_value"]),
                        mean_value=_parse_float(row["mean_value"]),
                        median_value=_parse_float(row["median_value"]),
                        std_value=_parse_optional_float(row["std_value"]),
                        first_value=_parse_int(row["first_value"]),
                        last_value=_parse_int(row["last_value"]),
                        first_timestamp=_parse_datetime(row["first_timestamp"]),
                        last_timestamp=_parse_datetime(row["last_timestamp"]),
                        delta_close_open=_parse_float(row["delta_close_open"]),
                        pct_change_close_open=_parse_optional_float(row["pct_change_close_open"]),
                        expected_points_in_observed_span=_parse_int(
                            row["expected_points_in_observed_span"]
                        ),
                        coverage_ratio_in_observed_span=_parse_float(
                            row["coverage_ratio_in_observed_span"]
                        ),
                    )
                )
        return tuple(rows)

    def _load_hourly(self) -> tuple[HourlyMetric, ...]:
        rows: list[HourlyMetric] = []
        with self._artifact_path("availability_hourly.csv").open(
            newline="", encoding="utf-8"
        ) as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                rows.append(
                    HourlyMetric(
                        date=_parse_date(row["date"]),
                        hour=_parse_int(row["hour"]),
                        hour_bucket=_parse_datetime(row["hour_bucket"]),
                        mean_value=_parse_float(row["mean_value"]),
                        median_value=_parse_float(row["median_value"]),
                        min_value=_parse_int(row["min_value"]),
                        max_value=_parse_int(row["max_value"]),
                        std_value=_parse_optional_float(row["std_value"]),
                        first_value=_parse_int(row["first_value"]),
                        last_value=_parse_int(row["last_value"]),
                        n_points=_parse_int(row["n_points"]),
                        delta_close_open=_parse_float(row["delta_close_open"]),
                        pct_change_close_open=_parse_optional_float(row["pct_change_close_open"]),
                        baseline_mean=_parse_optional_float(row["baseline_mean"]),
                        baseline_median=_parse_optional_float(row["baseline_median"]),
                        baseline_std=_parse_optional_float(row["baseline_std"]),
                        zscore_vs_hour_baseline=_parse_optional_float(
                            row["zscore_vs_hour_baseline"]
                        ),
                        delta_vs_hour_median=_parse_optional_float(row["delta_vs_hour_median"]),
                    )
                )
        return tuple(rows)

    def _load_anomalies(self) -> tuple[HourlyAnomaly, ...]:
        rows: list[HourlyAnomaly] = []
        with self._artifact_path("availability_hourly_anomalies.csv").open(
            newline="", encoding="utf-8"
        ) as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                rows.append(
                    HourlyAnomaly(
                        hour_bucket=_parse_datetime(row["hour_bucket"]),
                        date=_parse_date(row["date"]),
                        hour=_parse_int(row["hour"]),
                        mean_value=_parse_float(row["mean_value"]),
                        baseline_mean=_parse_float(row["baseline_mean"]),
                        baseline_median=_parse_float(row["baseline_median"]),
                        baseline_std=_parse_float(row["baseline_std"]),
                        zscore_vs_hour_baseline=_parse_float(row["zscore_vs_hour_baseline"]),
                        delta_vs_hour_median=_parse_float(row["delta_vs_hour_median"]),
                        n_points=_parse_int(row["n_points"]),
                        anomaly_direction=row["anomaly_direction"],
                    )
                )
        return tuple(rows)

    def _load_step_changes(self) -> tuple[StepChange, ...]:
        rows: list[StepChange] = []
        with self._artifact_path("availability_step_changes.csv").open(
            newline="", encoding="utf-8"
        ) as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                rows.append(
                    StepChange(
                        timestamp=_parse_datetime(row["timestamp"]),
                        value=_parse_int(row["value"]),
                        delta_10s=_parse_float(row["delta_10s"]),
                        pct_change_10s=_parse_optional_float(row["pct_change_10s"]),
                        is_gap_or_reset=_parse_bool(row["is_gap_or_reset"]),
                        timestamp_occurrences=_parse_int(row["timestamp_occurrences"]),
                        has_conflicting_values=_parse_bool(row["has_conflicting_values"]),
                    )
                )
        return tuple(rows)

    def _load_quality_report(self) -> QualityReport:
        path = self._artifact_path("availability_quality_report.json")
        payload: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        return QualityReport(
            raw_file_count=int(payload["raw_file_count"]),
            raw_timestamp_cells=int(payload["raw_timestamp_cells"]),
            canonical_timestamp_count=int(payload["canonical_timestamp_count"]),
            duplicate_window_groups=int(payload["duplicate_window_groups"]),
            duplicate_window_records=int(payload["duplicate_window_records"]),
            incomplete_window_records=int(payload["incomplete_window_records"]),
            conflicting_timestamp_count=int(payload["conflicting_timestamp_count"]),
            overlapping_timestamp_count=int(payload["overlapping_timestamp_count"]),
            unique_window_count=int(payload["unique_window_count"]),
            cadence_seconds_mode=int(payload["cadence_seconds_mode"]),
            observed_start=_parse_datetime(payload["observed_start"]),
            observed_end=_parse_datetime(payload["observed_end"]),
            expected_points_full_range=int(payload["expected_points_full_range"]),
            missing_points_full_range=int(payload["missing_points_full_range"]),
            missing_ratio_full_range=float(payload["missing_ratio_full_range"]),
            source_metric_name=str(payload["source_metric_name"]),
            source_plot_name=str(payload["source_plot_name"]),
        )


@lru_cache
def get_processed_dataset() -> ProcessedDataset:
    """Return a cached typed representation of the processed dataset."""
    settings = get_settings()
    repository = ProcessedAnalyticsRepository(settings.processed_data_dir)
    return repository.load()
