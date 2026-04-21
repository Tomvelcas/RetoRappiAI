"use client";

import type { CSSProperties } from "react";

type ChatThinkingCoreProps = Readonly<{
  active: boolean;
  compact?: boolean;
  detail: string;
  label?: string;
  subtitle?: string;
  title: string;
}>;

const SIGNAL_BARS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function ChatThinkingCore({
  active,
  compact = false,
  detail,
  label = "OrbbiBoard",
  subtitle,
  title,
}: ChatThinkingCoreProps) {
  const shellClassName = compact
    ? "copilot-signal-shell rounded-[28px] px-4 py-4"
    : "copilot-signal-shell rounded-[30px] px-5 py-5";
  const layoutClassName = compact
    ? "relative flex items-center gap-4"
    : "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center";
  const descriptionClassName = compact
    ? "mt-2 max-w-lg text-sm leading-6 text-[color:var(--text-soft)]"
    : "mt-3 max-w-[38rem] text-sm leading-7 text-[color:var(--text-soft)]";
  const signalRowClassName = compact ? "mt-4" : "mt-5";
  const metaRowClassName = compact ? "mt-3" : "mt-5";
  const boardClassName = compact ? "rounded-[24px] p-3" : "rounded-[30px] p-4";
  const laneCount = compact ? 4 : 6;

  return (
    <div className={shellClassName}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),transparent_26%),radial-gradient(circle_at_top_right,rgba(255,198,166,0.2),transparent_22%)]" />

      <div className={layoutClassName}>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(255,122,31,0.14)] bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,247,241,0.82))] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:#6a3e25]">
              <span className="copilot-brand-mark" />
              Tablero
            </span>
            <span className="rounded-full border border-[color:rgba(72,43,24,0.12)] bg-[color:rgba(255,255,255,0.72)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:#7d604d]">
              {label}
            </span>
          </div>
          <h3
            className={[
              "mt-3 font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]",
              compact ? "text-[1.45rem]" : "text-[clamp(1.9rem,3vw,3rem)]",
            ].join(" ")}
            style={{
              fontFamily:
                title === "OrbbiBoard"
                  ? "var(--font-brand), cursive"
                  : "var(--font-heading), serif",
              fontWeight: title === "OrbbiBoard" ? 400 : undefined,
            }}
          >
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-dim)]">
              {subtitle}
            </p>
          ) : null}
          <p className={descriptionClassName}>{detail}</p>

          <div className={`flex items-end gap-1.5 ${signalRowClassName}`}>
            {SIGNAL_BARS.map((index) => (
              <span
                aria-hidden="true"
                className={`thinking-bar ${active ? "thinking-bar-active" : ""}`}
                key={`signal-${index}`}
                style={
                  {
                    animationDelay: `${index * 110}ms`,
                    height: `${18 + ((index + 2) % 4) * 10}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className={`flex flex-wrap gap-2 ${metaRowClassName}`}>
            <span className="copilot-pill rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
              {active ? "Analizando" : "En escucha"}
            </span>
            <span className="copilot-pill rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
              Datos listos
            </span>
          </div>
        </div>

        <div
          className={[
            "relative isolate ml-auto w-full max-w-[220px] overflow-hidden border border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(42,19,8,0.98),rgba(27,11,3,0.98))] shadow-[0_22px_48px_rgba(18,13,18,0.18)]",
            boardClassName,
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,194,161,0.72),rgba(255,90,0,0.82),transparent)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(255,232,222,0.56)]">
                  Estado
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[color:var(--copilot-text)]">
                  {active ? "Activo" : "Listo"}
                </p>
              </div>
              <span className="rounded-full border border-[color:rgba(255,255,255,0.1)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:rgba(255,240,232,0.68)]">
                {active ? "sincronía" : "espera"}
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {Array.from({ length: laneCount }).map((_, laneIndex) => (
                <div
                  className="h-9 overflow-hidden rounded-full border border-[color:rgba(255,255,255,0.06)] bg-[color:rgba(255,255,255,0.04)] px-2 py-1"
                  key={`lane-${laneIndex}`}
                >
                  <div className="flex h-full items-center gap-1.5">
                    {SIGNAL_BARS.slice(0, compact ? 5 : 7).map((index) => (
                      <span
                        aria-hidden="true"
                        className={`thinking-bar ${active ? "thinking-bar-active" : ""}`}
                        key={`signal-${laneIndex}-${index}`}
                        style={
                          {
                            animationDelay: `${(laneIndex + index) * 90}ms`,
                            height: `${10 + ((index + laneIndex) % 4) * 4}px`,
                            width: compact ? "10px" : "12px",
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.04)] px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(255,232,222,0.5)]">
                Contexto
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:rgba(255,245,238,0.84)]">
                datos, lectura y respuesta en una sola vista
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
