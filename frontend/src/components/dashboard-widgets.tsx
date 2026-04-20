"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  AnomalyHighlight,
  CoverageExtremePoint,
  DailyTrendPoint,
  DayBriefing,
  IntradayProfilePoint,
  MetricsCoverageExtremesResponse,
  MetricsOverviewResponse,
} from "@/lib/api";
import type { DashboardPinnedWidget } from "@/lib/dashboard-store";
import {
  anomalyLabel,
  coverageChip,
  coverageTone,
  formatCompactNumber,
  formatCoverage,
  formatHourFromNumber,
  formatLongDate,
  formatShortDate,
  getIntradayExtremes,
} from "@/lib/format";

import { ChatArtifactView } from "@/components/chat-artifact";

type WidgetChromeProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

type SignalTimelineWidgetProps = {
  points: DailyTrendPoint[];
  selectedDate: string;
  notes: string[];
  onSelectDate: (date: string) => void;
  actions?: React.ReactNode;
};

type DaySpotlightWidgetProps = {
  briefing: DayBriefing;
  actions?: React.ReactNode;
};

type IntradayRhythmWidgetProps = {
  profile: IntradayProfilePoint[];
  actions?: React.ReactNode;
};

type AnomalyPulseWidgetProps = {
  anomalies: AnomalyHighlight[];
  actions?: React.ReactNode;
};

type QualityLensWidgetProps = {
  overview: MetricsOverviewResponse;
  actions?: React.ReactNode;
};

type CoverageExtremesWidgetProps = {
  coverage: MetricsCoverageExtremesResponse;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  actions?: React.ReactNode;
};

type PinnedWidgetProps = {
  widget: DashboardPinnedWidget;
  onRemove: () => void;
  actions?: React.ReactNode;
};

function WidgetChrome({
  eyebrow,
  title,
  description,
  actions,
  children,
  footer,
}: WidgetChromeProps) {
  return (
    <section className="panel flex h-full min-h-0 flex-col rounded-[30px] border border-[color:var(--border)] p-4 sm:p-5 xl:p-6">
      <div className="flex flex-col gap-3 border-b border-[color:var(--border)] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3
              className="mt-2 text-[1.55rem] font-semibold tracking-[-0.05em] text-[color:var(--text-strong)] sm:text-2xl"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              {title}
            </h3>
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-soft)] sm:leading-7">
          {description}
        </p>
      </div>

      <div className="glass-scroll flex-1 min-h-0 overflow-auto pt-4 sm:pt-5">{children}</div>
      {footer ? <div className="mt-4 border-t border-[color:var(--border)] pt-4">{footer}</div> : null}
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      className={[
        "rounded-full border px-3 py-2 text-xs font-medium transition",
        tone === "danger"
          ? "border-[color:rgba(178,76,89,0.22)] text-[color:var(--signal-rose)] hover:border-[color:rgba(178,76,89,0.36)]"
          : "border-[color:var(--border)] text-[color:var(--text-soft)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

type ChartPoint = {
  x: number;
  y: number;
  point: DailyTrendPoint;
};

function buildChartPoints(points: DailyTrendPoint[]): {
  points: ChartPoint[];
  minValue: number;
  maxValue: number;
} {
  if (points.length === 0) {
    return { points: [], minValue: 0, maxValue: 0 };
  }

  const width = 960;
  const height = 420;
  const padding = { left: 70, right: 24, top: 24, bottom: 52 };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.mean_signal);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(maxValue - minValue, 1);

  return {
    minValue,
    maxValue,
    points: points.map((point, index) => ({
      point,
      x: padding.left + (usableWidth * index) / Math.max(points.length - 1, 1),
      y:
        padding.top +
        usableHeight -
        ((point.mean_signal - minValue) / span) * usableHeight,
    })),
  };
}

function buildLinePath(points: ChartPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const floor = 368;
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) {
    return "";
  }

  return `${buildLinePath(points)} L ${last.x} ${floor} L ${first.x} ${floor} Z`;
}

