import type {
  AnomalyHighlight,
  Confidence,
  CoverageFlag,
  DayBriefing,
  IntradayProfilePoint,
  KPI,
} from "@/lib/api";

const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatShortDate(value: string): string {
  return shortDateFormatter.format(new Date(`${value}T00:00:00`));
}

export function formatLongDate(value: string): string {
  return longDateFormatter.format(new Date(`${value}T00:00:00`));
}

export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

export function formatCoverage(value: number): string {
  return percentFormatter.format(value);
}

export function formatHourFromNumber(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function confidenceLabel(value: Confidence | null): string {
  if (!value) {
    return "steady";
  }

  return value;
}

export function coverageTone(flag: CoverageFlag): string {
  if (flag === "high") {
    return "text-[color:var(--signal-cyan)]";
  }

  if (flag === "medium") {
    return "text-[color:var(--signal-amber)]";
  }

  return "text-[color:var(--signal-rose)]";
}

export function coverageChip(flag: CoverageFlag): string {
  if (flag === "high") {
    return "border-[color:rgba(90,214,195,0.3)] bg-[color:rgba(90,214,195,0.08)] text-[color:var(--signal-cyan)]";
  }

  if (flag === "medium") {
    return "border-[color:rgba(255,188,92,0.3)] bg-[color:rgba(255,188,92,0.08)] text-[color:var(--signal-amber)]";
  }

  return "border-[color:rgba(255,121,137,0.3)] bg-[color:rgba(255,121,137,0.08)] text-[color:var(--signal-rose)]";
}

export function mapKpiToUi(kpi: KPI): { label: string; value: string; caption: string } {
  const labelMap: Record<string, string> = {
    mean_signal: "Typical level",
    coverage_ratio: "Coverage",
    strongest_hour: "Peak window",
    weakest_hour: "Softest window",
    anomaly_count: "Sharp swings",
  };

  return {
    label: labelMap[kpi.key] ?? kpi.label,
    value: kpi.formatted_value,
    caption: kpi.change_label ?? kpi.context,
  };
}

export function modeLabel(value: string): string {
  if (value === "llm_enhanced") {
    return "polished";
  }

  if (value === "deterministic_fallback") {
    return "polish unavailable";
  }

  return "grounded";
}

export function sourceLabel(tableName: string): string {
  const mapping: Record<string, string> = {
    "availability_daily.csv": "daily signal",
    "availability_hourly.csv": "hourly rhythm",
    "availability_hourly_anomalies.csv": "sharp swings",
    "availability_quality_report.json": "data quality",
    "availability_overview_summary.json": "overview summary",
  };

  return mapping[tableName] ?? tableName.replaceAll("_", " ").replace(".csv", "").trim();
}

export function getIntradayExtremes(profile: IntradayProfilePoint[]) {
  const sorted = [...profile].sort((left, right) => right.mean_signal - left.mean_signal);
  const strongest = sorted[0] ?? null;
  const weakest = sorted.at(-1) ?? null;

  return { strongest, weakest };
}

export function anomalyLabel(item: AnomalyHighlight): string {
  const direction = item.anomaly_direction === "high" ? "lift" : "dip";
  return `${formatShortDate(item.date)} · ${formatHourFromNumber(item.hour)} · ${direction}`;
}

export function briefingQuestion(day: DayBriefing): string {
  return `What happened on ${day.target_date}?`;
}
