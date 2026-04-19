"use client";

import type {
  CoverageExtremePoint,
  DailyTrendPoint,
  DayBriefing,
  MetricsCoverageExtremesResponse,
} from "@/lib/api";
import {
  coverageChip,
  formatCompactNumber,
  formatCoverage,
  formatLongDate,
  formatShortDate,
} from "@/lib/format";

import { ChatPanel } from "@/components/chat-panel";
import { SignalDotField } from "@/components/signal-dot-field";

type BriefingAtlasProps = {
  trend: DailyTrendPoint[];
  extremes: MetricsCoverageExtremesResponse;
  briefing: DayBriefing;
  selectedDate: string;
  loadingBriefing: boolean;
  onSelectDate: (value: string) => void;
};

type AtlasNode = {
  date: string;
  x: number;
  y: number;
  emphasis: "steady" | "focus" | "lift";
  size: number;
  coverage: number;
};

function buildAtlasNodes(
  trend: DailyTrendPoint[],
  lowestCoverageDays: CoverageExtremePoint[],
  highestCoverageDays: CoverageExtremePoint[],
): AtlasNode[] {
  if (trend.length === 0) {
    return [];
  }

  const minSignal = Math.min(...trend.map((item) => item.mean_signal));
  const maxSignal = Math.max(...trend.map((item) => item.mean_signal));
  const span = Math.max(maxSignal - minSignal, 1);
  const lowestSet = new Set(lowestCoverageDays.map((item) => item.date));
  const highestSet = new Set(highestCoverageDays.map((item) => item.date));

  return trend.map((item, index) => {
    const emphasis = lowestSet.has(item.date)
      ? "focus"
      : highestSet.has(item.date)
        ? "lift"
        : "steady";

    return {
      date: item.date,
      x: 10 + (index / Math.max(trend.length - 1, 1)) * 80,
      y:
        78 -
        ((item.mean_signal - minSignal) / span) * 42 +
        ((index % 2 === 0 ? -1 : 1) * (1 - item.coverage_ratio) * 8),
      emphasis,
      size:
        emphasis === "focus"
          ? 72
          : emphasis === "lift"
            ? 62
            : 46 + item.coverage_ratio * 12,
      coverage: item.coverage_ratio,
    };
  });
}

