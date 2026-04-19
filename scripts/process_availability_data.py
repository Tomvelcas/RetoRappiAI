"""Build processed analytical artifacts from the raw availability CSV exports."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "data" / "raw"
PROCESSED_DIR = ROOT_DIR / "data" / "processed"
SAMPLES_DIR = ROOT_DIR / "data" / "samples"

TIMESTAMP_FORMAT = "%a %b %d %Y %H:%M:%S GMT%z"
STANDARD_CADENCE_SECONDS = 10
STANDARD_WINDOW_POINTS = 363
STANDARD_WINDOW_DURATION_SECONDS = 3620


@dataclass(frozen=True)
class QualityReport:
    """High-level quality summary for the processed availability dataset."""

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
    observed_start: str
    observed_end: str
    expected_points_full_range: int
    missing_points_full_range: int
    missing_ratio_full_range: float
    source_metric_name: str
    source_plot_name: str


def parse_export_timestamp(label: str) -> datetime:
    """Parse timestamp headers from the raw CSV export format."""

    cleaned = re.sub(r"\s*\([^)]*\)$", "", label.strip())
    return datetime.strptime(cleaned, TIMESTAMP_FORMAT)


def _serialize_timestamp(value: Any) -> str:
    """Serialize timezone-aware timestamps consistently for CSV/JSON outputs."""

    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def load_raw_windows_and_points(raw_dir: Path = RAW_DIR) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Read the raw CSV exports into window-level and point-level dataframes."""

    window_records: list[dict[str, Any]] = []
    point_records: list[dict[str, Any]] = []

    for path in sorted(raw_dir.glob("*.csv")):
        with path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.reader(handle)
            header = next(reader)
            row = next(reader)

        plot_name, metric_name, value_prefix, value_suffix = row[:4]
        timestamps = [parse_export_timestamp(label) for label in header[4:]]
        values = [int(float(value)) for value in row[4:]]
        cadence_seconds = (
            int((timestamps[1] - timestamps[0]).total_seconds()) if len(timestamps) > 1 else 0
        )
        window_start = timestamps[0]
        window_end = timestamps[-1]
        window_duration_seconds = int((window_end - window_start).total_seconds())
        fingerprint = hashlib.sha1(
            json.dumps(values, separators=(",", ":")).encode("utf-8")
        ).hexdigest()

        window_records.append(
            {
                "source_file": path.name,
                "plot_name": plot_name,
                "metric_name": metric_name,
                "value_prefix": value_prefix,
                "value_suffix": value_suffix,
                "window_start": window_start,
                "window_end": window_end,
                "point_count": len(timestamps),
                "cadence_seconds": cadence_seconds,
                "window_duration_seconds": window_duration_seconds,
                "window_fingerprint": fingerprint,
                "first_value": values[0],
                "last_value": values[-1],
                "min_value": min(values),
                "max_value": max(values),
                "mean_value": round(sum(values) / len(values), 2),
            }
        )

        for timestamp, value in zip(timestamps, values):
            point_records.append(
                {
                    "timestamp": timestamp,
                    "value": value,
                    "source_file": path.name,
                    "window_start": window_start,
                    "window_end": window_end,
                    "window_fingerprint": fingerprint,
                }
            )

    windows_df = pd.DataFrame(window_records).sort_values(["window_start", "source_file"]).reset_index(
        drop=True
    )
    points_df = pd.DataFrame(point_records).sort_values(["timestamp", "source_file"]).reset_index(
        drop=True
    )
    return windows_df, points_df


def annotate_windows(windows_df: pd.DataFrame) -> pd.DataFrame:
    """Flag duplicate and incomplete windows."""

    windows_df = windows_df.copy()
    duplicate_keys = ["window_start", "window_end", "point_count", "window_fingerprint"]
    windows_df["duplicate_rank"] = windows_df.groupby(duplicate_keys).cumcount() + 1
    windows_df["duplicate_group_size"] = windows_df.groupby(duplicate_keys)["source_file"].transform(
        "size"
    )
    windows_df["is_duplicate_window"] = windows_df["duplicate_group_size"] > 1
    windows_df["is_canonical_window"] = windows_df["duplicate_rank"] == 1
    windows_df["is_incomplete_window"] = (
        (windows_df["point_count"] != STANDARD_WINDOW_POINTS)
        | (windows_df["window_duration_seconds"] != STANDARD_WINDOW_DURATION_SECONDS)
        | (windows_df["cadence_seconds"] != STANDARD_CADENCE_SECONDS)
    )
    windows_df["window_day"] = pd.to_datetime(windows_df["window_start"]).dt.date.astype(str)
    return windows_df