export function SignalTimelineWidget({
  points,
  selectedDate,
  notes,
  onSelectDate,
  actions,
}: SignalTimelineWidgetProps) {
  const { points: chartPoints, minValue, maxValue } = buildChartPoints(points);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const activePoint =
    chartPoints.find((item) => item.point.date === (hoveredDate ?? selectedDate)) ?? chartPoints[0];
  const yTicks = [maxValue, (maxValue + minValue) / 2, minValue];

  return (
    <WidgetChrome
      actions={
        <div className="flex flex-wrap gap-2">
          {activePoint ? (
            <span className="rounded-full border border-[color:rgba(21,125,120,0.2)] bg-[color:rgba(21,125,120,0.08)] px-3 py-2 text-xs text-[color:var(--signal-cyan)]">
              {formatShortDate(activePoint.point.date)} · {formatCompactNumber(activePoint.point.mean_signal)}
            </span>
          ) : null}
          {actions}
        </div>
      }
      description="Curva principal con escala visible, contexto de cobertura y selección directa por día. La cobertura se dibuja detrás para mostrar qué tan sólido es cada punto."
      eyebrow="Señal principal"
      title="Cómo cambió la métrica a lo largo del histórico"
    >
      <div className="rounded-[26px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.7)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
        <svg className="w-full" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="signal-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(28, 127, 120, 0.24)" />
              <stop offset="100%" stopColor="rgba(28, 127, 120, 0.03)" />
            </linearGradient>
          </defs>

          {yTicks.map((value, index) => {
            const y = 40 + index * 164;

            return (
              <g key={`grid-${value}`}>
                <line
                  stroke="rgba(67,57,47,0.1)"
                  strokeDasharray="6 10"
                  x1="64"
                  x2="936"
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#7d7062"
                  fontSize="12"
                  textAnchor="start"
                  x="8"
                  y={y + 4}
                >
                  {formatCompactNumber(value)}
                </text>
              </g>
            );
          })}

          {chartPoints.map((item) => (
            <rect
              key={`coverage-${item.point.date}`}
              fill={
                item.point.date === (hoveredDate ?? selectedDate)
                  ? "rgba(21,125,120,0.12)"
                  : "rgba(32,27,23,0.03)"
              }
              height={320 * item.point.coverage_ratio}
              rx="14"
              width="54"
              x={item.x - 27}
              y={368 - 320 * item.point.coverage_ratio}
            />
          ))}

          <path d={buildAreaPath(chartPoints)} fill="url(#signal-area)" />
          <path
            d={buildLinePath(chartPoints)}
            fill="none"
            stroke="#1b1713"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.8"
          />

          {chartPoints.map((item) => {
            const active = item.point.date === (hoveredDate ?? selectedDate);

            return (
              <g key={`point-${item.point.date}`}>
                <circle
                  cx={item.x}
                  cy={item.y}
                  fill={active ? "#157d78" : "#1b1713"}
                  r={active ? 7.5 : 5}
                  stroke="rgba(255,253,249,0.95)"
                  strokeWidth="4"
                />
                <rect
                  fill="transparent"
                  height="420"
                  onClick={() => onSelectDate(item.point.date)}
                  onMouseEnter={() => setHoveredDate(item.point.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  width="74"
                  x={item.x - 37}
                  y="0"
                />
                <text
                  fill={active ? "#1b1713" : "#938676"}
                  fontSize="12"
                  textAnchor="middle"
                  x={item.x}
                  y="396"
                >
                  {formatShortDate(item.point.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Día activo
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-strong)]">
            {activePoint ? formatLongDate(activePoint.point.date) : "Sin datos"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-soft)]">
            {activePoint ? formatCoverage(activePoint.point.coverage_ratio) : "0%"} de cobertura
          </p>
        </div>

        <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Nivel medio
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-strong)]">
            {activePoint ? formatCompactNumber(activePoint.point.mean_signal) : "n/a"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-soft)]">
            La cobertura dibujada detrás muestra qué tanto confiar en el punto.
          </p>
        </div>

        <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Lectura operativa
          </p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--text-soft)]">
            {notes[0] ?? "La serie está calculada sobre artefactos procesados y agregados diarios."}
          </p>
        </div>
      </div>
    </WidgetChrome>
  );
}