export function BriefingAtlas({
  trend,
  extremes,
  briefing,
  selectedDate,
  loadingBriefing,
  onSelectDate,
}: BriefingAtlasProps) {
  const nodes = buildAtlasNodes(
    trend,
    extremes.lowest_coverage_days,
    extremes.highest_coverage_days,
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[1.28fr_0.86fr]">
      <div className="panel relative min-h-[640px] rounded-[40px] p-5 sm:p-8">
        <SignalDotField className="absolute inset-0 h-full w-full opacity-45" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Day atlas</p>
            <h2
              className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-4xl"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              A connected map of the days worth opening.
            </h2>
          </div>
          <div className="rounded-[26px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.04)] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              current focus
            </p>
            <p className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">
              {formatLongDate(selectedDate)}
            </p>
          </div>
        </div>

        <div
          className="relative mt-8 min-h-[500px] overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[color:rgba(4,8,14,0.76)]"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const shiftX = ((event.clientX - rect.left) / rect.width - 0.5) * 26;
            const shiftY = ((event.clientY - rect.top) / rect.height - 0.5) * 22;
            event.currentTarget.style.setProperty("--atlas-shift-x", `${shiftX}px`);
            event.currentTarget.style.setProperty("--atlas-shift-y", `${shiftY}px`);
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.setProperty("--atlas-shift-x", "0px");
            event.currentTarget.style.setProperty("--atlas-shift-y", "0px");
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <defs>
              <linearGradient id="atlas-link" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(90,214,195,0.12)" />
                <stop offset="50%" stopColor="rgba(166,187,255,0.2)" />
                <stop offset="100%" stopColor="rgba(255,188,92,0.18)" />
              </linearGradient>
            </defs>
            {nodes.slice(1).map((node, index) => {
              const previous = nodes[index];
              return (
                <line
                  key={`${previous.date}-${node.date}`}
                  stroke="url(#atlas-link)"
                  strokeWidth="0.34"
                  x1={previous.x}
                  x2={node.x}
                  y1={previous.y}
                  y2={node.y}
                />
              );
            })}
          </svg>

          {nodes.map((node, index) => {
            const active = node.date === selectedDate;
            const caption = trend.find((item) => item.date === node.date);
            const accent =
              node.emphasis === "focus"
                ? "rgba(255,121,137,0.92)"
                : node.emphasis === "lift"
                  ? "rgba(255,188,92,0.9)"
                  : "rgba(90,214,195,0.88)";

            return (
              <button
                key={node.date}
                className="group absolute rounded-full text-left transition-transform duration-300 hover:scale-[1.04]"
                onClick={() => onSelectDate(node.date)}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: [
                    "translate(-50%, -50%)",
                    `translate3d(calc(var(--atlas-shift-x, 0px) * ${0.05 + index * 0.01}), calc(var(--atlas-shift-y, 0px) * ${0.05 + index * 0.01}), 0)`,
                  ].join(" "),
                }}
                type="button"
              >
                <span
                  className={[
                    "signal-ring relative flex items-center justify-center rounded-full border text-center transition",
                    active
                      ? "border-[color:rgba(255,255,255,0.2)] bg-[color:rgba(255,255,255,0.08)]"
                      : "border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] group-hover:bg-[color:rgba(255,255,255,0.08)]",
                  ].join(" ")}
                  style={{
                    width: `${node.size}px`,
                    height: `${node.size}px`,
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 0 0 12px ${accent.replace(
                      "0.92",
                      "0.06",
                    )}, 0 24px 44px rgba(0,0,0,0.35)`,
                  }}
                >
                  <span
                    className="absolute inset-[10px] rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${accent} 0%, rgba(255,255,255,0.06) 100%)`,
                      opacity: active ? 1 : 0.7,
                    }}
                  />
                  <span className="relative z-10 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-strong)]">
                    {formatShortDate(node.date)}
                  </span>
                </span>

                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+12px)] w-28 -translate-x-1/2 rounded-2xl border border-[color:var(--border)] bg-[color:rgba(5,10,18,0.88)] px-3 py-2 text-center opacity-0 transition group-hover:opacity-100">
                  <span className="block text-xs font-medium text-[color:var(--text-strong)]">
                    {caption ? formatCompactNumber(caption.mean_signal) : "n/a"}
                  </span>
                  <span className="mt-1 block text-[11px] text-[color:var(--text-soft)]">
                    {caption ? formatCoverage(caption.coverage_ratio) : ""}
                  </span>
                </span>
              </button>
            );
          })}

          <div className="absolute bottom-5 left-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[color:rgba(90,214,195,0.28)] bg-[color:rgba(90,214,195,0.06)] px-3 py-2 text-xs text-[color:var(--signal-cyan)]">
              steady day
            </span>
            <span className="rounded-full border border-[color:rgba(255,121,137,0.28)] bg-[color:rgba(255,121,137,0.06)] px-3 py-2 text-xs text-[color:var(--signal-rose)]">
              low coverage
            </span>
            <span className="rounded-full border border-[color:rgba(255,188,92,0.28)] bg-[color:rgba(255,188,92,0.06)] px-3 py-2 text-xs text-[color:var(--signal-amber)]">
              strong day
            </span>
          </div>
        </div>
      </div>

      <aside className="grid gap-6 self-start xl:sticky xl:top-24">
        <div className="panel rounded-[34px] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Day card</p>
              <h3
                className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]"
                style={{ fontFamily: "var(--font-heading), sans-serif" }}
              >
                {briefing.headline}
              </h3>
            </div>
            <span className={`rounded-full border px-3 py-2 text-xs ${coverageChip(briefing.coverage_flag)}`}>
              {loadingBriefing ? "loading…" : formatCoverage(briefing.coverage_ratio)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-7 text-[color:var(--text-soft)]">{briefing.summary}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[26px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                strongest hour
              </p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
                {briefing.strongest_hour.label}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-soft)]">
                {formatCompactNumber(briefing.strongest_hour.mean_signal)}
              </p>
            </div>
            <div className="rounded-[26px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                softest hour
              </p>
              <p className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
                {briefing.weakest_hour.label}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-soft)]">
                {formatCompactNumber(briefing.weakest_hour.mean_signal)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="eyebrow">Highlights</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {briefing.highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2 text-xs text-[color:var(--text-soft)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {briefing.cautions.length ? (
            <div className="mt-5 rounded-[26px] border border-[color:rgba(255,121,137,0.2)] bg-[color:rgba(255,121,137,0.06)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--signal-rose)]">
                Read with care
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:#ffd4da]">
                {briefing.cautions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <ChatPanel briefing={briefing} />
      </aside>
    </section>
  );
}
