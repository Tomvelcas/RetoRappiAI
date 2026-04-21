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
import type { DashboardCardSize } from "@/components/dashboard-canvas";
import type { DashboardPinnedWidget } from "@/lib/dashboard-store";
import {
  anomalyLabel,
  confidenceLabel,
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

type WidgetChromeProps = Readonly<{
  guide?: WidgetGuide;
  eyebrow: string;
  title: string;
  description: string;
  size?: DashboardCardSize;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}>;

type OrbInsightWidgetProps = Readonly<{
  activeDate: string;
  briefing: DayBriefing;
  focusQuestion: string;
  pinnedCount: number;
  rangeLabel: string;
  size?: DashboardCardSize;
  weakestDate: string | null;
}>;

type SignalTimelineWidgetProps = Readonly<{
  points: DailyTrendPoint[];
  selectedDate: string;
  notes: string[];
  onSelectDate: (date: string) => void;
  actions?: React.ReactNode;
  size?: DashboardCardSize;
}>;

type DaySpotlightWidgetProps = Readonly<{
  briefing: DayBriefing;
  actions?: React.ReactNode;
  size?: DashboardCardSize;
}>;

type IntradayRhythmWidgetProps = Readonly<{
  profile: IntradayProfilePoint[];
  actions?: React.ReactNode;
  size?: DashboardCardSize;
}>;

type AnomalyPulseWidgetProps = Readonly<{
  anomalies: AnomalyHighlight[];
  actions?: React.ReactNode;
  size?: DashboardCardSize;
}>;

type QualityLensWidgetProps = Readonly<{
  overview: MetricsOverviewResponse;
  actions?: React.ReactNode;
  size?: DashboardCardSize;
}>;

type CoverageExtremesWidgetProps = Readonly<{
  coverage: MetricsCoverageExtremesResponse;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  actions?: React.ReactNode;
  size?: DashboardCardSize;
}>;

type PinnedWidgetProps = Readonly<{
  widget: DashboardPinnedWidget;
  onRemove: () => void;
  actions?: React.ReactNode;
  size?: DashboardCardSize;
}>;

type WidgetGuide = Readonly<{
  summary: string;
  title?: string;
  bullets?: readonly string[];
  signals?: ReadonlyArray<Readonly<{ label: string; value: string }>>;
  nextStep?: string;
}>;

function WidgetChrome({
  guide,
  eyebrow,
  title,
  description,
  size = "large",
  actions,
  children,
  footer,
}: WidgetChromeProps) {
  const [flipped, setFlipped] = useState(false);
  const isCompact = size === "small";
  const isHero = size === "hero";
  const canFlip = Boolean(guide) && !isCompact;
  const showDescription = !canFlip && !isCompact && isHero;
  const paddingClassName = isCompact ? "p-3.5" : isHero ? "p-5 sm:p-6" : "p-4 sm:p-5";
  const titleClassName = isCompact
    ? "text-[1.12rem] sm:text-[1.2rem]"
    : isHero
      ? "text-[1.45rem] sm:text-[1.7rem]"
      : "text-[1.28rem] sm:text-[1.55rem]";

  const header = (
    <div
      className={[
        "flex flex-col gap-3 border-b border-[color:var(--border)]",
        isCompact ? "pb-3" : "pb-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h3
            className={[
              "mt-2 max-w-[16ch] font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]",
              titleClassName,
            ].join(" ")}
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          {canFlip ? (
            <button
              aria-label={flipped ? "Volver a los datos" : "Ver explicación de la card"}
              className="copilot-outline-button inline-flex size-10 items-center justify-center rounded-full text-[color:var(--text-soft)] transition hover:text-[color:var(--text-strong)]"
              data-canvas-interactive="true"
              onClick={() => setFlipped((current) => !current)}
              type="button"
            >
              <svg
                aria-hidden="true"
                className={[
                  "size-4 transition-transform duration-300",
                  flipped ? "rotate-180" : "",
                ].join(" ")}
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 6h10v10"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
                <path
                  d="M16 18H6V8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {showDescription ? (
        <p
          className="max-w-[48ch] text-[13px] leading-6 text-[color:var(--text-soft)]"
          style={{
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: isHero ? 2 : 1,
            display: "-webkit-box",
            overflow: "hidden",
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );

  return (
    <section
      className={[
        "panel relative flex h-full min-h-0 flex-col rounded-[30px] border border-[color:var(--border)]",
        paddingClassName,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-t-[30px] bg-[linear-gradient(180deg,rgba(255,189,148,0.12),transparent)]" />
      <div className="dashboard-flip-shell flex-1">
        <div
          className={[
            "dashboard-flip-panel h-full",
            flipped && canFlip ? "dashboard-flipped" : "",
          ].join(" ")}
        >
          <div className="dashboard-flip-face flex h-full min-h-0 flex-col">
            {header}
            <div
              className={[
                "glass-scroll flex-1 min-h-0 overflow-auto",
                isCompact ? "pt-3" : "pt-4",
              ].join(" ")}
            >
              {children}
            </div>
            {!isCompact && footer ? (
              <div className="mt-4 border-t border-[color:var(--border)] pt-4">{footer}</div>
            ) : null}
          </div>

          {canFlip && guide ? (
            <div className="dashboard-flip-face dashboard-flip-back flex h-full min-h-0 flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] pb-4">
                <div className="min-w-0">
                  <p className="eyebrow">Cómo leerla</p>
                  <h3
                    className={[
                      "mt-2 max-w-[18ch] font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]",
                      titleClassName,
                    ].join(" ")}
                    style={{ fontFamily: "var(--font-heading), serif" }}
                  >
                    {guide.title ?? `Qué significa ${title.toLowerCase()}`}
                  </h3>
                </div>

                <button
                  aria-label="Volver a los datos"
                  className="copilot-outline-button inline-flex size-10 items-center justify-center rounded-full text-[color:var(--text-soft)] transition hover:text-[color:var(--text-strong)]"
                  data-canvas-interactive="true"
                  onClick={() => setFlipped(false)}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 6H5v10"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M7 18h10V8"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.7"
                    />
                  </svg>
                </button>
              </div>

              <div className="glass-scroll flex-1 min-h-0 space-y-4 overflow-auto pt-4">
                <div className="rounded-[24px] border border-[color:rgba(255,122,31,0.18)] bg-[linear-gradient(135deg,rgba(255,122,31,0.16),rgba(255,92,0,0.08)_42%,rgba(16,5,2,0.82)_100%)] p-4 shadow-[0_0_24px_rgba(255,122,31,0.08)]">
                  <p className="text-sm leading-7 text-[color:var(--text-soft)]">
                    {guide.summary}
                  </p>
                </div>

                {guide.signals?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {guide.signals.map((signal) => (
                      <div
                        className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                        key={signal.label}
                      >
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                          {signal.label}
                        </p>
                        <p className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">
                          {signal.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {guide.bullets?.length ? (
                  <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(255,122,31,0.06),rgba(14,5,2,0.88))] p-4">
                    <p className="text-sm font-medium text-[color:var(--text-strong)]">
                      Qué mirar primero
                    </p>
                    <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[color:var(--text-soft)]">
                      {guide.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {guide.nextStep ? (
                  <div className="rounded-[24px] border border-[color:rgba(255,122,31,0.22)] bg-[linear-gradient(135deg,rgba(255,177,111,0.14),rgba(255,94,16,0.14)_38%,rgba(16,5,2,0.82)_100%)] p-4 shadow-[0_0_20px_rgba(255,122,31,0.08)]">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                      Siguiente paso
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
                      {guide.nextStep}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  tone = "default",
}: Readonly<{
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}>) {
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

export function MetricTile({
  label,
  value,
  caption,
  tone = "default",
}: Readonly<{
  caption?: string;
  label: string;
  tone?: "default" | "cyan" | "amber" | "rose";
  value: string;
}>) {
  const toneConfig =
    tone === "cyan"
      ? {
          accentClassName:
            "border-[color:rgba(255,160,96,0.24)] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_28%),linear-gradient(135deg,rgba(255,194,132,0.24),rgba(255,117,36,0.18)_40%,rgba(24,7,3,0.18)_100%)] shadow-[0_0_30px_rgba(255,122,31,0.14)]",
          captionClassName: "text-[color:#ffd4bf]",
          lineClassName:
            "bg-[linear-gradient(90deg,rgba(255,232,214,0.24),rgba(255,162,85,0.92),transparent)]",
          glowClassName:
            "bg-[radial-gradient(circle_at_100%_0%,rgba(255,196,126,0.48),transparent_52%)]",
        }
      : tone === "amber"
        ? {
            accentClassName:
              "border-[color:rgba(255,122,31,0.28)] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_28%),linear-gradient(135deg,rgba(255,180,88,0.28),rgba(255,98,18,0.24)_42%,rgba(64,18,7,0.74)_100%)] shadow-[0_0_32px_rgba(255,94,16,0.16)]",
            captionClassName: "text-[color:#ffb98e]",
            lineClassName:
              "bg-[linear-gradient(90deg,rgba(255,230,206,0.2),rgba(255,123,40,0.94),transparent)]",
            glowClassName:
              "bg-[radial-gradient(circle_at_100%_0%,rgba(255,120,34,0.58),transparent_56%)]",
          }
        : tone === "rose"
          ? {
              accentClassName:
                "border-[color:rgba(214,103,67,0.24)] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_28%),linear-gradient(135deg,rgba(184,76,88,0.28),rgba(255,106,48,0.16)_34%,rgba(20,6,3,0.48)_100%)] shadow-[0_0_26px_rgba(214,103,67,0.14)]",
              captionClassName: "text-[color:#ff9f8f]",
              lineClassName:
                "bg-[linear-gradient(90deg,rgba(255,222,214,0.2),rgba(255,112,82,0.92),transparent)]",
              glowClassName:
                "bg-[radial-gradient(circle_at_100%_0%,rgba(214,103,67,0.36),transparent_54%)]",
            }
          : {
              accentClassName:
                "border-[color:rgba(255,188,150,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02)_28%),linear-gradient(135deg,rgba(255,150,70,0.1),rgba(20,6,3,0.9))]",
              captionClassName: "text-[color:var(--text-soft)]",
              lineClassName:
                "bg-[linear-gradient(90deg,rgba(255,228,212,0.18),rgba(255,176,132,0.74),transparent)]",
              glowClassName:
                "bg-[radial-gradient(circle_at_100%_0%,rgba(255,122,31,0.18),transparent_56%)]",
            };

  return (
    <div
      className={[
        "group relative min-h-[118px] overflow-hidden rounded-[10px] border px-5 py-4",
        toneConfig.accentClassName,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-18 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_65%)]" />
      <div className={["pointer-events-none absolute inset-0 opacity-100", toneConfig.glowClassName].join(" ")} />
      <div className={["pointer-events-none absolute inset-x-5 top-0 h-px", toneConfig.lineClassName].join(" ")} />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_28%)] opacity-60" />
      <div className="relative z-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(255,233,220,0.62)]">
          {label}
        </p>
      </div>
      <p className="relative z-10 mt-5 text-[1.6rem] font-semibold tracking-[-0.06em] text-[color:#fffaf7] sm:text-[2rem]">
        {value}
      </p>
      {caption ? (
        <p className={["relative z-10 mt-2 text-xs leading-5", toneConfig.captionClassName].join(" ")}>
          {caption}
        </p>
      ) : null}
      <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,176,132,0.44),transparent)] opacity-60" />
    </div>
  );
}

function SectionLabel({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-dim)]">
      {children}
    </p>
  );
}

export function OrbInsightWidget({
  activeDate,
  briefing,
  focusQuestion,
  pinnedCount,
  rangeLabel,
  size = "large",
  weakestDate,
}: OrbInsightWidgetProps) {
  const stackedLayout = size === "small" || size === "medium";

  return (
    <WidgetChrome
      description="Vista ejecutiva del rango activo: qué fecha está abierta, cuál es el nivel observado y desde dónde saltar al asistente."
      eyebrow="Resumen central"
      guide={{
        summary:
          "Esta card resume el estado más importante del rango activo. Combina la lectura de la fecha elegida con la puerta directa al asistente para profundizar sin perder el contexto del tablero.",
        signals: [
          { label: "Cobertura", value: "Cuánto soporte tiene la lectura actual." },
          { label: "Nivel medio", value: "Valor promedio observado en el día activo." },
          { label: "Hora más débil", value: "Franja donde la señal cae más dentro del día." },
          { label: "Día más frágil", value: "Fecha con menor soporte dentro del rango activo." },
        ],
        bullets: [
          "Si la cobertura es baja, lea el insight con cautela antes de concluir un problema real.",
          "Use la hora más débil para abrir el patrón horario y revisar si la caída es puntual o repetida.",
          "Si el día más frágil coincide con anomalías, abra el asistente desde aquí para pedir causas o comparación.",
        ],
        nextStep:
          "Use el botón del asistente cuando quiera convertir este resumen en una explicación o en nuevas piezas para el tablero.",
      }}
      size={size}
      title="Resumen"
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            caption={formatShortDate(activeDate)}
            label="Cobertura del día"
            tone="cyan"
            value={formatCoverage(briefing.coverage_ratio)}
          />
          <MetricTile
            caption={briefing.delta_vs_prior_day_label ?? "Sin comparación previa"}
            label="Nivel medio"
            tone="default"
            value={briefing.formatted_mean_signal}
          />
          <MetricTile
            caption={formatCoverage(briefing.weakest_hour.coverage_ratio)}
            label="Hora más débil"
            tone="rose"
            value={briefing.weakest_hour.label}
          />
          <MetricTile
            caption={`${pinnedCount} piezas fijadas`}
            label="Día más frágil"
            tone="amber"
            value={weakestDate ? formatShortDate(weakestDate) : "n/d"}
          />
        </div>

        <div className={["grid gap-4", stackedLayout ? "" : "xl:grid-cols-[minmax(0,1.02fr)_minmax(260px,0.98fr)]"].join(" ")}>
          <div className="dashboard-stage-screen rounded-[32px] p-4 sm:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,229,192,0.18),transparent_20%),radial-gradient(circle_at_28%_78%,rgba(255,96,18,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.1),transparent_30%)]" />
            <div className="relative z-10 grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
              <div className="grid gap-4">
                <div className="dashboard-stage-glass-card rounded-[26px] p-5 sm:p-6">
                  <SectionLabel>Lectura principal</SectionLabel>
                  <p
                    className="mt-3 max-w-[16ch] text-[1.45rem] font-semibold tracking-[-0.05em] text-white sm:text-[1.8rem]"
                    style={{
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: stackedLayout ? 2 : 3,
                      display: "-webkit-box",
                      fontFamily: "var(--font-heading), serif",
                      overflow: "hidden",
                    }}
                  >
                    {briefing.headline}
                  </p>
                  <p
                    className="mt-3 max-w-[42ch] text-sm leading-7 text-[color:rgba(255,244,236,0.82)]"
                    style={{
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 3,
                      display: "-webkit-box",
                      overflow: "hidden",
                    }}
                  >
                    {briefing.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[color:rgba(255,210,190,0.2)] bg-[color:rgba(24,8,4,0.3)] px-3 py-2 text-xs text-[color:#fff2ea] shadow-[0_0_18px_rgba(255,116,40,0.08)]">
                      {rangeLabel}
                    </span>
                    <span className="rounded-full border border-[color:rgba(255,210,190,0.2)] bg-[color:rgba(24,8,4,0.3)] px-3 py-2 text-xs text-[color:#fff2ea] shadow-[0_0_18px_rgba(255,116,40,0.08)]">
                      {briefing.confidence}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[briefing.highlights[0], briefing.highlights[1] ?? briefing.cautions[0]].filter(Boolean).map((item) => (
                    <div
                      className="dashboard-stage-glass-card rounded-[22px] px-4 py-3"
                      key={item}
                    >
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(255,232,220,0.58)]">
                        Respaldo
                      </p>
                      <p
                        className="mt-2 text-sm leading-6 text-[color:#fff2ea]"
                        style={{
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          display: "-webkit-box",
                          overflow: "hidden",
                        }}
                      >
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="dashboard-stage-orb-shell aspect-[0.88] rounded-[30px] p-4">
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,235,205,0.86),rgba(255,135,69,0.72),transparent)]" />
                  <div className="relative z-10 grid h-full gap-3">
                    <div className="dashboard-stage-glass-card rounded-[22px] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(255,232,220,0.58)]">
                        Fecha abierta
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-3xl font-semibold tracking-[-0.06em] text-white">
                            {activeDate.slice(-2)}
                          </p>
                          <p className="mt-1 text-xs text-[color:rgba(255,232,220,0.72)]">
                            {formatShortDate(activeDate)}
                          </p>
                        </div>
                        <span className="rounded-full border border-[color:rgba(255,255,255,0.16)] bg-[color:rgba(255,96,18,0.14)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:#fff2ea] shadow-[0_0_18px_rgba(255,96,18,0.14)]">
                          activa
                        </span>
                      </div>
                    </div>

                    <div className="dashboard-stage-glass-card rounded-[22px] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(255,232,220,0.58)]">
                        Mapa
                      </p>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {Array.from({ length: 12 }).map((_, index) => {
                          const active =
                            index === 2 ||
                            index === 5 ||
                            index === 6 ||
                            index === 9;
                          const warm = index === 7 || index === 10;

                          return (
                            <div
                              className={[
                                "aspect-square rounded-[12px] border",
                                active
                                  ? "border-[color:rgba(255,190,155,0.18)] bg-[color:rgba(255,90,0,0.92)]"
                                  : warm
                                    ? "border-[color:rgba(255,190,155,0.12)] bg-[color:rgba(255,146,92,0.82)]"
                                    : "border-[color:rgba(255,255,255,0.08)] bg-[repeating-linear-gradient(135deg,rgba(255,194,161,0.2)_0,rgba(255,194,161,0.2)_2px,transparent_2px,transparent_6px)]",
                              ].join(" ")}
                              key={`overview-grid-${index}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="dashboard-stage-glass-card rounded-[20px] px-3 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(255,232,220,0.58)]">
                          KPI
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {briefing.formatted_mean_signal}
                        </p>
                      </div>
                      <div className="dashboard-stage-glass-card rounded-[20px] px-3 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(255,232,220,0.58)]">
                          Riesgo
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {briefing.weakest_hour.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-stage-glass-card rounded-[22px] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(255,232,220,0.58)]">
                    Asistente listo
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:#fff2ea]">
                    Abra esta fecha, compárela o conviértala en piezas nuevas del tablero.
                  </p>
                  <Link
                    className="copilot-gradient-button mt-4 inline-flex rounded-full px-4 py-2 text-sm font-medium text-[color:#fff7f3] transition"
                    href={`/chat?question=${encodeURIComponent(focusQuestion)}`}
                  >
                    Abrir asistente
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WidgetChrome>
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
  const height = 340;
  const padding = { left: 64, right: 20, top: 20, bottom: 44 };
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

  const floor = 296;
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
  size = "hero",
}: SignalTimelineWidgetProps) {
  const { points: chartPoints, minValue, maxValue } = buildChartPoints(points);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const activePoint =
    chartPoints.find((item) => item.point.date === (hoveredDate ?? selectedDate)) ?? chartPoints[0];
  const strongestPoint = [...points].sort((left, right) => right.mean_signal - left.mean_signal)[0] ?? null;
  const weakestCoveragePoint = [...points].sort((left, right) => left.coverage_ratio - right.coverage_ratio)[0] ?? null;
  const yTicks = [maxValue, (maxValue + minValue) / 2, minValue];

  return (
    <WidgetChrome
      actions={
        <div className="flex flex-wrap gap-2">
          {activePoint ? (
            <span className="rounded-full border border-[color:rgba(255,122,31,0.2)] bg-[color:rgba(255,122,31,0.12)] px-3 py-2 text-xs text-[color:#ffd4bf]">
              {formatShortDate(activePoint.point.date)} · {formatCompactNumber(activePoint.point.mean_signal)}
            </span>
          ) : null}
          {actions}
        </div>
      }
      description="Serie diaria del rango con nivel medio y soporte observado."
      eyebrow="Tendencia"
      guide={{
        summary:
          "Esta card es la vista maestra del histórico. Aquí debe nacer la primera hipótesis: qué día cambia la señal, si el cambio está bien cubierto y qué tan sostenido fue.",
        signals: [
          { label: "Línea negra", value: "Nivel medio observado por día." },
          { label: "Bloques de fondo", value: "Cobertura diaria: cuanto más altos, más soporte hay." },
          { label: "Fecha abierta", value: "Punto seleccionado para abrir el detalle del día." },
          { label: "Lectura operativa", value: "Contexto o caveat para interpretar la serie." },
        ],
        bullets: [
          "Busque quiebres de forma: subidas, bajadas o cambios de pendiente.",
          "Si un punto cambia mucho pero tiene baja cobertura, trátelo como señal débil y no como conclusión final.",
          "Use esta card para elegir la fecha que luego abrirá 'Fecha abierta' y el asistente.",
        ],
        nextStep:
          "Haga click en una fecha con cambio fuerte y luego compare su comportamiento con las anomalías y el patrón horario.",
      }}
      size={size}
      title="Serie diaria"
    >
      <div className="grid gap-4">
        <div className="rounded-[26px] border border-[color:rgba(255,122,31,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(255,122,31,0.08),rgba(10,3,2,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(255,96,18,0.06)]">
          <svg className="w-full" viewBox="0 0 960 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="signal-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 146, 52, 0.34)" />
              <stop offset="100%" stopColor="rgba(255, 122, 31, 0.02)" />
            </linearGradient>
          </defs>

          {yTicks.map((value, index) => {
            const y = 34 + index * 118;

            return (
              <g key={`grid-${value}`}>
                <line
                  stroke="rgba(255,180,146,0.12)"
                  strokeDasharray="6 10"
                  x1="64"
                  x2="936"
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#b28e79"
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
                  ? "rgba(255,122,31,0.22)"
                  : "rgba(255,255,255,0.035)"
              }
              height={252 * item.point.coverage_ratio}
              rx="14"
              width="48"
              x={item.x - 27}
              y={296 - 252 * item.point.coverage_ratio}
            />
          ))}

          <path d={buildAreaPath(chartPoints)} fill="url(#signal-area)" />
          <path
            d={buildLinePath(chartPoints)}
            fill="none"
            stroke="#fff7f2"
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
                  fill={active ? "#ff8d3c" : "#fff2e8"}
                  r={active ? 7.5 : 5}
                  stroke="rgba(34,13,5,0.96)"
                  strokeWidth="4"
                />
                <rect
                  fill="transparent"
                  height="340"
                  onClick={() => onSelectDate(item.point.date)}
                  onMouseEnter={() => setHoveredDate(item.point.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  width="74"
                  x={item.x - 37}
                  y="0"
                />
                <text
                  fill={active ? "#fff2e8" : "#bc9781"}
                  fontSize="12"
                  textAnchor="middle"
                  x={item.x}
                  y="324"
                >
                  {formatShortDate(item.point.date)}
                </text>
              </g>
            );
          })}
          </svg>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <MetricTile
            caption={activePoint ? formatCoverage(activePoint.point.coverage_ratio) : "0%"}
            label="Fecha abierta"
            tone="cyan"
            value={activePoint ? formatLongDate(activePoint.point.date) : "Sin datos"}
          />
          <MetricTile
            caption="Valor medio del punto seleccionado"
            label="Nivel medio"
            value={activePoint ? formatCompactNumber(activePoint.point.mean_signal) : "n/a"}
          />
          <MetricTile
            caption={strongestPoint ? formatCompactNumber(strongestPoint.mean_signal) : "n/a"}
            label="Pico del rango"
            tone="amber"
            value={strongestPoint ? formatShortDate(strongestPoint.date) : "Sin datos"}
          />
          <MetricTile
            caption={weakestCoveragePoint ? formatCoverage(weakestCoveragePoint.coverage_ratio) : "0%"}
            label="Cobertura más frágil"
            tone="rose"
            value={weakestCoveragePoint ? formatShortDate(weakestCoveragePoint.date) : "Sin datos"}
          />
        </div>

        {notes[0] ? (
          <div className="rounded-[22px] border border-[color:rgba(255,122,31,0.16)] bg-[linear-gradient(135deg,rgba(255,122,31,0.12),rgba(10,3,2,0.92))] px-4 py-3 text-xs leading-6 text-[color:#ffd9c6] shadow-[0_0_18px_rgba(255,122,31,0.06)]">
            {notes[0]}
          </div>
        ) : null}
      </div>
    </WidgetChrome>
  );
}

export function DaySpotlightWidget({
  briefing,
  actions,
  size = "large",
}: DaySpotlightWidgetProps) {
  return (
    <WidgetChrome
      actions={actions}
      description="Lectura puntual de la fecha activa con horas clave y respaldo."
      eyebrow="Fecha"
      guide={{
        summary:
          "Esta card traduce una fecha en una lectura operacional. Sirve para pasar de 'veo un punto raro' a 'entiendo qué ocurrió y qué debería investigar después'.",
        signals: [
          { label: "Hora más fuerte", value: "Franja con mejor nivel observado ese día." },
          { label: "Hora más débil", value: "Franja con menor nivel observado ese día." },
          { label: "Claves", value: "Hechos o patrones del día listos para comunicar." },
          { label: "Cautelas", value: "Advertencias para no sobrerreaccionar a vacíos de cobertura." },
        ],
        bullets: [
          "Empiece por el resumen del día y después contraste horas fuerte y débil.",
          "Si la hora más débil coincide con una anomalía, abra el patrón horario para revisar recurrencia.",
          "Use las preguntas sugeridas como puente hacia el asistente, no como texto decorativo.",
        ],
        nextStep:
          "Si el día es importante, compare este resumen con el día anterior y luego fíjelo al tablero desde el chat.",
      }}
      size={size}
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
        <div className="rounded-[24px] border border-[color:rgba(255,122,31,0.18)] bg-[linear-gradient(135deg,rgba(255,122,31,0.18),rgba(255,92,0,0.08)_42%,rgba(12,4,2,0.96)_100%)] p-5 shadow-[0_0_28px_rgba(255,96,18,0.08)]">
          <p
            className="text-[1.3rem] font-semibold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-[1.45rem]"
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            {briefing.headline}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {briefing.highlights.slice(0, 2).map((item) => (
              <span
                className="rounded-full border border-[color:rgba(255,214,190,0.16)] bg-[color:rgba(19,7,3,0.42)] px-3 py-2 text-xs text-[color:#fff3eb]"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            caption={`${formatCompactNumber(briefing.strongest_hour.mean_signal)} · ${formatCoverage(briefing.strongest_hour.coverage_ratio)}`}
            label="Hora más fuerte"
            tone="cyan"
            value={briefing.strongest_hour.label}
          />
          <MetricTile
            caption={`${formatCompactNumber(briefing.weakest_hour.mean_signal)} · ${formatCoverage(briefing.weakest_hour.coverage_ratio)}`}
            label="Hora más débil"
            tone="rose"
            value={briefing.weakest_hour.label}
          />
          <MetricTile
            caption="Comparación con la observación previa"
            label="Delta vs previo"
            tone="amber"
            value={briefing.delta_vs_prior_day_label ?? "Sin dato"}
          />
          <MetricTile
            caption={`Cobertura ${formatCoverage(briefing.coverage_ratio)}`}
            label="Confianza del día"
            value={confidenceLabel(briefing.confidence)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
            {briefing.highlights.slice(0, 4).map((item) => (
              <div
                className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-3"
                key={item}
              >
                <p
                  className="text-xs leading-5 text-[color:var(--text-soft)]"
                  style={{
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    display: "-webkit-box",
                    overflow: "hidden",
                  }}
                >
                  {item}
                </p>
              </div>
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

export function IntradayRhythmWidget({
  profile,
  actions,
  size = "medium",
}: IntradayRhythmWidgetProps) {
  const { strongest, weakest } = getIntradayExtremes(profile);
  const maxSignal = Math.max(...profile.map((item) => item.mean_signal), 1);
  const averageCoverage =
    profile.reduce((sum, item) => sum + item.coverage_ratio, 0) / Math.max(profile.length, 1);
  const averagePoints =
    profile.reduce((sum, item) => sum + item.avg_points, 0) / Math.max(profile.length, 1);

  return (
    <WidgetChrome
      actions={actions}
      description="Patrón horario del rango activo con soporte medio por franja."
      eyebrow="Ritmo horario"
      guide={{
        summary:
          "Use esta card para pasar del nivel diario al comportamiento por hora. Ayuda a saber si un problema es una franja puntual o un patrón que se repite todos los días.",
        signals: [
          { label: "Barras", value: "Altura = nivel medio por hora." },
          { label: "Opacidad", value: "Más opacidad = mejor cobertura de esa hora." },
          { label: "Hora pico", value: "Franja con mayor señal típica." },
          { label: "Hora más baja", value: "Franja con menor señal típica." },
        ],
        bullets: [
          "Compare la hora más baja con las anomalías para detectar si el problema es sistemático.",
          "Si una barra es alta pero tenue, hay que leerla con cautela: el soporte es menor.",
          "Este widget sirve para responder 'cuándo pasa' antes de preguntar 'por qué pasa'.",
        ],
        nextStep:
          "Después de detectar la hora crítica, pregúntele al asistente por esa franja o compárela contra un día puntual.",
      }}
      size={size}
      title="Patrón horario"
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            caption={strongest ? formatCompactNumber(strongest.mean_signal) : "Sin datos"}
            label="Hora pico"
            tone="cyan"
            value={strongest ? formatHourFromNumber(strongest.hour) : "n/a"}
          />
          <MetricTile
            caption={weakest ? formatCompactNumber(weakest.mean_signal) : "Sin datos"}
            label="Hora más baja"
            tone="rose"
            value={weakest ? formatHourFromNumber(weakest.hour) : "n/a"}
          />
          <MetricTile
            caption={`${Math.round(averagePoints)} pts / hora`}
            label="Cobertura media"
            tone="amber"
            value={formatCoverage(averageCoverage)}
          />
        </div>

        <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-end gap-2">
          {profile.map((item) => {
            const isStrong = strongest?.hour === item.hour;
            const isWeak = weakest?.hour === item.hour;
            let barTone = "bg-[linear-gradient(180deg,rgba(84,38,20,0.72),rgba(20,8,4,0.28))]";
            if (isStrong) {
              barTone =
                "bg-[linear-gradient(180deg,rgba(255,174,77,0.98),rgba(255,122,31,0.42))]";
            } else if (isWeak) {
              barTone =
                "bg-[linear-gradient(180deg,rgba(255,126,94,0.9),rgba(178,76,89,0.34))]";
            }

            return (
              <div className="w-12 text-center" key={item.hour}>
                <div className="relative flex h-32 items-end justify-center overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,3,2,0.92))] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div
                    className={["w-full rounded-full transition", barTone].join(" ")}
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

      </div>
    </WidgetChrome>
  );
}

export function AnomalyPulseWidget({
  anomalies,
  actions,
  size = "large",
}: AnomalyPulseWidgetProps) {
  const maxZScore = Math.max(...anomalies.map((item) => Math.abs(item.zscore)), 1);

  return (
    <WidgetChrome
      actions={actions}
      description="Eventos fuera de patrón priorizados por magnitud y soporte."
      eyebrow="Anomalías"
      guide={{
        summary:
          "Aquí aparecen los eventos que más se alejan de la base horaria esperada. No todos implican problema; la prioridad depende de magnitud, dirección y cobertura.",
        signals: [
          { label: "Base esperada", value: "Valor esperado para esa hora." },
          { label: "Observado", value: "Valor realmente visto en el evento." },
          { label: "Z-score", value: "Qué tan lejos estuvo del comportamiento normal." },
          { label: "Confianza", value: "Mezcla de cobertura y desviación." },
        ],
        bullets: [
          "Abra primero los eventos con mayor barra y confianza alta.",
          "Una caída con poca cobertura puede ser ruido; contraste con 'Calidad'.",
          "Si varias anomalías caen en la misma hora, revise el patrón horario para confirmar recurrencia.",
        ],
        nextStep:
          "Elija una anomalía y pregunte al asistente si está alineada con el día más frágil o con la hora más baja.",
      }}
      size={size}
      title="Anomalías"
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] gap-3 px-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-dim)]">
          <span>Momento</span>
          <span>Comparación</span>
          <span>Magnitud</span>
          <span>Conf.</span>
        </div>

        {anomalies.slice(0, 5).map((item) => (
          <button
            className="w-full rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(255,122,31,0.04),rgba(10,3,2,0.98))] p-4 text-left transition hover:border-[color:var(--border-strong)]"
            key={`${item.date}-${item.hour_bucket}`}
            type="button"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-sm font-medium text-[color:var(--text-strong)]">
                  {anomalyLabel(item)}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                  {item.n_points} puntos · {item.anomaly_direction === "high" ? "alza" : "caída"}
                </p>
              </div>

              <div className="text-sm text-[color:var(--text-soft)]">
                <p>Base {formatCompactNumber(item.baseline_mean)}</p>
                <p className="mt-1">Obs. {formatCompactNumber(item.mean_signal)}</p>
              </div>

              <div>
                <div className="h-3 overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(10,3,2,0.6))]">
                  <div
                    className={
                      item.anomaly_direction === "high"
                        ? "h-full rounded-full bg-[linear-gradient(90deg,rgba(255,174,77,0.96),rgba(255,122,31,0.34))] shadow-[0_0_18px_rgba(255,122,31,0.16)]"
                        : "h-full rounded-full bg-[linear-gradient(90deg,rgba(255,126,94,0.96),rgba(178,76,89,0.34))] shadow-[0_0_18px_rgba(214,103,67,0.14)]"
                    }
                    style={{ width: `${Math.max((Math.abs(item.zscore) / maxZScore) * 100, 12)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--text-soft)]">
                  Z {item.zscore.toFixed(2)} · Delta {formatCompactNumber(item.delta_vs_hour_median)}
                </p>
              </div>

              <span className={`rounded-full border px-3 py-1 text-xs ${coverageChip(item.confidence)}`}>
                {confidenceLabel(item.confidence)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </WidgetChrome>
  );
}

export function QualityLensWidget({
  overview,
  actions,
  size = "medium",
}: QualityLensWidgetProps) {
  const { quality } = overview;
  const coverage = Math.max(Math.min(quality.selected_coverage_ratio, 1), 0);
  const gaugeStyle = {
    background: `conic-gradient(
      rgba(255,122,31,0.92) 0turn ${coverage}turn,
      rgba(255,255,255,0.05) ${coverage}turn 1turn
    )`,
  };

  return (
    <WidgetChrome
      actions={actions}
      description="Separa hallazgos reales de huecos de observación dentro del rango."
      eyebrow="Calidad"
      guide={{
        summary:
          "Use esta card como filtro de confiabilidad. Si aquí ve baja cobertura o muchos puntos faltantes, cualquier hallazgo del tablero debe leerse con cautela.",
        signals: [
          { label: "Cobertura", value: "Soporte efectivo del rango seleccionado." },
          { label: "Ventanas incompletas", value: "Registros esperados que llegaron cortados." },
          { label: "Puntos faltantes", value: "Huecos completos en la serie observada." },
          { label: "Archivos raw", value: "Volumen de archivos usados para construir el rango." },
        ],
        bullets: [
          "Si la cobertura baja demasiado, priorice validar la ingesta antes que escalar el incidente.",
          "Ventanas incompletas y puntos faltantes altos indican que parte del problema puede ser observacional.",
          "Cruce esta vista con anomalías: una anomalía con mala calidad no merece la misma prioridad.",
        ],
        nextStep:
          "Antes de comunicar un hallazgo fuerte, mire esta card para decidir si habla de negocio o de calidad del dato.",
      }}
      size={size}
      title="Calidad"
    >
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid place-items-center rounded-[26px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(255,122,31,0.06),rgba(10,3,2,0.96))] p-5 shadow-[0_0_22px_rgba(255,122,31,0.06)]">
          <div className="grid size-32 place-items-center rounded-full p-3" style={gaugeStyle}>
            <div className="grid size-full place-items-center rounded-full bg-[linear-gradient(180deg,rgba(16,5,3,0.98),rgba(8,2,1,0.98))] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                  Cobertura
                </p>
                <p className="mt-2 text-3xl font-semibold text-[color:var(--text-strong)]">
                  {formatCoverage(coverage)}
                </p>
                <p className={`mt-2 text-xs ${coverageTone(quality.selected_coverage_flag)}`}>
                  {confidenceLabel(quality.selected_coverage_flag)}
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
              className="rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(255,122,31,0.04),rgba(10,3,2,0.98))] px-4 py-3"
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
    <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(255,122,31,0.04),rgba(10,3,2,0.98))] p-4">
      <p className="text-sm font-medium text-[color:var(--text-strong)]">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const active = item.date === selectedDate;

          return (
            <button
              className={[
                "block w-full rounded-[18px] border px-3 py-3 text-left transition",
                active
                  ? "border-[color:rgba(255,122,31,0.26)] bg-[linear-gradient(135deg,rgba(255,122,31,0.18),rgba(10,3,2,0.72))] shadow-[0_0_18px_rgba(255,122,31,0.08)]"
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
                      : "bg-[color:rgba(255,122,31,0.12)] text-[color:#ffd4bf]",
                  ].join(" ")}
                >
                  {formatCoverage(item.coverage_ratio)}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(10,3,2,0.6))]">
                <div
                  className={
                    tone === "rose"
                      ? "h-full rounded-full bg-[linear-gradient(90deg,rgba(255,126,94,0.96),rgba(178,76,89,0.34))] shadow-[0_0_18px_rgba(214,103,67,0.14)]"
                      : "h-full rounded-full bg-[linear-gradient(90deg,rgba(255,174,77,0.98),rgba(255,122,31,0.34))] shadow-[0_0_18px_rgba(255,122,31,0.16)]"
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
  size = "large",
}: CoverageExtremesWidgetProps) {
  return (
    <WidgetChrome
      actions={actions}
      description="Comparación rápida entre los días con peor y mejor soporte del rango. Ayuda a saber qué fechas conviene abrir primero y cuáles usar como referencia."
      eyebrow="Cobertura"
      guide={{
        summary:
          "Esta card ordena el rango por calidad de soporte. La izquierda muestra fechas frágiles; la derecha, fechas confiables para usar como referencia.",
        signals: [
          { label: "Días más frágiles", value: "Fechas donde el soporte fue bajo y la lectura exige cautela." },
          { label: "Días mejor cubiertos", value: "Fechas útiles como referencia del rango." },
          { label: "Cobertura %", value: "Porcentaje de puntos observados sobre los esperados." },
          { label: "Puntos", value: "Cuántos registros realmente sostienen cada día." },
        ],
        bullets: [
          "Abra primero los días frágiles si necesita entender dónde mirar con cuidado.",
          "Use un día muy cubierto para comparar si un cambio es real o si parece un artefacto.",
          "Cruce estas fechas con 'Serie diaria' para ver si el soporte explica parte del movimiento.",
        ],
        nextStep:
          "Seleccione una fecha de cualquiera de las dos columnas para llevarla a 'Fecha abierta' y al asistente.",
      }}
      size={size}
      title="Extremos del rango"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          caption="Fecha más frágil del rango"
          label="Mínimo soporte"
          tone="rose"
          value={
            coverage.lowest_coverage_days[0]
              ? formatCoverage(coverage.lowest_coverage_days[0].coverage_ratio)
              : "n/d"
          }
        />
        <MetricTile
          caption="Fecha mejor cubierta del rango"
          label="Máximo soporte"
          tone="cyan"
          value={
            coverage.highest_coverage_days[0]
              ? formatCoverage(coverage.highest_coverage_days[0].coverage_ratio)
              : "n/d"
          }
        />
        <MetricTile
          caption="Puntos observados del mejor cubierto"
          label="Referencia"
          value={
            coverage.highest_coverage_days[0]
              ? formatShortDate(coverage.highest_coverage_days[0].date)
              : "n/d"
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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

export function PinnedWidget({
  widget,
  onRemove,
  actions,
  size = "medium",
}: PinnedWidgetProps) {
  return (
    <WidgetChrome
      actions={
        <div className="flex flex-wrap gap-2">
          {actions}
          <ActionButton label="Eliminar" onClick={onRemove} tone="danger" />
        </div>
      }
      description="Widget fijado desde el asistente. Esto permite construir el tablero con piezas nacidas de una conversación."
      eyebrow="Widget fijado"
      guide={{
        summary:
          "Una pieza fijada conserva una respuesta o artefacto útil del asistente dentro del tablero. Sirve para convertir una conversación en un panel reusable.",
        signals: [
          { label: "Origen", value: widget.sourceIntent },
          { label: "Pregunta", value: widget.sourceQuestion },
        ],
        bullets: [
          "Use widgets fijados para dejar en el tablero hallazgos que quiera revisar varias veces.",
          "Si el widget ya no aporta a la lectura principal, elimínelo para mantener el tablero limpio.",
        ],
      }}
      size={size}
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
        <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(255,122,31,0.04),rgba(10,3,2,0.96))] p-4">
          <p className="text-sm leading-7 text-[color:var(--text-soft)]">{widget.answerExcerpt}</p>
        </div>
      ) : null}

      {widget.artifact ? <ChatArtifactView artifact={widget.artifact} /> : null}
    </WidgetChrome>
  );
}
