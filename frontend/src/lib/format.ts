import type {
  AnomalyHighlight,
  Confidence,
  CoverageFlag,
  DayBriefing,
  IntradayProfilePoint,
  KPI,
} from "@/lib/api";

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const compactNumberFormatter = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("es-CO", {
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
    return "estable";
  }

  if (value === "high") {
    return "alta";
  }

  if (value === "medium") {
    return "media";
  }

  return "baja";
}

export function supportStatusLabel(value: Confidence | null): string {
  if (!value) {
    return "estable";
  }

  if (value === "high") {
    return "bien cubierto";
  }

  if (value === "medium") {
    return "con soporte medio";
  }

  return "frágil";
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

function translateMetricCaption(kpi: KPI): string {
  const translatedDelta = kpi.change_label
    ?.replace("vs. prior comparable period", "frente al período comparable anterior")
    .replace("vs prior comparable period", "frente al período comparable anterior");

  const captionMap: Record<string, string> = {
    mean_signal: "Promedio del rango seleccionado.",
    coverage_ratio: "Qué tanto soporte tienen los datos del rango.",
    peak_hour: "Franja donde la señal suele verse más fuerte.",
    strong_anomaly_count: "Eventos atípicos con respaldo suficiente para priorizar.",
  };

  return translatedDelta ?? captionMap[kpi.key] ?? kpi.context;
}

export function mapKpiToUi(kpi: KPI): { label: string; value: string; caption: string } {
  const labelMap: Record<string, string> = {
    mean_signal: "Nivel promedio",
    coverage_ratio: "Cobertura",
    peak_hour: "Hora más activa",
    strongest_hour: "Hora más alta",
    weakest_hour: "Hora más baja",
    strong_anomaly_count: "Alertas clave",
    anomaly_count: "Alertas clave",
  };

  return {
    label: labelMap[kpi.key] ?? kpi.label,
    value: kpi.formatted_value,
    caption: translateMetricCaption(kpi),
  };
}

export function modeLabel(value: string): string {
  if (value === "llm_enhanced") {
    return "redacción mejorada";
  }

  if (value === "deterministic_fallback") {
    return "respaldo determinista";
  }

  return "basado en datos";
}

export function sourceLabel(tableName: string): string {
  const mapping: Record<string, string> = {
    "availability_daily.csv": "serie diaria",
    "availability_hourly.csv": "ritmo horario",
    "availability_hourly_anomalies.csv": "anomalías",
    "availability_quality_report.json": "calidad del dato",
    "availability_overview_summary.json": "resumen general",
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
  const direction = item.anomaly_direction === "high" ? "alza" : "caída";
  return `${formatShortDate(item.date)} · ${formatHourFromNumber(item.hour)} · ${direction}`;
}

export function briefingQuestion(day: DayBriefing): string {
  return `¿Qué pasó el ${day.target_date}?`;
}