def build_canonical_series(windows_df: pd.DataFrame, points_df: pd.DataFrame) -> pd.DataFrame:
    """Build a timestamp-level canonical series, deduplicated across overlapping windows."""

    metadata_cols = [
        "source_file",
        "window_start",
        "window_end",
        "window_fingerprint",
        "duplicate_rank",
        "duplicate_group_size",
        "is_duplicate_window",
        "is_canonical_window",
        "is_incomplete_window",
    ]
    merged = points_df.merge(
        windows_df[metadata_cols],
        on=["source_file", "window_start", "window_end", "window_fingerprint"],
        how="left",
    )
    merged = merged.sort_values(["timestamp", "duplicate_rank", "source_file"]).reset_index(drop=True)

    occurrence_stats = (
        merged.groupby("timestamp")
        .agg(
            timestamp_occurrences=("value", "size"),
            unique_values=("value", "nunique"),
            value_min=("value", "min"),
            value_max=("value", "max"),
        )
        .reset_index()
    )
    occurrence_stats["has_conflicting_values"] = occurrence_stats["unique_values"] > 1

    canonical = merged.drop_duplicates(subset=["timestamp"], keep="first").merge(
        occurrence_stats, on="timestamp", how="left"
    )
    canonical["date"] = pd.to_datetime(canonical["timestamp"]).dt.date.astype(str)
    canonical["hour"] = pd.to_datetime(canonical["timestamp"]).dt.hour
    canonical["hour_bucket"] = pd.to_datetime(canonical["timestamp"]).dt.floor("H")
    canonical["delta_10s"] = canonical["value"].diff()
    canonical["pct_change_10s"] = canonical["value"].pct_change() * 100
    return canonical


