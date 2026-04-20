"use client";

import type { ChatArtifact } from "@/lib/api";

function toneClasses(tone: ChatArtifact["cards"][number]["tone"]): string {
  if (tone === "accent") {
    return "border-[color:rgba(21,125,120,0.18)] bg-[color:rgba(21,125,120,0.08)]";
  }

  if (tone === "warning") {
    return "border-[color:rgba(178,76,89,0.18)] bg-[color:rgba(178,76,89,0.08)]";
  }

  if (tone === "muted") {
    return "border-[color:var(--border)] bg-[color:rgba(32,27,23,0.03)]";
  }

  return "border-[color:var(--border)] bg-[color:var(--surface-strong)]";
}

function barTone(tone: ChatArtifact["points"][number]["tone"], highlight: boolean): string {
  if (highlight) {
    return "bg-[color:var(--text-strong)]";
  }

  if (tone === "warning") {
    return "bg-[color:rgba(178,76,89,0.52)]";
  }

  if (tone === "accent") {
    return "bg-[color:rgba(21,125,120,0.34)]";
  }

  return "bg-[color:rgba(32,27,23,0.18)]";
}

export function ChatArtifactView({ artifact }: { artifact: ChatArtifact }) {
  if (artifact.kind !== "hourly_coverage_chart" && artifact.kind !== "bar_chart") {
    return null;
  }

  const maxPointValue = Math.max(...artifact.points.map((point) => point.value), 0);

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Corte visual
          </p>
          <p className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">
            {artifact.title}
          </p>
          {artifact.subtitle ? (
            <p className="mt-1 text-xs leading-6 text-[color:var(--text-soft)]">
              {artifact.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {artifact.cards.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {artifact.cards.map((card) => (
            <div
              key={`${card.label}-${card.value}`}
              className={`rounded-[20px] border p-3 ${toneClasses(card.tone)}`}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                {card.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--text-strong)]">
                {card.value}
              </p>
              {card.detail ? (
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-soft)]">
                  {card.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {artifact.points.length ? (
        <div className="mt-5 overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-2">
            {artifact.points.map((point) => (
              <div key={`${point.label}-${point.formatted_value}`} className="w-12 text-center">
                <div className="relative flex h-40 items-end justify-center overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[color:rgba(32,27,23,0.03)] px-2 py-2">
                  <div className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-dashed border-[color:rgba(32,27,23,0.08)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-2/4 border-t border-dashed border-[color:rgba(32,27,23,0.08)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-dashed border-[color:rgba(32,27,23,0.08)]" />
                  <div
                    className={`w-full rounded-full transition ${barTone(point.tone, point.highlight)}`}
                    style={{
                      height: `${Math.max(
                        maxPointValue > 0 ? (point.value / maxPointValue) * 100 : 0,
                        4,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-[color:var(--text-strong)]">
                  {point.label}
                </p>
                <p className="mt-1 text-[11px] text-[color:var(--text-soft)]">
                  {point.formatted_value}
                </p>
                {point.detail ? (
                  <p className="mt-1 text-[10px] text-[color:var(--text-dim)]">{point.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {artifact.footnote ? (
        <p className="mt-4 text-xs leading-6 text-[color:var(--text-soft)]">{artifact.footnote}</p>
      ) : null}
    </section>
  );
}
