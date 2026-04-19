"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type {
  MetricsCoverageExtremesResponse,
  MetricsDayBriefingResponse,
  MetricsOverviewResponse,
} from "@/lib/api";
import { getCoverageExtremes, getDayBriefing, getMetricsOverview } from "@/lib/api";
import {
  formatCompactNumber,
  formatCoverage,
  formatLongDate,
  getIntradayExtremes,
  mapKpiToUi,
} from "@/lib/format";

import { BriefingAtlas } from "@/components/briefing-atlas";
import { KpiCard } from "@/components/kpi-card";
import { TrendPanel } from "@/components/trend-panel";

type DashboardState = {
  overview: MetricsOverviewResponse | null;
  coverage: MetricsCoverageExtremesResponse | null;
  briefings: Record<string, MetricsDayBriefingResponse>;
  selectedDate: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: DashboardState = {
  overview: null,
  coverage: null,
  briefings: {},
  selectedDate: null,
  loading: true,
  error: null,
};

export function DashboardScreen() {
  const [state, setState] = useState<DashboardState>(initialState);
  const [isPending, startTransition] = useTransition();
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  useEffect(() => {
    const overviewController = new AbortController();
    const coverageController = new AbortController();
    const briefingController = new AbortController();

    async function load() {
      try {
        const [overview, coverage, latestBriefing] = await Promise.all([
          getMetricsOverview(overviewController.signal),
          getCoverageExtremes(3, coverageController.signal),
          getDayBriefing(undefined, 3, briefingController.signal),
        ]);

        setState({
          overview,
          coverage,
          briefings: {
            [latestBriefing.briefing.target_date]: latestBriefing,
          },
          selectedDate: latestBriefing.briefing.target_date,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (
          overviewController.signal.aborted ||
          coverageController.signal.aborted ||
          briefingController.signal.aborted
        ) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load the workspace.",
        }));
      }
    }

    void load();

    return () => {
      overviewController.abort();
      coverageController.abort();
      briefingController.abort();
    };
  }, []);

  const selectedBriefing = state.selectedDate ? state.briefings[state.selectedDate] ?? null : null;

  async function handleSelectDate(date: string) {
    startTransition(() => {
      setState((current) => ({
        ...current,
        selectedDate: date,
      }));
    });

    if (state.briefings[date]) {
      return;
    }

    const controller = new AbortController();
    setLoadingBriefing(true);

    try {
      const briefing = await getDayBriefing(date, 3, controller.signal);
      setState((current) => ({
        ...current,
        briefings: {
          ...current.briefings,
          [date]: briefing,
        },
      }));
    } catch {
      // Keep the current briefing view if a secondary fetch fails.
    } finally {
      setLoadingBriefing(false);
    }
  }

  if (state.loading) {
    return (
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          <div className="panel h-[280px] animate-pulse rounded-[40px]" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="panel h-[180px] animate-pulse rounded-[28px]" />
            ))}
          </div>
          <div className="panel h-[520px] animate-pulse rounded-[40px]" />
        </div>
      </main>
    );
  }

  if (!state.overview || !state.coverage || !selectedBriefing) {
    return (
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="panel rounded-[40px] p-8">
          <p className="eyebrow">Workspace unavailable</p>
          <h1
            className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]"
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
          >
            The dashboard could not load.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--text-soft)]">
            {state.error ?? "Start the backend and refresh the page."}
          </p>
        </section>
      </main>
    );
  }

  const { strongest } = getIntradayExtremes(state.overview.intraday_profile);
  const heroLowCoverageDay = state.coverage.lowest_coverage_days[0];

  const cards = [
    {
      ...mapKpiToUi(state.overview.kpis[0]),
      accent: "cyan" as const,
    },
    {
      label: "Observed range",
      value: formatCoverage(state.overview.quality.selected_coverage_ratio),
      caption: "How much of the selected period is actually visible.",
      accent: "amber" as const,
    },
    {
      label: "Peak window",
      value: strongest ? `${String(strongest.hour).padStart(2, "0")}:00` : "n/a",
      caption: strongest ? `${formatCompactNumber(strongest.mean_signal)} usually lands here.` : "",
      accent: "ink" as const,
    },
    {
      label: "Latest focus",
      value: selectedBriefing.briefing.formatted_mean_signal,
      caption: selectedBriefing.briefing.delta_vs_prior_day_label ?? "Latest selected day card.",
      accent: "rose" as const,
    },
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="panel rounded-[42px] px-6 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.72fr]">
          <div className="relative z-10">
            <p className="eyebrow">Live workspace</p>
            <h1
              className="mt-4 max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-[color:var(--text-strong)] sm:text-6xl"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              The days that deserve a second look, all in one surface.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--text-soft)]">
              Read the line, open the days that bend away from it, and carry the exact
              question into the copilot when you need a grounded explanation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[color:var(--text-strong)] px-5 py-3 text-sm font-medium text-[color:var(--signal-ink)] transition hover:opacity-92"
                href={`/chat?question=${encodeURIComponent(
                  `What happened on ${selectedBriefing.briefing.target_date}?`,
                )}`}
              >
                open copilot
              </Link>
              <button
                className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                onClick={() => handleSelectDate(heroLowCoverageDay.date)}
                type="button"
              >
                open lowest-coverage day
              </button>
            </div>
          </div>

          <div className="relative z-10 grid gap-4 self-end">
            <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-5">
              <p className="eyebrow">Current focus</p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--text-strong)]">
                {formatLongDate(selectedBriefing.briefing.target_date)}
              </p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">
                {selectedBriefing.briefing.summary}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                  coverage watch
                </p>
                <p className="mt-3 text-3xl font-semibold text-[color:var(--text-strong)]">
                  {formatCoverage(heroLowCoverageDay.coverage_ratio)}
                </p>
                <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                  Lowest observed day in the range.
                </p>
              </div>
              <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                  strongest hour
                </p>
                <p className="mt-3 text-3xl font-semibold text-[color:var(--text-strong)]">
                  {strongest ? `${String(strongest.hour).padStart(2, "0")}:00` : "n/a"}
                </p>
                <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                  Where the line usually reaches its highest level.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.label}
            accent={card.accent}
            caption={card.caption}
            label={card.label}
            value={card.value}
          />
        ))}
      </section>

      <section className="mt-6">
        <TrendPanel
          onSelectDate={handleSelectDate}
          overview={state.overview}
          selectedDate={state.selectedDate ?? selectedBriefing.briefing.target_date}
        />
      </section>

      <section className="mt-6">
        <BriefingAtlas
          briefing={selectedBriefing.briefing}
          extremes={state.coverage}
          loadingBriefing={loadingBriefing || isPending}
          onSelectDate={handleSelectDate}
          selectedDate={state.selectedDate ?? selectedBriefing.briefing.target_date}
          trend={state.overview.trend}
        />
      </section>
    </main>
  );
}