def build_hourly_aggregate(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate the canonical series to hourly resolution."""

    hourly = (
        canonical_df.groupby(["date", "hour", "hour_bucket"])
        .agg(
            mean_value=("value", "mean"),
            median_value=("value", "median"),
            min_value=("value", "min"),
            max_value=("value", "max"),
            std_value=("value", "std"),
            first_value=("value", "first"),
            last_value=("value", "last"),
            n_points=("value", "size"),
        )
        .reset_index()
    )
    hourly["delta_close_open"] = hourly["last_value"] - hourly["first_value"]
    hourly["pct_change_close_open"] = (
        hourly["delta_close_open"] / hourly["first_value"].replace(0, pd.NA) * 100
    )

    baseline = (
        hourly[hourly["n_points"] >= 300]
        .groupby("hour")
        .agg(
            baseline_mean=("mean_value", "mean"),
            baseline_median=("mean_value", "median"),
            baseline_std=("mean_value", "std"),
        )
        .reset_index()
    )
    hourly = hourly.merge(baseline, on="hour", how="left")
    hourly["zscore_vs_hour_baseline"] = (
        hourly["mean_value"] - hourly["baseline_mean"]
    ) / hourly["baseline_std"].replace(0, pd.NA)
    hourly["delta_vs_hour_median"] = hourly["mean_value"] - hourly["baseline_median"]
    return hourly


def build_daily_aggregate(canonical_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate the canonical series to daily resolution."""

    daily = (
        canonical_df.groupby("date")
        .agg(
            n_points=("value", "size"),
            min_value=("value", "min"),
            max_value=("value", "max"),
            mean_value=("value", "mean"),
            median_value=("value", "median"),
            std_value=("value", "std"),
            first_value=("value", "first"),
            last_value=("value", "last"),
            first_timestamp=("timestamp", "min"),
            last_timestamp=("timestamp", "max"),
        )
        .reset_index()
    )
    daily["delta_close_open"] = daily["last_value"] - daily["first_value"]
    daily["pct_change_close_open"] = (
        daily["delta_close_open"] / daily["first_value"].replace(0, pd.NA) * 100
    )
    span_seconds = (
        pd.to_datetime(daily["last_timestamp"]) - pd.to_datetime(daily["first_timestamp"])
    ).dt.total_seconds()
    daily["expected_points_in_observed_span"] = (span_seconds / STANDARD_CADENCE_SECONDS + 1).round().astype(
        int
    )
    daily["coverage_ratio_in_observed_span"] = (
        daily["n_points"] / daily["expected_points_in_observed_span"]
    )
    return daily


def build_hourly_anomaly_candidates(hourly_df: pd.DataFrame, limit: int = 20) -> pd.DataFrame:
    """Return hourly anomalies against the per-hour baseline profile."""

    candidates = hourly_df.copy()
    candidates = candidates[candidates["baseline_std"].notna()].copy()
    candidates["anomaly_direction"] = candidates["zscore_vs_hour_baseline"].apply(
        lambda value: "high" if value >= 0 else "low"
    )
    candidates["abs_zscore"] = candidates["zscore_vs_hour_baseline"].abs()
    candidates = candidates.sort_values("abs_zscore", ascending=False).head(limit)
    return candidates[
        [
            "hour_bucket",
            "date",
            "hour",
            "mean_value",
            "baseline_mean",
            "baseline_median",
            "baseline_std",
            "zscore_vs_hour_baseline",
            "delta_vs_hour_median",
            "n_points",
            "anomaly_direction",
        ]
    ].reset_index(drop=True)


def build_step_change_candidates(canonical_df: pd.DataFrame, limit: int = 20) -> pd.DataFrame:
    """Return the largest point-to-point jumps in the canonical series."""

    candidates = canonical_df.copy()
    candidates["abs_delta_10s"] = candidates["delta_10s"].abs()
    candidates["is_gap_or_reset"] = (
        (pd.to_datetime(candidates["timestamp"]).diff().dt.total_seconds() != STANDARD_CADENCE_SECONDS)
        | (candidates["value"] == 0)
    )
    candidates = candidates.sort_values("abs_delta_10s", ascending=False).head(limit)
    return candidates[
        [
            "timestamp",
            "value",
            "delta_10s",
            "pct_change_10s",
            "is_gap_or_reset",
            "timestamp_occurrences",
            "has_conflicting_values",
        ]
    ].reset_index(drop=True)


def build_quality_report(windows_df: pd.DataFrame, canonical_df: pd.DataFrame) -> QualityReport:
    """Create a dataset-level quality summary."""

    observed_start = pd.to_datetime(canonical_df["timestamp"]).min()
    observed_end = pd.to_datetime(canonical_df["timestamp"]).max()
    expected_points = len(
        pd.date_range(start=observed_start, end=observed_end, freq=f"{STANDARD_CADENCE_SECONDS}S")
    )
    missing_points = expected_points - len(canonical_df)
    cadence_mode = int(windows_df["cadence_seconds"].mode().iloc[0])

    return QualityReport(
        raw_file_count=int(len(windows_df)),
        raw_timestamp_cells=int(windows_df["point_count"].sum()),
        canonical_timestamp_count=int(len(canonical_df)),
        duplicate_window_groups=int(
            windows_df.loc[windows_df["is_duplicate_window"], "window_fingerprint"].nunique()
        ),
        duplicate_window_records=int(windows_df["is_duplicate_window"].sum()),
        incomplete_window_records=int(windows_df["is_incomplete_window"].sum()),
        conflicting_timestamp_count=int(canonical_df["has_conflicting_values"].sum()),
        overlapping_timestamp_count=int((canonical_df["timestamp_occurrences"] > 1).sum()),
        unique_window_count=int(windows_df["window_fingerprint"].nunique()),
        cadence_seconds_mode=cadence_mode,
        observed_start=_serialize_timestamp(observed_start),
        observed_end=_serialize_timestamp(observed_end),
        expected_points_full_range=expected_points,
        missing_points_full_range=int(missing_points),
        missing_ratio_full_range=round(missing_points / expected_points, 6),
        source_metric_name=str(windows_df["metric_name"].mode().iloc[0]),
        source_plot_name=str(windows_df["plot_name"].mode().iloc[0]),
    )


def _clean_output_directory(directory: Path) -> None:
    """Delete prior generated artifacts while keeping tracked placeholders intact."""

    directory.mkdir(parents=True, exist_ok=True)
    for path in directory.iterdir():
        if path.name == ".gitkeep":
            continue
        if path.is_file():
            path.unlink()


def _write_csv(df: pd.DataFrame, path: Path) -> None:
    """Write a dataframe to CSV with timestamp columns serialized to ISO format."""

    serializable = df.copy()
    for column in serializable.columns:
        if pd.api.types.is_datetime64_any_dtype(serializable[column]):
            serializable[column] = serializable[column].map(_serialize_timestamp)
    serializable.to_csv(path, index=False)


def materialize_outputs(
    windows_df: pd.DataFrame,
    canonical_df: pd.DataFrame,
    hourly_df: pd.DataFrame,
    daily_df: pd.DataFrame,
    anomaly_df: pd.DataFrame,
    step_change_df: pd.DataFrame,
    quality_report: QualityReport,
    processed_dir: Path = PROCESSED_DIR,
    samples_dir: Path = SAMPLES_DIR,
) -> dict[str, Path]:
    """Persist processed dataframes and compact samples to disk."""

    _clean_output_directory(processed_dir)
    _clean_output_directory(samples_dir)

    processed_paths = {
        "windows": processed_dir / "availability_window_metadata.csv",
        "canonical": processed_dir / "availability_long_canonical.csv",
        "hourly": processed_dir / "availability_hourly.csv",
        "daily": processed_dir / "availability_daily.csv",
        "hourly_anomalies": processed_dir / "availability_hourly_anomalies.csv",
        "step_changes": processed_dir / "availability_step_changes.csv",
        "quality": processed_dir / "availability_quality_report.json",
        "overview": processed_dir / "availability_overview_summary.json",
    }

    _write_csv(windows_df, processed_paths["windows"])
    _write_csv(canonical_df, processed_paths["canonical"])
    _write_csv(hourly_df, processed_paths["hourly"])
    _write_csv(daily_df, processed_paths["daily"])
    _write_csv(anomaly_df, processed_paths["hourly_anomalies"])
    _write_csv(step_change_df, processed_paths["step_changes"])

    with processed_paths["quality"].open("w", encoding="utf-8") as handle:
        json.dump(asdict(quality_report), handle, indent=2, ensure_ascii=False)

    overview_payload = {
        "range_start": quality_report.observed_start,
        "range_end": quality_report.observed_end,
        "canonical_timestamp_count": quality_report.canonical_timestamp_count,
        "duplicate_window_groups": quality_report.duplicate_window_groups,
        "incomplete_window_records": quality_report.incomplete_window_records,
        "top_hourly_anomalies": anomaly_df.head(5).assign(
            hour_bucket=lambda frame: frame["hour_bucket"].map(_serialize_timestamp)
        ).to_dict(orient="records"),
        "latest_daily_rows": daily_df.tail(5).assign(
            first_timestamp=lambda frame: pd.to_datetime(frame["first_timestamp"]).map(
                _serialize_timestamp
            ),
            last_timestamp=lambda frame: pd.to_datetime(frame["last_timestamp"]).map(
                _serialize_timestamp
            ),
        ).to_dict(orient="records"),
    }
    with processed_paths["overview"].open("w", encoding="utf-8") as handle:
        json.dump(overview_payload, handle, indent=2, ensure_ascii=False)

    sample_day = "2026-02-10"
    sample_paths = {
        "sample_day": samples_dir / f"availability_sample_day_{sample_day}.csv",
        "sample_anomalies": samples_dir / "availability_sample_hourly_anomalies.csv",
    }
    _write_csv(canonical_df[canonical_df["date"] == sample_day], sample_paths["sample_day"])
    _write_csv(anomaly_df.head(10), sample_paths["sample_anomalies"])

    return processed_paths | sample_paths


def run_pipeline() -> dict[str, Any]:
    """Execute the full raw-to-processed availability pipeline."""

    windows_df, points_df = load_raw_windows_and_points()
    windows_df = annotate_windows(windows_df)
    canonical_df = build_canonical_series(windows_df, points_df)
    hourly_df = build_hourly_aggregate(canonical_df)
    daily_df = build_daily_aggregate(canonical_df)
    anomaly_df = build_hourly_anomaly_candidates(hourly_df)
    step_change_df = build_step_change_candidates(canonical_df)
    quality_report = build_quality_report(windows_df, canonical_df)
    output_paths = materialize_outputs(
        windows_df=windows_df,
        canonical_df=canonical_df,
        hourly_df=hourly_df,
        daily_df=daily_df,
        anomaly_df=anomaly_df,
        step_change_df=step_change_df,
        quality_report=quality_report,
    )
    return {
        "windows": windows_df,
        "canonical": canonical_df,
        "hourly": hourly_df,
        "daily": daily_df,
        "anomalies": anomaly_df,
        "step_changes": step_change_df,
        "quality_report": quality_report,
        "output_paths": output_paths,
    }


def main() -> None:
    """CLI entrypoint for generating processed artifacts."""

    result = run_pipeline()
    quality_report = result["quality_report"]

    print("Processed availability dataset generated successfully.")
    print(f"Raw files: {quality_report.raw_file_count}")
    print(f"Canonical timestamps: {quality_report.canonical_timestamp_count}")
    print(f"Duplicate window groups: {quality_report.duplicate_window_groups}")
    print(f"Incomplete windows: {quality_report.incomplete_window_records}")
    print(f"Observed range: {quality_report.observed_start} -> {quality_report.observed_end}")
    print("Artifacts:")
    for label, path in result["output_paths"].items():
        print(f"- {label}: {path.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    main()
