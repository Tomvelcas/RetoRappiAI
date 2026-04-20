"use client";

import type {
  CoverageExtremePoint,
  DailyTrendPoint,
  DayBriefing,
  MetricsCoverageExtremesResponse,
} from "@/lib/api";
import { formatCoverage, formatShortDate } from "@/lib/format";

import { ChatPanel } from "@/components/chat-panel";
import { SignalDotField } from "@/components/signal-dot-field";

type BriefingAtlasProps = Readonly<{
  trend: DailyTrendPoint[];
  extremes: MetricsCoverageExtremesResponse;
  briefing: DayBriefing;
  selectedDate: string;
  onSelectDate: (value: string) => void;
}>;

function buildLowCoverageSet(items: CoverageExtremePoint[]): Set<string> {
  return new Set(items.map((item) => item.date));
}

export function BriefingAtlas({
  trend,
  extremes,
  briefing,
  selectedDate,
  onSelectDate,
}: BriefingAtlasProps) {
  const lowCoverageSet = buildLowCoverageSet(extremes.lowest_coverage_days);
  const prompts = [
    `¿Qué pasó el ${briefing.target_date}?`,
    ...briefing.suggested_questions.slice(0, 2),
  ];

  return (
    <section className="grid gap-6 xl:grid-cols-[1.28fr_0.82fr]">
      <div className="panel rounded-[34px] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Rastro diario</p>
            <h2
              className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              La forma más simple de moverse por el rango.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[color:var(--text-soft)]">
            Cada día permanece en el mismo trayecto. Los días con baja cobertura se marcan en rosa.
          </p>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-5 py-6">
          <SignalDotField
            className="absolute inset-0 h-full w-full opacity-35"
            color="rgba(34, 27, 23, 0.12)"
            density={32}
          />

          <div className="relative z-10 overflow-x-auto pb-2">
            <div className="flex min-w-max items-center gap-3">
              {trend.map((day, index) => {
                const active = day.date === selectedDate;
                const lowCoverage = lowCoverageSet.has(day.date);
                let itemTone =
                  "border-[color:var(--border)] bg-[color:rgba(255,255,255,0.72)] hover:border-[color:var(--border-strong)]";
                let dotTone = "bg-[color:var(--text-strong)]";

                if (active) {
                  itemTone =
                    "border-[color:rgba(21,125,120,0.3)] bg-[color:rgba(21,125,120,0.08)]";
                  dotTone = "bg-[color:var(--signal-cyan)]";
                } else if (lowCoverage) {
                  itemTone =
                    "border-[color:rgba(178,76,89,0.24)] bg-[color:rgba(178,76,89,0.08)]";
                  dotTone = "bg-[color:var(--signal-rose)]";
                }

                return (
                  <div className="flex items-center gap-3" key={day.date}>
                    <button
                      className={[
                        "relative rounded-full border px-4 py-4 text-left transition",
                        itemTone,
                      ].join(" ")}
                      onClick={() => onSelectDate(day.date)}
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <span className={["size-3 rounded-full", dotTone].join(" ")} />
                        <div>
                          <p className="text-sm font-medium text-[color:var(--text-strong)]">
                            {formatShortDate(day.date)}
                          </p>
                          <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                            {formatCoverage(day.coverage_ratio)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {index < trend.length - 1 ? (
                      <div className="h-px w-10 bg-[linear-gradient(90deg,rgba(67,57,47,0.08),rgba(67,57,47,0.28),rgba(67,57,47,0.08))]" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-6 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.76)] p-4">
            <p className="text-sm font-medium text-[color:var(--text-strong)]">
              {briefing.headline}
            </p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-soft)]">
              {briefing.summary}
            </p>
          </div>
        </div>
      </div>

      <ChatPanel prompts={prompts} />
    </section>
  );
}
