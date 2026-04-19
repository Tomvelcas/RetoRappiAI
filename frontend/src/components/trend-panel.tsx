"use client";

import type { DailyTrendPoint, MetricsOverviewResponse } from "@/lib/api";
import {
  anomalyLabel,
  coverageChip,
  formatCompactNumber,
  formatCoverage,
  formatHourFromNumber,
  formatLongDate,
  formatShortDate,
  getIntradayExtremes,
} from "@/lib/format";

type TrendPanelProps = {
  overview: MetricsOverviewResponse;
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
  const padding = { left: 28, right: 20, top: 28, bottom: 44 };
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
  selectedDate,
  onSelectDate,
}: TrendPanelProps) {
  const chartPoints = buildChartPoints(overview.trend);
  const selectedPoint =
    overview.trend.find((point) => point.date === selectedDate) ?? overview.trend.at(-1) ?? null;
  const { strongest, weakest } = getIntradayExtremes(overview.intraday_profile);

  return (
    <section className="panel rounded-[36px] p-5 sm:p-8">
      <div className="grid gap-8 xl:grid-cols-[1.35fr_0.78fr]">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Signal line</p>
              <h2
                className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-4xl"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                Daily drift, one day at a time.
              </h2>
            </div>
            {selectedPoint ? (
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.04)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                  selected
                </p>
                <p className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">
                  {formatLongDate(selectedPoint.date)}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                  {formatCoverage(selectedPoint.coverage_ratio)} seen ·{" "}
                  {formatCompactNumber(selectedPoint.mean_signal)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="relative mt-6 overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4 sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(90,214,195,0.1),transparent_48%)]" />
            <svg
              className="relative z-10 w-full"
              viewBox="0 0 1000 360"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="trend-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(90,214,195,0.28)" />
                  <stop offset="100%" stopColor="rgba(90,214,195,0.02)" />
                </linearGradient>
                <linearGradient id="trend-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#5ad6c3" />
                  <stop offset="50%" stopColor="#a6bbff" />
                  <stop offset="100%" stopColor="#ffbc5c" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="6 10"
                  x1="0"
                  x2="1000"
                  y1={44 + line * 74}
                  y2={44 + line * 74}
                />
              ))}

              {chartPoints.map((item) => (
                <rect
                  key={item.point.date}
                  fill={item.point.date === selectedDate ? "rgba(255,255,255,0.08)" : "transparent"}
                  height={260 * item.point.coverage_ratio}
                  rx="12"
                  width="48"
                  x={item.x - 24}
                  y={316 - 260 * item.point.coverage_ratio}
                />
              ))}

              <path d={buildAreaPath(chartPoints)} fill="url(#trend-area)" />
              <path
                d={buildLinePath(chartPoints)}
                fill="none"
                stroke="url(#trend-line)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />

              {chartPoints.map((item) => {
                const active = item.point.date === selectedDate;

                return (
                  <g key={item.point.date}>
                    <circle
                      cx={item.x}
                      cy={item.y}
                      fill={active ? "#ffbc5c" : "#5ad6c3"}
                      r={active ? 8 : 5}
                      stroke="rgba(5,10,18,0.9)"
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
                      fill={active ? "#edf3ff" : "#6d7992"}
                      fontSize="13"
                      textAnchor="middle"
                      x={item.x}
                      y="344"
                    >
                      {formatShortDate(item.point.date)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-5">
            <p className="eyebrow">Daily read</p>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-dim)]">
                  strongest hour
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--text-strong)]">
                  {strongest ? formatHourFromNumber(strongest.hour) : "n/a"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--text-soft)]">
                  {strongest ? `${formatCompactNumber(strongest.mean_signal)} typical level` : ""}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-dim)]">
                  softest hour
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--text-strong)]">
                  {weakest ? formatHourFromNumber(weakest.hour) : "n/a"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--text-soft)]">
                  {weakest ? `${formatCompactNumber(weakest.mean_signal)} typical level` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Sharp swings</p>
                <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                  The hours that pulled away from their usual rhythm.
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs ${coverageChip(overview.quality.selected_coverage_flag)}`}>
                {formatCoverage(overview.quality.selected_coverage_ratio)} seen
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {overview.top_anomalies.slice(0, 3).map((item) => (
                <button
                  key={item.hour_bucket}
                  className="flex w-full items-start justify-between gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.02)] px-4 py-3 text-left transition hover:border-[color:var(--border-strong)] hover:bg-[color:rgba(255,255,255,0.04)]"
                  onClick={() => onSelectDate(item.date)}
                  type="button"
                >
                  <div>
                    <p className="text-sm font-medium text-[color:var(--text-strong)]">
                      {anomalyLabel(item)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                      {item.anomaly_direction === "high" ? "Above" : "Below"} usual by{" "}
                      {formatCompactNumber(Math.abs(item.delta_vs_hour_median))}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${coverageChip(item.confidence)}`}>
                    {item.confidence}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
