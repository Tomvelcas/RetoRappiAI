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
import { coverageChip, formatLongDate, formatShortDate } from "@/lib/format";

import { DashboardCanvas } from "@/components/dashboard-canvas";
import {
  DashboardStudioPanel,
  type DashboardFilterPreset,
  type DashboardStudioItem,
} from "@/components/dashboard-studio-panel";
import {
  AnomalyPulseWidget,
  CoverageExtremesWidget,
  DaySpotlightWidget,
  IntradayRhythmWidget,
  PinnedWidget,
  QualityLensWidget,
  SignalTimelineWidget,
} from "@/components/dashboard-widgets";
import { InfoTooltip } from "@/components/ui/info-tooltip";

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
    defaultLayout: { x: 0, y: 0, w: 7, h: 6, visible: true },
    description: "Curva principal con lectura diaria, escala visible y selección por fecha.",
    id: "signal-timeline",
    minH: 4,
    minW: 5,
    title: "Señal principal",
  },
  {
    accent: "amber",
    defaultLayout: { x: 7, y: 0, w: 5, h: 5, visible: true },
    description: "Resumen operativo del día seleccionado con highlights y cautelas.",
    id: "day-spotlight",
    minH: 4,
    minW: 4,
    title: "Día abierto",
  },
  {
    accent: "default",
    defaultLayout: { x: 4, y: 6, w: 3, h: 4, visible: true },
    description: "Perfil horario para entender picos y valles durante el día.",
    id: "intraday-rhythm",
    minH: 4,
    minW: 3,
    title: "Ritmo intradía",
  },
  {
    accent: "rose",
    defaultLayout: { x: 7, y: 5, w: 5, h: 5, visible: true },
    description: "Momentos que merecen inspección por magnitud y confianza.",
    id: "anomaly-pulse",
    minH: 4,
    minW: 4,
    title: "Anomalías",
  },
  {
    accent: "amber",
    defaultLayout: { x: 0, y: 6, w: 4, h: 4, visible: true },
    description: "Indicadores de cobertura y fragilidad del rango activo.",
    id: "quality-lens",
    minH: 3,
    minW: 3,
    title: "Calidad del dato",
  },
  {
    accent: "cyan",
    defaultLayout: { x: 0, y: 10, w: 12, h: 5, visible: true },
    description: "Días más frágiles y mejor cubiertos para abrir el análisis rápido.",
    id: "coverage-extremes",
    minH: 4,
    minW: 5,
    title: "Extremos de cobertura",
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
    y: 16 + row * 5,
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

const LOADING_KPI_SKELETON_IDS = ["loading-kpi-1", "loading-kpi-2", "loading-kpi-3", "loading-kpi-4"];

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
      <main className="mx-auto max-w-[1500px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-4">
          <div className="panel h-[180px] animate-pulse rounded-[34px]" />
          <div className="grid gap-4 md:grid-cols-4">
            {LOADING_KPI_SKELETON_IDS.map((key) => (
              <div className="panel h-[138px] animate-pulse rounded-[28px]" key={key} />
            ))}
          </div>
          <div className="panel h-[920px] animate-pulse rounded-[34px]" />
        </div>
      </main>
    );
  }

  if (!state.overview || !state.coverage || !activeBriefing) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <section className="panel rounded-[34px] p-8">
          <p className="eyebrow">Dashboard no disponible</p>
          <h1
            className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)] sm:text-5xl"
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            No pudimos montar el canvas.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--text-soft)]">
            {state.error ?? "Levante el backend y recargue la página para reconstruir el tablero."}
          </p>
        </section>
      </main>
    );
  }

  const overview = state.overview;
  const coverage = state.coverage;
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

  function renderWidget(widgetId: string) {
    if (widgetId === "signal-timeline") {
      return (
        <SignalTimelineWidget
          notes={overview.notes}
          onSelectDate={handleSelectDate}
          points={overview.trend}
          selectedDate={activeSelectedDate}
        />
      );
    }

    if (widgetId === "day-spotlight") {
      return <DaySpotlightWidget briefing={briefing} />;
    }

    if (widgetId === "intraday-rhythm") {
      return <IntradayRhythmWidget profile={overview.intraday_profile} />;
    }

    if (widgetId === "anomaly-pulse") {
      return <AnomalyPulseWidget anomalies={overview.top_anomalies} />;
    }

    if (widgetId === "quality-lens") {
      return <QualityLensWidget overview={overview} />;
    }

    if (widgetId === "coverage-extremes") {
      return (
        <CoverageExtremesWidget
          coverage={coverage}
          onSelectDate={handleSelectDate}
          selectedDate={activeSelectedDate}
        />
      );
    }

    const pinnedWidget = pinnedWidgets.find((widget) => widget.id === widgetId);
    if (!pinnedWidget) {
      return null;
    }

    return (
      <PinnedWidget
        onRemove={() => removePinnedDashboardWidget(widgetId)}
        widget={pinnedWidget}
      />
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel rounded-[34px] px-6 py-6 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">Disponibilidad histórica</span>
            <span className="rounded-full border border-[color:rgba(21,125,120,0.2)] bg-[color:rgba(21,125,120,0.08)] px-3 py-1 text-xs text-[color:var(--signal-cyan)]">
              {visibleWidgetCount} piezas activas
            </span>
            {state.refreshing ? (
              <span className="rounded-full border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(176,108,31,0.08)] px-3 py-1 text-xs text-[color:var(--signal-amber)]">
                actualizando
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1
                className="max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-[color:var(--text-strong)] sm:text-5xl"
                style={{ fontFamily: "var(--font-heading), serif" }}
              >
                Un canvas visual que puede mover, estirar y rearmar sin perder claridad.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--text-soft)] sm:text-base sm:leading-8">
                Cada card se comporta como una pieza viva del tablero. Puede arrastrarla desde
                cualquier zona del módulo, redimensionarla desde la pestaña inferior derecha y
                reordenar el conjunto sin romper la composición.
              </p>
            </div>

            <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.78)] p-5">
              <div className="flex items-center gap-2">
                <p className="eyebrow">Lectura rápida</p>
                <InfoTooltip content="Este resumen siempre refleja el rango activo. Use el panel del canvas para cambiarlo sin ocupar media pantalla." />
              </div>
              <p className="mt-3 text-lg font-semibold text-[color:var(--text-strong)]">
                {rangeLabel}
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-soft)]">
                Día activo: {formatShortDate(activeSelectedDate)}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-[color:var(--text-strong)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92"
                  onClick={() => setPanelCollapsed((current) => !current)}
                  type="button"
                >
                  {panelCollapsed ? "Abrir panel" : "Cerrar panel"}
                </button>
                <Link
                  className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                  href={`/chat?question=${encodeURIComponent(copilotoQuestion)}`}
                >
                  Abrir en copiloto
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="panel rounded-[30px] px-5 py-5">
            <p className="eyebrow">Día seleccionado</p>
            <p
              className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              {formatLongDate(activeSelectedDate)}
            </p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">
              {briefing.headline}
            </p>
          </div>

          <div className="panel rounded-[30px] px-5 py-5">
            <p className="eyebrow">Estado del tablero</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]">
              {pinnedWidgets.length}
            </p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-soft)]">
              widgets fijados desde el copiloto. Puede usarlos como piezas nuevas dentro del
              canvas.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.kpis.slice(0, 4).map((kpi) => (
          <article className="panel rounded-[28px] px-5 py-5" key={kpi.key}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                {kpi.label}
              </p>
              {kpi.confidence ? (
                <span className={`rounded-full border px-3 py-1 text-xs ${coverageChip(kpi.confidence)}`}>
                  {kpi.confidence}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]">
              {kpi.formatted_value}
            </p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">{kpi.context}</p>
            {kpi.change_label ? (
              <p className="mt-3 text-xs text-[color:var(--text-dim)]">{kpi.change_label}</p>
            ) : null}
          </article>
        ))}
      </section>

      {state.error ? (
        <div className="mt-4 rounded-[24px] border border-[color:rgba(178,76,89,0.22)] bg-[color:rgba(178,76,89,0.08)] px-4 py-3 text-sm text-[color:var(--signal-rose)]">
          {state.error}
        </div>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">Canvas interactivo</span>
            <span className="rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[color:var(--text-soft)]">
              Arrastre desde cualquier card
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[color:var(--text-soft)]">
              Redimensione desde la pestaña inferior derecha
            </span>
          </div>
          <button
            className="rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.7)] px-4 py-2 text-sm text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
            onClick={() => setPanelCollapsed((current) => !current)}
            type="button"
          >
            {panelCollapsed ? "Configurar canvas" : "Ocultar configuración"}
          </button>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute right-4 top-4 z-30">
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
          </div>

          <DashboardCanvas
            items={canvasItems}
            layouts={layouts}
            onLayoutsChange={handleLayoutsChange}
            renderItem={renderWidget}
          />
        </div>
      </section>
    </main>
  );
}