export function DaySpotlightWidget({ briefing, actions }: DaySpotlightWidgetProps) {
  return (
    <WidgetChrome
      actions={actions}
      description="Resumen narrativo del día seleccionado, con horas fuertes, horas débiles y cautelas para llevarlo directo al copiloto."
      eyebrow="Día abierto"
      title={formatLongDate(briefing.target_date)}
      footer={
        <div className="flex flex-wrap gap-2">
          {briefing.suggested_questions.slice(0, 2).map((question) => (
            <Link
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
              href={`/chat?question=${encodeURIComponent(question)}`}
              key={question}
            >
              {question}
            </Link>
          ))}
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(21,125,120,0.12),rgba(255,255,255,0.82))] p-5">
          <p
            className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]"
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            {briefing.headline}
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">{briefing.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              Hora más fuerte
            </p>
            <p className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
              {briefing.strongest_hour.label}
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-soft)]">
              {formatCompactNumber(briefing.strongest_hour.mean_signal)} ·{" "}
              {formatCoverage(briefing.strongest_hour.coverage_ratio)}
            </p>
          </div>

          <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              Hora más débil
            </p>
            <p className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
              {briefing.weakest_hour.label}
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-soft)]">
              {formatCompactNumber(briefing.weakest_hour.mean_signal)} ·{" "}
              {formatCoverage(briefing.weakest_hour.coverage_ratio)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {briefing.highlights.map((item) => (
            <span
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[color:var(--text-soft)]"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>

        {briefing.cautions.length ? (
          <div className="rounded-[22px] border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(176,108,31,0.08)] px-4 py-3 text-sm leading-6 text-[color:var(--signal-amber)]">
            {briefing.cautions[0]}
          </div>
        ) : null}
      </div>
    </WidgetChrome>
  );
}

export function IntradayRhythmWidget({ profile, actions }: IntradayRhythmWidgetProps) {
  const { strongest, weakest } = getIntradayExtremes(profile);
  const maxSignal = Math.max(...profile.map((item) => item.mean_signal), 1);

  return (
    <WidgetChrome
      actions={actions}
      description="Patrón horario típico para entender cuándo la señal suele estar arriba o abajo, sin perder de vista la cobertura de cada bloque."
      eyebrow="Ritmo intradía"
      title="Lectura por hora"
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-end gap-2">
          {profile.map((item) => {
            const isStrong = strongest?.hour === item.hour;
            const isWeak = weakest?.hour === item.hour;

            return (
              <div className="w-12 text-center" key={item.hour}>
                <div className="relative flex h-44 items-end justify-center overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[color:rgba(32,27,23,0.03)] px-2 py-2">
                  <div
                    className={[
                      "w-full rounded-full transition",
                      isStrong
                        ? "bg-[linear-gradient(180deg,rgba(21,125,120,0.95),rgba(21,125,120,0.42))]"
                        : isWeak
                          ? "bg-[linear-gradient(180deg,rgba(178,76,89,0.88),rgba(178,76,89,0.34))]"
                          : "bg-[linear-gradient(180deg,rgba(32,27,23,0.5),rgba(32,27,23,0.18))]",
                    ].join(" ")}
                    style={{
                      height: `${Math.max((item.mean_signal / maxSignal) * 100, 8)}%`,
                      opacity: Math.max(item.coverage_ratio, 0.35),
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-[color:var(--text-strong)]">
                  {formatHourFromNumber(item.hour)}
                </p>
                <p className={`mt-1 text-[11px] ${coverageTone(item.coverage_flag)}`}>
                  {formatCoverage(item.coverage_ratio)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Hora pico
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-strong)]">
            {strongest ? formatHourFromNumber(strongest.hour) : "n/a"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-soft)]">
            {strongest ? formatCompactNumber(strongest.mean_signal) : "Sin datos"} ·{" "}
            {strongest ? formatCoverage(strongest.coverage_ratio) : "0%"}
          </p>
        </div>

        <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Hora más baja
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-strong)]">
            {weakest ? formatHourFromNumber(weakest.hour) : "n/a"}
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-soft)]">
            {weakest ? formatCompactNumber(weakest.mean_signal) : "Sin datos"} ·{" "}
            {weakest ? formatCoverage(weakest.coverage_ratio) : "0%"}
          </p>
        </div>
      </div>
    </WidgetChrome>
  );
}

export function AnomalyPulseWidget({ anomalies, actions }: AnomalyPulseWidgetProps) {
  const maxZScore = Math.max(...anomalies.map((item) => Math.abs(item.zscore)), 1);

  return (
    <WidgetChrome
      actions={actions}
      description="Las anomalías se ordenan por fuerza relativa. La barra compara magnitud y el chip de confianza mezcla cobertura horaria con desviación."
      eyebrow="Anomalías"
      title="Momentos que merecen abrirse"
    >
      <div className="space-y-3">
        {anomalies.slice(0, 6).map((item) => (
          <div
            className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4"
            key={`${item.date}-${item.hour_bucket}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[color:var(--text-strong)]">
                  {anomalyLabel(item)}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                  Baseline {formatCompactNumber(item.baseline_mean)} · observado{" "}
                  {formatCompactNumber(item.mean_signal)}
                </p>
              </div>

              <span className={`rounded-full border px-3 py-1 text-xs ${coverageChip(item.confidence)}`}>
                {item.confidence}
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[color:rgba(32,27,23,0.08)]">
              <div
                className={
                  item.anomaly_direction === "high"
                    ? "h-full rounded-full bg-[linear-gradient(90deg,rgba(21,125,120,0.85),rgba(21,125,120,0.36))]"
                    : "h-full rounded-full bg-[linear-gradient(90deg,rgba(178,76,89,0.9),rgba(178,76,89,0.34))]"
                }
                style={{ width: `${Math.max((Math.abs(item.zscore) / maxZScore) * 100, 12)}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--text-soft)]">
              <span>Z-score {item.zscore.toFixed(2)}</span>
              <span>·</span>
              <span>Delta {formatCompactNumber(item.delta_vs_hour_median)}</span>
              <span>·</span>
              <span>{item.n_points} puntos</span>
            </div>
          </div>
        ))}
      </div>
    </WidgetChrome>
  );
}

export function QualityLensWidget({ overview, actions }: QualityLensWidgetProps) {
  const { quality } = overview;
  const coverage = Math.max(Math.min(quality.selected_coverage_ratio, 1), 0);
  const gaugeStyle = {
    background: `conic-gradient(
      rgba(21,125,120,0.92) 0turn ${coverage}turn,
      rgba(32,27,23,0.08) ${coverage}turn 1turn
    )`,
  };

  return (
    <WidgetChrome
      actions={actions}
      description="Panel de calidad para separar incidentes reales de vacíos de observación. El objetivo es que nadie lea un hueco de cobertura como problema de negocio."
      eyebrow="Calidad del dato"
      title="Cuánto confiar en el rango activo"
    >
      <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
        <div className="grid place-items-center rounded-[26px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
          <div className="grid size-40 place-items-center rounded-full p-3" style={gaugeStyle}>
            <div className="grid size-full place-items-center rounded-full bg-[color:var(--surface-strong)] text-center">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                  Cobertura
                </p>
                <p className="mt-2 text-3xl font-semibold text-[color:var(--text-strong)]">
                  {formatCoverage(coverage)}
                </p>
                <p className={`mt-2 text-xs ${coverageTone(quality.selected_coverage_flag)}`}>
                  {quality.selected_coverage_flag}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            ["Archivos raw", String(quality.raw_file_count)],
            ["Timestamps canónicos", formatCompactNumber(quality.canonical_timestamp_count)],
            ["Ventanas incompletas", String(quality.incomplete_window_records)],
            ["Puntos faltantes", formatCompactNumber(quality.missing_points_full_range)],
          ].map(([label, value]) => (
            <div
              className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
              key={label}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                {label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--text-strong)]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </WidgetChrome>
  );
}

function CoverageRail({
  items,
  title,
  tone,
  selectedDate,
  onSelectDate,
}: {
  items: CoverageExtremePoint[];
  title: string;
  tone: "rose" | "cyan";
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const maxCoverage = Math.max(...items.map((item) => item.coverage_ratio), 0.01);

  return (
    <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
      <p className="text-sm font-medium text-[color:var(--text-strong)]">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const active = item.date === selectedDate;

          return (
            <button
              className={[
                "block w-full rounded-[18px] border px-3 py-3 text-left transition",
                active
                  ? "border-[color:rgba(21,125,120,0.22)] bg-[color:rgba(21,125,120,0.08)]"
                  : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
              ].join(" ")}
              key={item.date}
              onClick={() => onSelectDate(item.date)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[color:var(--text-strong)]">
                    {formatShortDate(item.date)}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                    {formatCompactNumber(item.mean_signal)} · {item.n_points}/{item.expected_points} puntos
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium",
                    tone === "rose"
                      ? "bg-[color:rgba(178,76,89,0.08)] text-[color:var(--signal-rose)]"
                      : "bg-[color:rgba(21,125,120,0.08)] text-[color:var(--signal-cyan)]",
                  ].join(" ")}
                >
                  {formatCoverage(item.coverage_ratio)}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:rgba(32,27,23,0.08)]">
                <div
                  className={
                    tone === "rose"
                      ? "h-full rounded-full bg-[linear-gradient(90deg,rgba(178,76,89,0.9),rgba(178,76,89,0.34))]"
                      : "h-full rounded-full bg-[linear-gradient(90deg,rgba(21,125,120,0.92),rgba(21,125,120,0.3))]"
                  }
                  style={{ width: `${Math.max((item.coverage_ratio / maxCoverage) * 100, 16)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CoverageExtremesWidget({
  coverage,
  selectedDate,
  onSelectDate,
  actions,
}: CoverageExtremesWidgetProps) {
  return (
    <WidgetChrome
      actions={actions}
      description="Comparación rápida entre los días con menor y mayor soporte observado. Sirve para abrir días frágiles o tomar como referencia los mejor cubiertos."
      eyebrow="Cobertura"
      title="Extremos del rango"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <CoverageRail
          items={coverage.lowest_coverage_days}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
          title="Días más frágiles"
          tone="rose"
        />
        <CoverageRail
          items={coverage.highest_coverage_days}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
          title="Días mejor cubiertos"
          tone="cyan"
        />
      </div>
    </WidgetChrome>
  );
}

export function PinnedWidget({ widget, onRemove, actions }: PinnedWidgetProps) {
  return (
    <WidgetChrome
      actions={
        <div className="flex flex-wrap gap-2">
          {actions}
          <ActionButton label="Eliminar" onClick={onRemove} tone="danger" />
        </div>
      }
      description="Widget anclado desde el copiloto. Esto permite construir el dashboard como un canvas vivo con piezas que nacen de una conversación."
      eyebrow="Widget fijado"
      title={widget.title}
      footer={
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-dim)]">
          <span>Origen: {widget.sourceIntent}</span>
          <span>·</span>
          <span>{widget.sourceQuestion}</span>
        </div>
      }
    >
      {widget.answerExcerpt ? (
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.74)] p-4">
          <p className="text-sm leading-7 text-[color:var(--text-soft)]">{widget.answerExcerpt}</p>
        </div>
      ) : null}

      {widget.artifact ? <ChatArtifactView artifact={widget.artifact} /> : null}
    </WidgetChrome>
  );
}
