"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  MetricsCoverageExtremesResponse,
  MetricsDayBriefingResponse,
  MetricsOverviewResponse,
  MetricsQueryOptions,
} from "@/lib/api";
import {
  getCoverageExtremes,
  getDayBriefing,
  getMetricsOverview,
} from "@/lib/api";
import {
  DASHBOARD_WIDGETS_EVENT,
  type DashboardPinnedWidget,
  type DashboardWidgetLayout,
  type DashboardWidgetLayouts,
  loadDashboardLayouts,
  loadPinnedWidgets,
  removePinnedWidget,
  saveDashboardLayouts,
} from "@/lib/dashboard-store";
import { formatLongDate, formatShortDate, mapKpiToUi } from "@/lib/format";

import { DashboardCanvas, type DashboardCanvasRenderMeta } from "@/components/dashboard-canvas";
import { DashboardStaggeredMenu } from "@/components/dashboard-staggered-menu";
import {
  DashboardStudioPanel,
  type DashboardFilterPreset,
  type DashboardStudioItem,
} from "@/components/dashboard-studio-panel";
import {
  AnomalyPulseWidget,
  DaySpotlightWidget,
  IntradayRhythmWidget,
  MetricTile,
  PinnedWidget,
  QualityLensWidget,
  SignalTimelineWidget,
} from "@/components/dashboard-widgets";
type DashboardState = {
  overview: MetricsOverviewResponse | null;
  coverage: MetricsCoverageExtremesResponse | null;
  briefings: Record<string, MetricsDayBriefingResponse>;
  selectedDate: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

type FilterDraft = {
  startDate: string;
  endDate: string;
  preset: DashboardFilterPreset;
};

type BuiltInWidget = {
  accent: "amber" | "cyan" | "default" | "rose";
  defaultLayout: DashboardWidgetLayout;
  description: string;
  id: string;
  minH: number;
  minW: number;
  title: string;
};

const builtInWidgets: BuiltInWidget[] = [
  {
    accent: "cyan",
    defaultLayout: { x: 0, y: 0, w: 8, h: 5, visible: true },
    description: "Curva principal con lectura diaria, escala visible y selección por fecha.",
    id: "signal-timeline",
    minH: 5,
    minW: 5,
    title: "Señal principal",
  },
  {
    accent: "amber",
    defaultLayout: { x: 8, y: 0, w: 4, h: 5, visible: true },
    description: "Resumen operativo del día seleccionado con highlights y cautelas.",
    id: "day-spotlight",
    minH: 4,
    minW: 3,
    title: "Día abierto",
  },
  {
    accent: "default",
    defaultLayout: { x: 0, y: 5, w: 4, h: 4, visible: true },
    description: "Perfil horario para entender picos y valles durante el día.",
    id: "intraday-rhythm",
    minH: 4,
    minW: 3,
    title: "Ritmo intradía",
  },
  {
    accent: "rose",
    defaultLayout: { x: 4, y: 5, w: 4, h: 4, visible: true },
    description: "Momentos que merecen inspección por magnitud y confianza.",
    id: "anomaly-pulse",
    minH: 4,
    minW: 3,
    title: "Anomalías",
  },
  {
    accent: "amber",
    defaultLayout: { x: 8, y: 5, w: 4, h: 4, visible: true },
    description: "Indicadores de cobertura y fragilidad del rango activo.",
    id: "quality-lens",
    minH: 4,
    minW: 3,
    title: "Calidad del dato",
  },
];

const initialState: DashboardState = {
  overview: null,
  coverage: null,
  briefings: {},
  selectedDate: null,
  loading: true,
  refreshing: false,
  error: null,
};

function resolveSelectedDate(
  overview: MetricsOverviewResponse,
  currentSelectedDate: string | null,
): string | null {
  if (!overview.trend.length) {
    return null;
  }

  if (
    currentSelectedDate &&
    overview.trend.some((point) => point.date === currentSelectedDate)
  ) {
    return currentSelectedDate;
  }

  return overview.trend.at(-1)?.date ?? null;
}

function buildPinnedDefaultLayout(index: number): DashboardWidgetLayout {
  const row = Math.floor(index / 2);
  const column = index % 2;

  return {
    x: column === 0 ? 0 : 6,
    y: 9 + row * 5,
    w: 6,
    h: 5,
    visible: true,
  };
}

function mergeLayout(
  layout: DashboardWidgetLayout | undefined,
  fallback: DashboardWidgetLayout,
): DashboardWidgetLayout {
  return layout
    ? {
        ...fallback,
        ...layout,
        visible: layout.visible,
      }
    : fallback;
}

function composeLayouts(
  layouts: DashboardWidgetLayouts,
  pinnedWidgets: DashboardPinnedWidget[],
): DashboardWidgetLayouts {
  const nextLayouts: DashboardWidgetLayouts = {};

  for (const widget of builtInWidgets) {
    nextLayouts[widget.id] = mergeLayout(layouts[widget.id], widget.defaultLayout);
  }

  pinnedWidgets.forEach((widget, index) => {
    nextLayouts[widget.id] = mergeLayout(
      layouts[widget.id],
      buildPinnedDefaultLayout(index),
    );
  });

  return nextLayouts;
}

function syncPinnedWidgets() {
  return loadPinnedWidgets();
}

function removePinnedDashboardWidget(widgetId: string) {
  removePinnedWidget(widgetId);
}

function resolveKpiTone(
  key: string,
): "default" | "cyan" | "amber" | "rose" {
  if (key === "coverage_ratio") {
    return "cyan";
  }

  if (key === "anomaly_count") {
    return "rose";
  }

  if (key === "strongest_hour" || key === "weakest_hour") {
    return "amber";
  }

  return "default";
}

const LOADING_CANVAS_SKELETON_IDS = ["loading-canvas-1", "loading-canvas-2", "loading-canvas-3"];

const dashboardMenuItems = [
  {
    ariaLabel: "Ir al inicio",
    description: "Portada inmersiva y acceso de entrada al producto.",
    href: "/",
    label: "Inicio",
    shortLabel: "01",
  },
  {
    ariaLabel: "Ir al canvas analítico",
    description: "Workspace analítico, widgets modulares y foco en el dato.",
    href: "/dashboard",
    label: "Canvas",
    shortLabel: "02",
  },
  {
    ariaLabel: "Abrir el copilot",
    description: "Asistente conectado al histórico para abrir comparaciones y explicaciones.",
    href: "/chat",
    label: "Copilot",
    shortLabel: "03",
  },
] as const;

export function DashboardScreen() {
  const [state, setState] = useState<DashboardState>(initialState);
  const [pinnedWidgets, setPinnedWidgets] = useState<DashboardPinnedWidget[]>([]);
  const [layouts, setLayouts] = useState<DashboardWidgetLayouts>({});
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [draftFilters, setDraftFilters] = useState<FilterDraft>({
    startDate: "",
    endDate: "",
    preset: "full",
  });
  const [appliedFilters, setAppliedFilters] = useState<MetricsQueryOptions>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    function syncDashboardState() {
      const nextPinnedWidgets = syncPinnedWidgets();
      const storedLayouts = loadDashboardLayouts();
      const nextLayouts = composeLayouts(storedLayouts, nextPinnedWidgets);

      setPinnedWidgets(nextPinnedWidgets);
      setLayouts(nextLayouts);

      if (JSON.stringify(storedLayouts) !== JSON.stringify(nextLayouts)) {
        saveDashboardLayouts(nextLayouts);
      }
    }

    syncDashboardState();
    globalThis.addEventListener(DASHBOARD_WIDGETS_EVENT, syncDashboardState);
    globalThis.addEventListener("storage", syncDashboardState);

    return () => {
      globalThis.removeEventListener(DASHBOARD_WIDGETS_EVENT, syncDashboardState);
      globalThis.removeEventListener("storage", syncDashboardState);
    };
  }, []);

  useEffect(() => {
    const overviewController = new AbortController();
    const coverageController = new AbortController();
    const briefingController = new AbortController();
    const isFirstLoad = state.loading && !state.overview;

    async function load() {
      try {
        setState((current) => ({
          ...current,
          loading: isFirstLoad,
          refreshing: !isFirstLoad,
          error: null,
        }));

        const [overview, coverage] = await Promise.all([
          getMetricsOverview({
            ...appliedFilters,
            anomalyLimit: 8,
            signal: overviewController.signal,
          }),
          getCoverageExtremes({
            ...appliedFilters,
            limit: 4,
            signal: coverageController.signal,
          }),
        ]);

        const selectedDate = resolveSelectedDate(overview, state.selectedDate);
        const nextBriefings = { ...state.briefings };

        if (selectedDate && !nextBriefings[selectedDate]) {
          nextBriefings[selectedDate] = await getDayBriefing({
            anomalyLimit: 4,
            signal: briefingController.signal,
            targetDate: selectedDate,
          });
        }

        if (!draftFilters.startDate && !draftFilters.endDate) {
          setDraftFilters({
            endDate: overview.time_window.effective_end,
            preset: "full",
            startDate: overview.time_window.effective_start,
          });
        }

        setState({
          briefings: nextBriefings,
          coverage,
          error: null,
          loading: false,
          overview,
          refreshing: false,
          selectedDate,
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
          error: error instanceof Error ? error.message : "No se pudo cargar el dashboard.",
          loading: false,
          refreshing: false,
        }));
      }
    }

    void load();

    return () => {
      overviewController.abort();
      coverageController.abort();
      briefingController.abort();
    };
  }, [appliedFilters]);

  async function handleSelectDate(date: string) {
    setState((current) => ({
      ...current,
      selectedDate: date,
    }));

    if (state.briefings[date]) {
      return;
    }

    try {
      const briefing = await getDayBriefing({
        anomalyLimit: 4,
        targetDate: date,
      });

      setState((current) => ({
        ...current,
        briefings: {
          ...current.briefings,
          [date]: briefing,
        },
      }));
    } catch {
      // Keep the new selected date and retain the previous briefing if the secondary request fails.
    }
  }

  function handleLayoutsChange(nextLayouts: DashboardWidgetLayouts) {
    setLayouts(nextLayouts);
    saveDashboardLayouts(nextLayouts);
  }

  function toggleWidgetVisibility(widgetId: string, visible: boolean) {
    const nextLayouts = composeLayouts(
      {
        ...layouts,
        [widgetId]: {
          ...(layouts[widgetId] ?? { x: 0, y: 0, w: 4, h: 4, visible }),
          visible,
        },
      },
      pinnedWidgets,
    );

    handleLayoutsChange(nextLayouts);
  }

  function resetCanvasLayout() {
    const nextLayouts = composeLayouts({}, pinnedWidgets);
    handleLayoutsChange(nextLayouts);
  }

  function applyDraftFilters() {
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      setFormError("La fecha inicial no puede ser mayor que la fecha final.");
      return;
    }

    setFormError(null);
    setAppliedFilters({
      endDate: draftFilters.endDate || undefined,
      startDate: draftFilters.startDate || undefined,
    });
  }

  function applyPreset(preset: DashboardFilterPreset) {
    if (!state.overview) {
      return;
    }

    const allDates = state.overview.trend.map((point) => point.date);
    const fullStart = allDates[0] ?? "";
    const fullEnd = allDates.at(-1) ?? "";
    let nextStart = fullStart;
    let nextEnd = fullEnd;

    if (preset === "last5") {
      nextStart = allDates[Math.max(allDates.length - 5, 0)] ?? fullStart;
    }

    if (preset === "last3") {
      nextStart = allDates[Math.max(allDates.length - 3, 0)] ?? fullStart;
    }

    if (preset === "fragile") {
      const weakestDay = state.coverage?.lowest_coverage_days[0]?.date;
      if (weakestDay) {
        nextStart = weakestDay;
        nextEnd = weakestDay;
      }
    }

    setDraftFilters({
      endDate: nextEnd,
      preset,
      startDate: nextStart,
    });
    setFormError(null);
    setAppliedFilters({
      endDate: nextEnd || undefined,
      startDate: nextStart || undefined,
    });
  }

  const latestKnownBriefing = Object.values(state.briefings).at(-1) ?? null;
  const activeBriefing =
    (state.selectedDate ? state.briefings[state.selectedDate] : null) ?? latestKnownBriefing;

  if (state.loading && !state.overview) {
    return (
      <main className="dashboard-page-shell dashboard-pro-shell min-h-dvh px-3 py-3 sm:px-4 sm:py-4">
        <div className="relative z-10 flex min-h-[calc(100dvh-1.5rem)] flex-col gap-3 sm:min-h-[calc(100dvh-2rem)]">
          <div className="flex items-center justify-between gap-3">
            <div className="panel h-12 w-[136px] animate-pulse rounded-full" />
            <div className="flex gap-2">
              <div className="panel hidden h-12 w-[180px] animate-pulse rounded-full sm:block" />
              <div className="panel h-12 w-[132px] animate-pulse rounded-full" />
            </div>
          </div>
          <div className="panel min-h-[calc(100dvh-5rem)] flex-1 animate-pulse rounded-[40px]">
            <div className="grid h-full gap-3 p-3 lg:grid-cols-12">
              {LOADING_CANVAS_SKELETON_IDS.map((key) => (
                <div
                  className="rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
                  key={key}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!state.overview || !state.coverage || !activeBriefing) {
    return (
      <main className="dashboard-page-shell dashboard-pro-shell min-h-dvh px-3 py-3 sm:px-4 sm:py-4">
        <section className="panel min-h-[calc(100dvh-1.5rem)] rounded-[40px] p-8 sm:min-h-[calc(100dvh-2rem)] sm:p-10">
          <p className="eyebrow">Canvas no disponible</p>
          <h1
            className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)] sm:text-5xl"
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            No pudimos montar el workspace.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--text-soft)]">
            {state.error ?? "Levante el backend y recargue la página para reconstruir el tablero."}
          </p>
        </section>
      </main>
    );
  }

  const overview = state.overview;
  const briefing = activeBriefing.briefing;
  const activeSelectedDate = state.selectedDate ?? activeBriefing.briefing.target_date;
  const studioItems: DashboardStudioItem[] = [
    ...builtInWidgets.map((widget) => ({
      description: widget.description,
      id: widget.id,
      title: widget.title,
      visible: layouts[widget.id]?.visible ?? widget.defaultLayout.visible,
    })),
    ...pinnedWidgets.map((widget) => ({
      description: "Pieza nacida desde el copiloto y fijada al canvas para reutilizarla.",
      id: widget.id,
      pinned: true,
      title: widget.title,
      visible: layouts[widget.id]?.visible ?? true,
    })),
  ];
  const canvasItems: Array<{
    accent: "amber" | "cyan" | "default" | "rose";
    id: string;
    minH: number;
    minW: number;
    title: string;
  }> = [
    ...builtInWidgets.map((widget) => ({
      accent: widget.accent,
      id: widget.id,
      minH: widget.minH,
      minW: widget.minW,
      title: widget.title,
    })),
    ...pinnedWidgets.map((widget) => ({
      accent: widget.artifact ? ("cyan" as const) : ("amber" as const),
      id: widget.id,
      minH: 3,
      minW: 4,
      title: widget.title,
    })),
  ];
  const visibleWidgetCount = studioItems.filter((item) => item.visible).length;
  const rangeLabel = `${formatLongDate(overview.time_window.effective_start)} a ${formatLongDate(
    overview.time_window.effective_end,
  )}`;
  const copilotoQuestion = `¿Qué pasó el ${activeSelectedDate}?`;
  const overviewKpis = overview.kpis.map((kpi) => ({
    ...mapKpiToUi(kpi),
    key: kpi.key,
    tone: resolveKpiTone(kpi.key),
  }));

  function renderWidget(widgetId: string, meta: DashboardCanvasRenderMeta) {
    if (widgetId === "signal-timeline") {
      return (
        <SignalTimelineWidget
          notes={overview.notes}
          onSelectDate={handleSelectDate}
          points={overview.trend}
          selectedDate={activeSelectedDate}
          size={meta.size}
        />
      );
    }

    if (widgetId === "day-spotlight") {
      return <DaySpotlightWidget briefing={briefing} size={meta.size} />;
    }

    if (widgetId === "intraday-rhythm") {
      return <IntradayRhythmWidget profile={overview.intraday_profile} size={meta.size} />;
    }

    if (widgetId === "anomaly-pulse") {
      return <AnomalyPulseWidget anomalies={overview.top_anomalies} size={meta.size} />;
    }

    if (widgetId === "quality-lens") {
      return <QualityLensWidget overview={overview} size={meta.size} />;
    }

    const pinnedWidget = pinnedWidgets.find((widget) => widget.id === widgetId);
    if (!pinnedWidget) {
      return null;
    }

    return (
      <PinnedWidget
        onRemove={() => removePinnedDashboardWidget(widgetId)}
        size={meta.size}
        widget={pinnedWidget}
      />
    );
  }

  return (
    <main className="dashboard-page-shell dashboard-pro-shell min-h-dvh px-3 py-3 sm:px-4 sm:py-4">
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1640px] flex-col gap-2.5 sm:min-h-[calc(100dvh-2rem)]">
        <div className="pointer-events-auto fixed left-4 top-4 z-40 sm:left-6 sm:top-6">
          <DashboardStaggeredMenu items={dashboardMenuItems} />
        </div>

        <section className="dashboard-command-bar rounded-[34px] px-4 py-4 sm:px-5 sm:py-4">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="copilot-pill rounded-full px-3 py-2 text-xs">
                  {rangeLabel}
                </span>
                {state.refreshing ? (
                  <span className="rounded-full border border-[color:rgba(255,122,31,0.2)] bg-[color:rgba(255,122,31,0.12)] px-3 py-2 text-xs text-[color:#ffd5be]">
                    actualizando
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  className="copilot-outline-button rounded-full px-4 py-2 text-sm text-[color:var(--text-soft)] transition hover:text-[color:var(--text-strong)]"
                  onClick={() => setPanelCollapsed((current) => !current)}
                  type="button"
                >
                  {panelCollapsed ? "Filtros" : "Cerrar panel"}
                </button>
                <Link
                  className="copilot-gradient-button rounded-full px-4 py-2 text-sm font-medium text-[color:#fff7f3] transition"
                  href={`/chat?question=${encodeURIComponent(copilotoQuestion)}`}
                >
                  Abrir copilot
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <div>
                  <p className="eyebrow">1. Snapshot</p>
                  <h1
                    className="mt-3 max-w-[12ch] text-[clamp(2.2rem,5vw,4.7rem)] font-semibold tracking-[-0.08em] text-[color:var(--text-strong)]"
                    style={{ fontFamily: "var(--font-heading), serif" }}
                  >
                    Decisiones rápidas. Señal primero.
                  </h1>
                  <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                    {formatShortDate(activeSelectedDate)} · {visibleWidgetCount} módulos visibles
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-5">
                {overviewKpis.map((kpi) => (
                  <MetricTile
                    caption={kpi.caption}
                    key={kpi.key}
                    label={kpi.label}
                    tone={kpi.tone}
                    value={kpi.value}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {state.error ? (
          <div className="rounded-[24px] border border-[color:rgba(178,76,89,0.22)] bg-[color:rgba(178,76,89,0.08)] px-4 py-3 text-sm text-[color:var(--signal-rose)]">
            {state.error}
          </div>
        ) : null}

        <DashboardStudioPanel
          activePreset={draftFilters.preset}
          collapsed={panelCollapsed}
          draftEndDate={draftFilters.endDate}
          draftStartDate={draftFilters.startDate}
          formError={formError}
          itemCountLabel={`${visibleWidgetCount} visibles`}
          items={studioItems}
          onApplyFilters={applyDraftFilters}
          onEndDateChange={(value) =>
            setDraftFilters((current) => ({
              ...current,
              endDate: value,
            }))
          }
          onPresetSelect={applyPreset}
          onReset={resetCanvasLayout}
          onStartDateChange={(value) =>
            setDraftFilters((current) => ({
              ...current,
              startDate: value,
            }))
          }
          onToggleCollapsed={() => setPanelCollapsed((current) => !current)}
          onVisibilityChange={toggleWidgetVisibility}
          rangeLabel={rangeLabel}
          refreshing={state.refreshing}
          selectedDayLabel={formatShortDate(activeSelectedDate)}
        />

        <section className="relative flex-1 min-h-[calc(100dvh-8.5rem)] sm:min-h-[calc(100dvh-10rem)]">
          <DashboardCanvas
            className="min-h-full"
            items={canvasItems}
            layouts={layouts}
            onLayoutsChange={handleLayoutsChange}
            renderItem={renderWidget}
          />
        </section>
      </div>
    </main>
  );
}
