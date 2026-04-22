"""Deterministic analytics builders for dashboard and chat use cases."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from statistics import fmean, median
from typing import Literal

from app.analytics.repository import get_processed_dataset
from app.models.analytics import DailyMetric, HourlyAnomaly, HourlyMetric, QualityReport, StepChange

HIGH_COVERAGE_THRESHOLD = 0.95
MEDIUM_COVERAGE_THRESHOLD = 0.80
STRONG_ANOMALY_THRESHOLD = 1.5
DEFAULT_ANOMALY_LIMIT = 5


@dataclass(frozen=True, slots=True)
class DateSelection:
    """Selected analytics window and its comparison range."""

    requested_start: date | None
    requested_end: date | None
    effective_start: date
    effective_end: date
    comparison_start: date | None
    comparison_end: date | None


def coverage_flag(ratio: float) -> Literal["high", "medium", "low"]:
    """Map a coverage ratio into a confidence-oriented label."""
    if ratio >= HIGH_COVERAGE_THRESHOLD:
        return "high"
    if ratio >= MEDIUM_COVERAGE_THRESHOLD:
        return "medium"
    return "low"


def anomaly_confidence(n_points: int, zscore: float) -> Literal["high", "medium", "low"]:
    """Compute a practical confidence label for anomaly storytelling."""
    hourly_coverage_ratio = min(n_points / 360.0, 1.0)
    if hourly_coverage_ratio >= HIGH_COVERAGE_THRESHOLD and abs(zscore) >= STRONG_ANOMALY_THRESHOLD:
        return "high"
    if hourly_coverage_ratio >= MEDIUM_COVERAGE_THRESHOLD:
        return "medium"
    return "low"


def format_signal(value: float) -> str:
    """Format large numeric signals into compact human-readable strings."""
    absolute = abs(value)
    if absolute >= 1_000_000:
        return f"{value / 1_000_000:.2f}M"
    if absolute >= 1_000:
        return f"{value / 1_000:.1f}K"
    return f"{value:.0f}"


def format_percent(ratio: float) -> str:
    """Format a ratio as percentage text."""
    return f"{ratio * 100:.2f}%"


def format_hour_label(hour: int) -> str:
    """Format an integer hour into a display label."""
    return f"{hour:02d}:00"


def format_confidence_label(value: Literal["high", "medium", "low"]) -> str:
    """Translate internal confidence flags into Spanish UI copy."""
    if value == "high":
        return "alta"
    if value == "medium":
        return "media"
    return "baja"


def format_delta_label(current: float, previous: float | None, suffix: str = "") -> str | None:
    """Build a delta label against a previous comparable period."""
    if previous is None:
        return None
    delta = current - previous
    if abs(previous) < 1e-9:
        return f"{delta:+.0f}{suffix} frente al período comparable anterior"
    pct_delta = (delta / previous) * 100
    return f"{pct_delta:+.1f}% frente al período comparable anterior"


def _hourly_coverage_ratio(row: HourlyMetric) -> float:
    """Compute observed hourly coverage against the expected ten-second cadence."""
    return min(row.n_points / 360.0, 1.0)


def _dataset() -> tuple[
    tuple[DailyMetric, ...],
    tuple[HourlyMetric, ...],
    tuple[HourlyAnomaly, ...],
    tuple[StepChange, ...],
    QualityReport,
]:
    dataset = get_processed_dataset()
    return (
        dataset.daily,
        dataset.hourly,
        dataset.anomalies,
        dataset.step_changes,
        dataset.quality_report,
    )


def _resolve_date_selection(
    requested_start: date | None, requested_end: date | None
) -> DateSelection:
    daily_rows, _, _, _, _ = _dataset()
    available_start = daily_rows[0].date
    available_end = daily_rows[-1].date

    if requested_start and requested_end and requested_start > requested_end:
        msg = "start_date must be less than or equal to end_date."
        raise ValueError(msg)

    effective_start = max(requested_start or available_start, available_start)
    effective_end = min(requested_end or available_end, available_end)
    if effective_start > effective_end:
        msg = "Requested date range is outside the observed dataset window."
        raise LookupError(msg)

    span_days = (effective_end - effective_start).days + 1
    comparison_end = effective_start - timedelta(days=1)
    comparison_start = comparison_end - timedelta(days=span_days - 1)
    if comparison_end < available_start:
        comparison_start = None
        comparison_end = None
    else:
        comparison_start = max(comparison_start, available_start)

    return DateSelection(
        requested_start=requested_start,
        requested_end=requested_end,
        effective_start=effective_start,
        effective_end=effective_end,
        comparison_start=comparison_start,
        comparison_end=comparison_end,
    )


def _filter_daily(selection: DateSelection) -> list[DailyMetric]:
    daily_rows, _, _, _, _ = _dataset()
    rows = [
        row
        for row in daily_rows
        if selection.effective_start <= row.date <= selection.effective_end
    ]
    if not rows:
        msg = "No daily metrics are available for the selected date range."
        raise LookupError(msg)
    return rows


def _filter_hourly(selection: DateSelection) -> list[HourlyMetric]:
    _, hourly_rows, _, _, _ = _dataset()
    return [
        row
        for row in hourly_rows
        if selection.effective_start <= row.date <= selection.effective_end
    ]


def _filter_anomalies(selection: DateSelection) -> list[HourlyAnomaly]:
    _, _, anomaly_rows, _, _ = _dataset()
    return [
        row
        for row in anomaly_rows
        if selection.effective_start <= row.date <= selection.effective_end
    ]


def _filter_step_changes(selection: DateSelection) -> list[StepChange]:
    _, _, _, step_changes, _ = _dataset()
    return [
        row
        for row in step_changes
        if selection.effective_start <= row.timestamp.date() <= selection.effective_end
    ]


def _filter_comparison_daily(selection: DateSelection) -> list[DailyMetric]:
    if selection.comparison_start is None or selection.comparison_end is None:
        return []
    daily_rows, _, _, _, _ = _dataset()
    return [
        row
        for row in daily_rows
        if selection.comparison_start <= row.date <= selection.comparison_end
    ]


def _weighted_mean_signal(rows: list[DailyMetric]) -> float:
    return sum(row.mean_value * row.n_points for row in rows) / sum(row.n_points for row in rows)


def _aggregate_coverage(rows: list[DailyMetric]) -> float:
    observed_points = sum(row.n_points for row in rows)
    expected_points = sum(row.expected_points_in_observed_span for row in rows)
    return observed_points / expected_points


def _build_intraday_profile(rows: list[HourlyMetric]) -> list[dict[str, float | int | str]]:
    buckets: dict[int, list[HourlyMetric]] = defaultdict(list)
    for row in rows:
        buckets[row.hour].append(row)

    profile: list[dict[str, float | int | str]] = []
    for hour in sorted(buckets):
        hour_rows = buckets[hour]
        avg_points = fmean(item.n_points for item in hour_rows)
        coverage_ratio = min(avg_points / 360.0, 1.0)
        profile.append(
            {
                "hour": hour,
                "mean_signal": fmean(item.mean_value for item in hour_rows),
                "median_signal": median(item.mean_value for item in hour_rows),
                "avg_points": avg_points,
                "coverage_ratio": coverage_ratio,
                "coverage_flag": coverage_flag(coverage_ratio),
            }
        )
    return profile


def _build_anomaly_items(rows: list[HourlyAnomaly], limit: int) -> list[dict[str, object]]:
    sorted_rows = sorted(rows, key=lambda row: abs(row.zscore_vs_hour_baseline), reverse=True)
    items: list[dict[str, object]] = []
    for row in sorted_rows[:limit]:
        hourly_coverage_ratio = min(row.n_points / 360.0, 1.0)
        confidence = anomaly_confidence(row.n_points, row.zscore_vs_hour_baseline)
        items.append(
            {
                "hour_bucket": row.hour_bucket,
                "date": row.date,
                "hour": row.hour,
                "mean_signal": row.mean_value,
                "baseline_mean": row.baseline_mean,
                "baseline_median": row.baseline_median,
                "zscore": row.zscore_vs_hour_baseline,
                "delta_vs_hour_median": row.delta_vs_hour_median,
                "n_points": row.n_points,
                "anomaly_direction": row.anomaly_direction,
                "coverage_flag": coverage_flag(hourly_coverage_ratio),
                "confidence": confidence,
            }
        )
    return items


def _build_coverage_extreme_items(
    rows: list[DailyMetric],
    *,
    limit: int,
    reverse: bool,
) -> list[dict[str, object]]:
    sorted_rows = sorted(
        rows,
        key=lambda row: (row.coverage_ratio_in_observed_span, row.date),
        reverse=reverse,
    )
    items: list[dict[str, object]] = []
    for row in sorted_rows[:limit]:
        expected_points = row.expected_points_in_observed_span
        items.append(
            {
                "date": row.date,
                "coverage_ratio": row.coverage_ratio_in_observed_span,
                "coverage_flag": coverage_flag(row.coverage_ratio_in_observed_span),
                "n_points": row.n_points,
                "expected_points": expected_points,
                "missing_points": max(expected_points - row.n_points, 0),
                "mean_signal": row.mean_value,
            }
        )
    return items


def _build_time_window_payload(selection: DateSelection) -> dict[str, object]:
    _, _, _, _, quality = _dataset()
    return {
        "requested_start": selection.requested_start,
        "requested_end": selection.requested_end,
        "effective_start": selection.effective_start,
        "effective_end": selection.effective_end,
        "comparison_start": selection.comparison_start,
        "comparison_end": selection.comparison_end,
        "observed_dataset_start": quality.observed_start,
        "observed_dataset_end": quality.observed_end,
    }


def build_time_window_payload(selection: DateSelection) -> dict[str, object]:
    """Expose the resolved time-window payload to callers outside this module."""
    return _build_time_window_payload(selection)


def get_observed_dataset_window() -> tuple[datetime, datetime]:
    """Expose the observed dataset bounds for natural-language date parsing."""
    _, _, _, _, quality = _dataset()
    return quality.observed_start, quality.observed_end


def _build_quality_payload(selection: DateSelection) -> dict[str, object]:
    daily_rows = _filter_daily(selection)
    _, _, _, _, quality = _dataset()
    selected_coverage_ratio = _aggregate_coverage(daily_rows)
    return {
        "selected_coverage_ratio": selected_coverage_ratio,
        "selected_coverage_flag": coverage_flag(selected_coverage_ratio),
        "daily_rows_in_selection": len(daily_rows),
        "raw_file_count": quality.raw_file_count,
        "canonical_timestamp_count": quality.canonical_timestamp_count,
        "duplicate_window_groups": quality.duplicate_window_groups,
        "duplicate_window_records": quality.duplicate_window_records,
        "incomplete_window_records": quality.incomplete_window_records,
        "overlapping_timestamp_count": quality.overlapping_timestamp_count,
        "missing_points_full_range": quality.missing_points_full_range,
        "missing_ratio_full_range": quality.missing_ratio_full_range,
        "cadence_seconds_mode": quality.cadence_seconds_mode,
        "observed_start": quality.observed_start,
        "observed_end": quality.observed_end,
        "source_metric_name": quality.source_metric_name,
        "source_plot_name": quality.source_plot_name,
    }


def build_overview_snapshot(
    start_date: date | None = None,
    end_date: date | None = None,
    anomaly_limit: int = DEFAULT_ANOMALY_LIMIT,
) -> dict[str, object]:
    """Build the main dashboard overview payload from processed analytics."""
    selection = _resolve_date_selection(start_date, end_date)
    daily_rows = _filter_daily(selection)
    hourly_rows = _filter_hourly(selection)
    anomaly_rows = _filter_anomalies(selection)
    comparison_rows = _filter_comparison_daily(selection)

    current_mean_signal = _weighted_mean_signal(daily_rows)
    current_coverage_ratio = _aggregate_coverage(daily_rows)
    previous_mean_signal = _weighted_mean_signal(comparison_rows) if comparison_rows else None
    previous_coverage_ratio = _aggregate_coverage(comparison_rows) if comparison_rows else None

    intraday_profile = _build_intraday_profile(hourly_rows)
    peak_hour = max(intraday_profile, key=lambda item: item["mean_signal"])
    strong_anomaly_count = sum(
        1
        for row in anomaly_rows
        if anomaly_confidence(row.n_points, row.zscore_vs_hour_baseline) == "high"
    )

    notes = [
        "Todas las métricas salen de cálculos determinísticos sobre data/processed/.",
        (
            "La interpretación del indicador se mantiene neutral hasta que negocio "
            "confirme el significado exacto de la señal."
        ),
    ]
    selected_coverage_flag = coverage_flag(current_coverage_ratio)
    if selected_coverage_flag != "high":
        notes.append(
            (
                "La cobertura del rango seleccionado es "
                f"{format_confidence_label(selected_coverage_flag)}; "
                "conviene leer anomalías y comparaciones con cautela."
            )
        )
    if not comparison_rows:
        notes.append("No hubo un período comparable anterior para calcular variaciones.")

    return {
        "generated_at": datetime.now(timezone.utc),
        "time_window": _build_time_window_payload(selection),
        "kpis": [
            {
                "key": "mean_signal",
                "label": "Mean Signal Level",
                "value": current_mean_signal,
                "formatted_value": format_signal(current_mean_signal),
                "context": "Weighted mean signal for the selected period.",
                "change_label": format_delta_label(current_mean_signal, previous_mean_signal),
                "confidence": selected_coverage_flag,
            },
            {
                "key": "coverage_ratio",
                "label": "Observed Coverage",
                "value": current_coverage_ratio,
                "formatted_value": format_percent(current_coverage_ratio),
                "context": "Observed points over expected points inside the selected span.",
                "change_label": format_delta_label(
                    current_coverage_ratio,
                    previous_coverage_ratio,
                ),
                "confidence": selected_coverage_flag,
            },
            {
                "key": "peak_hour",
                "label": "Typical Peak Hour",
                "value": peak_hour["hour"],
                "formatted_value": format_hour_label(int(peak_hour["hour"])),
                "context": "Hour with the highest average signal in the selected range.",
                "change_label": None,
                "confidence": str(peak_hour["coverage_flag"]),
            },
            {
                "key": "strong_anomaly_count",
                "label": "High-Confidence Anomalies",
                "value": strong_anomaly_count,
                "formatted_value": str(strong_anomaly_count),
                "context": (
                    "Hourly anomalies with strong deviation and near-complete hourly support."
                ),
                "change_label": None,
                "confidence": selected_coverage_flag,
            },
        ],
        "trend": [
            {
                "date": row.date,
                "mean_signal": row.mean_value,
                "median_signal": row.median_value,
                "coverage_ratio": row.coverage_ratio_in_observed_span,
                "coverage_flag": coverage_flag(row.coverage_ratio_in_observed_span),
            }
            for row in daily_rows
        ],
        "intraday_profile": intraday_profile,
        "top_anomalies": _build_anomaly_items(anomaly_rows, anomaly_limit),
        "quality": _build_quality_payload(selection),
        "notes": notes,
    }


def build_daily_timeseries(
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, object]:
    """Build the daily trend response for the dashboard."""
    selection = _resolve_date_selection(start_date, end_date)
    daily_rows = _filter_daily(selection)
    return {
        "generated_at": datetime.now(timezone.utc),
        "time_window": _build_time_window_payload(selection),
        "points": [
            {
                "date": row.date,
                "mean_signal": row.mean_value,
                "median_signal": row.median_value,
                "coverage_ratio": row.coverage_ratio_in_observed_span,
                "coverage_flag": coverage_flag(row.coverage_ratio_in_observed_span),
            }
            for row in daily_rows
        ],
    }


def build_intraday_profile(
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, object]:
    """Build the intraday profile response for the dashboard."""
    selection = _resolve_date_selection(start_date, end_date)
    hourly_rows = _filter_hourly(selection)
    return {
        "generated_at": datetime.now(timezone.utc),
        "time_window": _build_time_window_payload(selection),
        "profile": _build_intraday_profile(hourly_rows),
    }


def build_anomaly_snapshot(
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = DEFAULT_ANOMALY_LIMIT,
) -> dict[str, object]:
    """Build the anomaly response for the dashboard."""
    selection = _resolve_date_selection(start_date, end_date)
    anomaly_rows = _filter_anomalies(selection)
    return {
        "generated_at": datetime.now(timezone.utc),
        "time_window": _build_time_window_payload(selection),
        "anomalies": _build_anomaly_items(anomaly_rows, limit),
    }


def build_quality_snapshot(
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, object]:
    """Build the quality summary response for the dashboard."""
    selection = _resolve_date_selection(start_date, end_date)
    quality = _build_quality_payload(selection)
    notes = [
        "Coverage summarises observed vs expected points inside the selected daily spans.",
        (
            "Duplicate and incomplete window counts come from the full processed "
            "dataset and remain global quality signals."
        ),
    ]
    return {
        "generated_at": datetime.now(timezone.utc),
        "time_window": _build_time_window_payload(selection),
        "quality": quality,
        "notes": notes,
    }


def build_coverage_extremes_snapshot(
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = DEFAULT_ANOMALY_LIMIT,
) -> dict[str, object]:
    """Build lowest/highest daily coverage views for quality storytelling."""
    selection = _resolve_date_selection(start_date, end_date)
    daily_rows = _filter_daily(selection)
    return {
        "generated_at": datetime.now(timezone.utc),
        "time_window": _build_time_window_payload(selection),
        "lowest_coverage_days": _build_coverage_extreme_items(
            daily_rows,
            limit=limit,
            reverse=False,
        ),
        "highest_coverage_days": _build_coverage_extreme_items(
            daily_rows,
            limit=limit,
            reverse=True,
        ),
        "notes": [
            "La cobertura se calcula como puntos diarios observados sobre puntos esperados.",
            (
                "Una cobertura baja habla de completitud del dato y no necesariamente de un "
                "incidente operativo en la señal."
            ),
        ],
    }


def _find_previous_daily_row(target_date: date) -> DailyMetric | None:
    daily_rows, _, _, _, _ = _dataset()
    previous_rows = [row for row in daily_rows if row.date < target_date]
    return previous_rows[-1] if previous_rows else None


def _briefing_hour_payload(item: dict[str, object]) -> dict[str, object]:
    return {
        "hour": int(item["hour"]),
        "label": format_hour_label(int(item["hour"])),
        "mean_signal": float(item["mean_signal"]),
        "coverage_ratio": float(item["coverage_ratio"]),
        "coverage_flag": str(item["coverage_flag"]),
    }


def build_day_briefing_snapshot(
    target_date: date | None = None,
    anomaly_limit: int = 3,
) -> dict[str, object]:
    """Build a compact single-day narrative payload for dashboard drill-downs."""
    daily_rows, _, _, _, _ = _dataset()
    resolved_target_date = target_date or daily_rows[-1].date
    selection = _resolve_date_selection(resolved_target_date, resolved_target_date)

    day_row = _filter_daily(selection)[0]
    intraday_summary = build_intraday_summary(selection)
    anomalies = _build_anomaly_items(_filter_anomalies(selection), anomaly_limit)
    strongest_hour = _briefing_hour_payload(intraday_summary["peak_hour"])
    weakest_hour = _briefing_hour_payload(intraday_summary["low_hour"])
    prior_day = _find_previous_daily_row(day_row.date)
    coverage = day_row.coverage_ratio_in_observed_span
    confidence = coverage_flag(coverage)
    delta_vs_prior_day = None
    delta_vs_prior_day_label = None
    if prior_day is not None:
        delta_vs_prior_day = day_row.mean_value - prior_day.mean_value
        delta_vs_prior_day_label = format_delta_label(day_row.mean_value, prior_day.mean_value)

    headline = "Día observado estable"
    if confidence == "low":
        headline = "Día con cobertura frágil"
    elif anomalies:
        headline = "Día con comportamiento atípico"

    strongest_hour_label = str(strongest_hour["label"])
    weakest_hour_label = str(weakest_hour["label"])
    summary = (
        f"{day_row.date.isoformat()} cerró con un nivel medio de "
        f"{format_signal(day_row.mean_value)} "
        f"y una cobertura observada de {format_percent(coverage)}. La franja más fuerte fue "
        f"{strongest_hour_label} y la más débil {weakest_hour_label}."
    )
    if anomalies:
        top_anomaly = anomalies[0]
        summary = (
            f"{summary} La desviación horaria más clara apareció cerca de "
            f"{format_hour_label(int(top_anomaly['hour']))} con confianza "
            f"{format_confidence_label(str(top_anomaly['confidence']))}."
        )

    highlights = [
        f"Cobertura: {format_percent(coverage)} ({format_confidence_label(confidence)}).",
        (
            f"Hora más fuerte: {strongest_hour_label} "
            f"({format_signal(float(strongest_hour['mean_signal']))})."
        ),
        (
            f"Hora más débil: {weakest_hour_label} "
            f"({format_signal(float(weakest_hour['mean_signal']))})."
        ),
    ]
    if anomalies:
        highlights.append(
            (
                f"Anomalía principal: {anomalies[0]['date']} "
                f"{format_hour_label(int(anomalies[0]['hour']))} "
                f"| z={float(anomalies[0]['zscore']):.2f}."
            )
        )

    cautions: list[str] = []
    if confidence != "high":
        cautions.append(
            "La cobertura de este día no es alta, así que la lectura debe tomarse con cautela."
        )
    if anomalies and anomalies[0]["confidence"] != "high":
        cautions.append(
            "La anomalía principal no tiene respaldo alto, así que conviene leerla como una "
            "señal para revisar y no como un hecho confirmado."
        )
    if prior_day is None:
        cautions.append("No hay un día observado anterior para comparar esta misma métrica.")

    suggested_questions = [
        "¿Cómo se compara este día con el día observado anterior?",
        "¿La cobertura baja coincide con anomalías horarias?",
        "¿Cuáles fueron los días con menor cobertura en todo el rango?",
    ]

    return {
        "generated_at": datetime.now(timezone.utc),
        "time_window": _build_time_window_payload(selection),
        "briefing": {
            "target_date": day_row.date,
            "headline": headline,
            "summary": summary,
            "confidence": confidence,
            "mean_signal": day_row.mean_value,
            "formatted_mean_signal": format_signal(day_row.mean_value),
            "median_signal": day_row.median_value,
            "coverage_ratio": coverage,
            "coverage_flag": confidence,
            "delta_vs_prior_day": delta_vs_prior_day,
            "delta_vs_prior_day_label": delta_vs_prior_day_label,
            "strongest_hour": strongest_hour,
            "weakest_hour": weakest_hour,
            "top_anomalies": anomalies,
            "highlights": highlights,
            "cautions": cautions,
            "suggested_questions": suggested_questions,
        },
    }


def build_period_summary(selection: DateSelection) -> dict[str, object]:
    """Return a compact deterministic period summary for chat use cases."""
    daily_rows = _filter_daily(selection)
    anomaly_rows = _filter_anomalies(selection)
    return {
        "mean_signal": _weighted_mean_signal(daily_rows),
        "coverage_ratio": _aggregate_coverage(daily_rows),
        "best_day": max(daily_rows, key=lambda row: row.mean_value),
        "weakest_day": min(daily_rows, key=lambda row: row.mean_value),
        "strong_anomaly_count": sum(
            1
            for row in anomaly_rows
            if anomaly_confidence(row.n_points, row.zscore_vs_hour_baseline) == "high"
        ),
    }


def build_period_comparison(selection: DateSelection) -> dict[str, object]:
    """Return current-period vs previous-period deterministic comparison data."""
    current = build_period_summary(selection)
    comparison_rows = _filter_comparison_daily(selection)
    comparison_summary = None
    if comparison_rows:
        comparison_summary = {
            "mean_signal": _weighted_mean_signal(comparison_rows),
            "coverage_ratio": _aggregate_coverage(comparison_rows),
        }
    return {
        "current": current,
        "comparison": comparison_summary,
    }


def build_selection(start_date: date | None = None, end_date: date | None = None) -> DateSelection:
    """Expose date selection resolution for chat orchestration."""
    return _resolve_date_selection(start_date, end_date)


def build_intraday_summary(selection: DateSelection) -> dict[str, object]:
    """Return compact intraday summary data for chat use cases."""
    profile = _build_intraday_profile(_filter_hourly(selection))
    peak_hour = max(profile, key=lambda item: item["mean_signal"])
    low_hour = min(profile, key=lambda item: item["mean_signal"])
    return {
        "peak_hour": peak_hour,
        "low_hour": low_hour,
        "profile": profile,
    }


def _hourly_bucket_payload(row: HourlyMetric) -> dict[str, object]:
    coverage_ratio = _hourly_coverage_ratio(row)
    return {
        "date": row.date,
        "hour": row.hour,
        "label": format_hour_label(row.hour),
        "hour_bucket": row.hour_bucket,
        "n_points": row.n_points,
        "mean_signal": row.mean_value,
        "coverage_ratio": coverage_ratio,
        "coverage_flag": coverage_flag(coverage_ratio),
    }


def _boundary_truncation_note(row: HourlyMetric) -> str | None:
    _, _, _, _, quality = _dataset()
    if (
        row.date == quality.observed_end.date()
        and row.hour == quality.observed_end.hour
        and row.n_points < 360
    ):
        return (
            "This bucket is truncated by the observed dataset end, so it should be read as "
            "an incomplete closing hour rather than a confirmed operational drop."
        )
    if (
        row.date == quality.observed_start.date()
        and row.hour == quality.observed_start.hour
        and row.n_points < 360
    ):
        return (
            "This bucket starts after the observed dataset opening timestamp, so it is "
            "partially observed rather than fully missing."
        )
    return None


def build_hourly_coverage_summary(
    selection: DateSelection,
    *,
    direction: Literal["lowest", "highest"] = "lowest",
) -> dict[str, object]:
    """Return a deterministic ranking of hourly coverage buckets for the selection."""
    selected_rows = _filter_hourly(selection)
    if not selected_rows:
        msg = "No hourly metrics are available for the selected date range."
        raise LookupError(msg)

    reverse = direction == "highest"
    ranked_selection = sorted(
        selected_rows,
        key=lambda row: (_hourly_coverage_ratio(row), row.date, row.hour),
        reverse=reverse,
    )
    focus_row = ranked_selection[0]
    runner_up_row = ranked_selection[1] if len(ranked_selection) > 1 else None
    all_hourly_rows = _dataset()[1]
    ranked_dataset = sorted(
        all_hourly_rows,
        key=lambda row: (_hourly_coverage_ratio(row), row.date, row.hour),
        reverse=reverse,
    )
    global_rank = next(
        index
        for index, row in enumerate(ranked_dataset, start=1)
        if row.date == focus_row.date and row.hour == focus_row.hour
    )
    coverage_values = [_hourly_coverage_ratio(row) for row in selected_rows]
    median_coverage_ratio = median(coverage_values)
    reference_row = max(selected_rows, key=_hourly_coverage_ratio)
    if direction == "highest":
        reference_row = min(selected_rows, key=_hourly_coverage_ratio)

    profile = [
        {
            **_hourly_bucket_payload(row),
            "highlight": row.date == focus_row.date and row.hour == focus_row.hour,
        }
        for row in sorted(selected_rows, key=lambda row: (row.date, row.hour))
    ]
    boundary_note = _boundary_truncation_note(focus_row)
    focus_coverage = _hourly_coverage_ratio(focus_row)
    runner_up_coverage = (
        _hourly_coverage_ratio(runner_up_row) if runner_up_row is not None else None
    )

    return {
        "direction": direction,
        "focus_bucket": _hourly_bucket_payload(focus_row),
        "runner_up_bucket": (
            _hourly_bucket_payload(runner_up_row) if runner_up_row is not None else None
        ),
        "reference_bucket": _hourly_bucket_payload(reference_row),
        "selection_median_coverage_ratio": median_coverage_ratio,
        "selection_bucket_count": len(selected_rows),
        "coverage_gap_vs_median": focus_coverage - median_coverage_ratio,
        "coverage_gap_vs_runner_up": (
            focus_coverage - runner_up_coverage
            if runner_up_coverage is not None
            else None
        ),
        "global_rank": global_rank,
        "global_bucket_count": len(ranked_dataset),
        "boundary_note": boundary_note,
        "coverage_formula": "observed hourly points / 360 expected ten-second samples",
        "profile": profile,
    }


def build_hourly_coverage_profile_summary(selection: DateSelection) -> dict[str, object]:
    """Return coverage-by-hour profile across the selected range."""
    selected_rows = _filter_hourly(selection)
    if not selected_rows:
        msg = "No hourly metrics are available for the selected date range."
        raise LookupError(msg)

    buckets: dict[int, list[HourlyMetric]] = defaultdict(list)
    for row in selected_rows:
        buckets[row.hour].append(row)

    profile: list[dict[str, object]] = []
    for hour in sorted(buckets):
        hour_rows = buckets[hour]
        avg_coverage_ratio = fmean(_hourly_coverage_ratio(row) for row in hour_rows)
        profile.append(
            {
                "hour": hour,
                "label": format_hour_label(hour),
                "coverage_ratio": avg_coverage_ratio,
                "coverage_flag": coverage_flag(avg_coverage_ratio),
                "mean_signal": fmean(row.mean_value for row in hour_rows),
                "sample_days": len(hour_rows),
                "avg_points": fmean(row.n_points for row in hour_rows),
            }
        )

    strongest_hour = max(profile, key=lambda item: float(item["coverage_ratio"]))
    weakest_hour = min(profile, key=lambda item: float(item["coverage_ratio"]))
    return {
        "profile": profile,
        "strongest_hour": strongest_hour,
        "weakest_hour": weakest_hour,
        "selection_bucket_count": len(selected_rows),
    }


def build_daily_coverage_profile_summary(selection: DateSelection) -> dict[str, object]:
    """Return deterministic daily coverage points across the selected range."""
    daily_rows = _filter_daily(selection)
    profile = [_daily_coverage_point(row) for row in daily_rows]
    strongest_day = max(profile, key=lambda item: float(item["coverage_ratio"]))
    weakest_day = min(profile, key=lambda item: float(item["coverage_ratio"]))
    coverage_values = [float(item["coverage_ratio"]) for item in profile]
    mean_coverage = fmean(coverage_values)
    median_coverage = median(coverage_values)
    return {
        "profile": profile,
        "strongest_day": strongest_day,
        "weakest_day": weakest_day,
        "selection_day_count": len(profile),
        "mean_coverage_ratio": mean_coverage,
        "median_coverage_ratio": median_coverage,
        "coverage_spread": (
            float(strongest_day["coverage_ratio"]) - float(weakest_day["coverage_ratio"])
        ),
        "weakest_gap_vs_median": float(weakest_day["coverage_ratio"]) - median_coverage,
        "strongest_gap_vs_median": float(strongest_day["coverage_ratio"]) - median_coverage,
    }


def _is_weekend_day(value: date) -> bool:
    return value.weekday() >= 5


def _daily_coverage_point(row: DailyMetric) -> dict[str, object]:
    return {
        "date": row.date,
        "label": row.date.isoformat(),
        "coverage_ratio": row.coverage_ratio_in_observed_span,
        "coverage_flag": coverage_flag(row.coverage_ratio_in_observed_span),
        "mean_signal": row.mean_value,
        "n_points": row.n_points,
    }


def build_weekday_weekend_summary(selection: DateSelection) -> dict[str, object]:
    """Return deterministic weekday vs weekend coverage comparison data."""
    daily_rows = _filter_daily(selection)
    weekday_rows = [row for row in daily_rows if not _is_weekend_day(row.date)]
    weekend_rows = [row for row in daily_rows if _is_weekend_day(row.date)]
    if not weekday_rows or not weekend_rows:
        msg = "The selected range needs both weekday and weekend coverage to compare them."
        raise LookupError(msg)

    weekday_coverage = _aggregate_coverage(weekday_rows)
    weekend_coverage = _aggregate_coverage(weekend_rows)
    coverage_gap = weekend_coverage - weekday_coverage
    weekend_low = min(weekend_rows, key=lambda row: row.coverage_ratio_in_observed_span)
    weekend_high = max(weekend_rows, key=lambda row: row.coverage_ratio_in_observed_span)
    return {
        "weekday": {
            "label": "weekday",
            "coverage_ratio": weekday_coverage,
            "coverage_flag": coverage_flag(weekday_coverage),
            "mean_signal": _weighted_mean_signal(weekday_rows),
            "day_count": len(weekday_rows),
        },
        "weekend": {
            "label": "weekend",
            "coverage_ratio": weekend_coverage,
            "coverage_flag": coverage_flag(weekend_coverage),
            "mean_signal": _weighted_mean_signal(weekend_rows),
            "day_count": len(weekend_rows),
        },
        "coverage_gap": coverage_gap,
        "weekday_points": [_daily_coverage_point(row) for row in weekday_rows],
        "weekend_points": [_daily_coverage_point(row) for row in weekend_rows],
        "weekend_low": _daily_coverage_point(weekend_low),
        "weekend_high": _daily_coverage_point(weekend_high),
    }


def build_anomaly_summary(selection: DateSelection) -> dict[str, object]:
    """Return compact anomaly and step-change summaries for chat use cases."""
    anomalies = _build_anomaly_items(_filter_anomalies(selection), DEFAULT_ANOMALY_LIMIT)
    step_changes = [
        change for change in _filter_step_changes(selection) if not change.is_gap_or_reset
    ]
    return {
        "anomalies": anomalies,
        "non_gap_step_changes": len(step_changes),
    }


def build_quality_summary(selection: DateSelection) -> dict[str, object]:
    """Return quality summary data for chat use cases."""
    return _build_quality_payload(selection)


def build_coverage_extremes_summary(
    selection: DateSelection,
    limit: int = 3,
) -> dict[str, object]:
    """Return compact daily coverage extremes for chat use cases."""
    daily_rows = _filter_daily(selection)
    return {
        "lowest_coverage_days": _build_coverage_extreme_items(
            daily_rows,
            limit=limit,
            reverse=False,
        ),
        "highest_coverage_days": _build_coverage_extreme_items(
            daily_rows,
            limit=limit,
            reverse=True,
        ),
    }


def build_day_briefing_summary(target_date: date | None = None) -> dict[str, object]:
    """Return the single-day briefing payload for chat and dashboard drill-downs."""
    return build_day_briefing_snapshot(target_date=target_date)["briefing"]
