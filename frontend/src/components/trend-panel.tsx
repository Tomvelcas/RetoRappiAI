"use client";

import Link from "next/link";

import type { DailyTrendPoint, DayBriefing, MetricsOverviewResponse } from "@/lib/api";
import {
  formatCompactNumber,
  formatCoverage,
  formatLongDate,
  formatShortDate,
} from "@/lib/format";

type TrendPanelProps = {
  overview: MetricsOverviewResponse;
  briefing: DayBriefing;
  selectedDate: string;
  onSelectDate: (value: string) => void;
};

type ChartPoint = {
  x: number;
  y: number;
  point: DailyTrendPoint;
};

function buildChartPoints(points: DailyTrendPoint[]): ChartPoint[] {
  if (points.length === 0) {
    return [];
  }

  const width = 1000;
  const height = 360;
  const padding = { left: 30, right: 20, top: 30, bottom: 48 };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.mean_signal);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(maxValue - minValue, 1);

  return points.map((point, index) => ({
    point,
    x: padding.left + (usableWidth * index) / Math.max(points.length - 1, 1),
    y:
      padding.top +
      usableHeight -
      ((point.mean_signal - minValue) / span) * usableHeight,
  }));
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

  const floor = 316;
  const line = buildLinePath(points);
  const first = points[0];
  const last = points.at(-1);

  if (!first || !last) {
    return "";
  }

  return `${line} L ${last.x} ${floor} L ${first.x} ${floor} Z`;
}

export function TrendPanel({
  overview,
  briefing,
  selectedDate,
  onSelectDate,
}: TrendPanelProps) {
  const chartPoints = buildChartPoints(overview.trend);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.28fr_0.78fr]">
      <div className="panel rounded-[34px] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">La línea</p>
            <h2
              className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              Qué cambió a lo largo de los días observados.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[color:var(--text-soft)]">
            Toque un día para abrir su nota y llevar la pregunta al copiloto.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4 sm:p-6">
          <svg className="w-full" viewBox="0 0 1000 360" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="northline-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(21,125,120,0.18)" />
                <stop offset="100%" stopColor="rgba(21,125,120,0.02)" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((line) => (
              <line
                key={line}
                stroke="rgba(67,57,47,0.08)"
                strokeDasharray="5 10"
                x1="0"
                x2="1000"
                y1={44 + line * 72}
                y2={44 + line * 72}
              />
            ))}

            {chartPoints.map((item) => (
              <rect
                key={item.point.date}
                fill={item.point.date === selectedDate ? "rgba(21,125,120,0.08)" : "transparent"}
                height={260 * item.point.coverage_ratio}
                rx="14"
                width="48"
                x={item.x - 24}
                y={316 - 260 * item.point.coverage_ratio}
              />
            ))}

            <path d={buildAreaPath(chartPoints)} fill="url(#northline-area)" />
            <path
              d={buildLinePath(chartPoints)}
              fill="none"
              stroke="#201b17"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.4"
            />

            {chartPoints.map((item) => {
              const active = item.point.date === selectedDate;

              return (
                <g key={item.point.date}>
                  <circle
                    cx={item.x}
                    cy={item.y}
                    fill={active ? "#157d78" : "#201b17"}
                    r={active ? 7 : 4.5}
                    stroke="rgba(255,253,249,0.95)"
                    strokeWidth="4"
                  />
                  <rect
                    fill="transparent"
                    height="360"
                    onClick={() => onSelectDate(item.point.date)}
                    width="74"
                    x={item.x - 37}
                    y="0"
                  />
                  <text
                    fill={active ? "#201b17" : "#918475"}
                    fontSize="13"
                    textAnchor="middle"
                    x={item.x}
                    y="342"
                  >
                    {formatShortDate(item.point.date)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <aside className="panel rounded-[34px] p-6">
        <p className="eyebrow">Día seleccionado</p>
        <h3
          className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
          style={{ fontFamily: "var(--font-heading), serif" }}
        >
          {formatLongDate(briefing.target_date)}
        </h3>
        <p className="mt-4 text-sm leading-7 text-[color:var(--text-soft)]">{briefing.summary}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              Nivel
            </p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text-strong)]">
              {briefing.formatted_mean_signal}
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-soft)]">
              {formatCoverage(briefing.coverage_ratio)} de cobertura
            </p>
          </div>
          <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              Horas
            </p>
            <p className="mt-2 text-2xl font-semibold text-[color:var(--text-strong)]">
              {briefing.strongest_hour.label} / {briefing.weakest_hour.label}
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-soft)]">
              ventanas más fuertes y más suaves
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {briefing.highlights.slice(0, 3).map((item) => (
            <span
              key={item}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[color:var(--text-soft)]"
            >
              {item}
            </span>
          ))}
        </div>

        <Link
          className="mt-6 inline-flex rounded-full bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92"
          href={`/chat?question=${encodeURIComponent(`What happened on ${briefing.target_date}?`)}`}
        >
          ask about this day
        </Link>
      </aside>
    </section>
  );
}
