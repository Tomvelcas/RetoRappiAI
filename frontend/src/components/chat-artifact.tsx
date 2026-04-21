"use client";

import type { ChatArtifact } from "@/lib/api";

function toneClasses(tone: ChatArtifact["cards"][number]["tone"]): string {
  if (tone === "accent") {
    return "border-[color:rgba(234,77,161,0.16)] bg-[linear-gradient(135deg,rgba(234,77,161,0.1),rgba(255,143,107,0.06))]";
  }

  if (tone === "warning") {
    return "border-[color:rgba(255,206,115,0.16)] bg-[linear-gradient(135deg,rgba(255,206,115,0.12),rgba(255,143,107,0.06))]";
  }

  if (tone === "muted") {
    return "border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.04)]";
  }

  return "border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.04)]";
}

function barTone(tone: ChatArtifact["points"][number]["tone"], highlight: boolean): string {
  if (highlight) {
    return "bg-[linear-gradient(180deg,rgba(255,143,107,0.96),rgba(234,77,161,0.92),rgba(143,103,255,0.88))]";
  }

  if (tone === "warning") {
    return "bg-[color:rgba(255,206,115,0.58)]";
  }

  if (tone === "accent") {
    return "bg-[color:rgba(234,77,161,0.48)]";
  }

  return "bg-[color:rgba(255,255,255,0.22)]";
}

type ChatArtifactViewProps = Readonly<{
  artifact: ChatArtifact;
}>;

export function ChatArtifactView({ artifact }: ChatArtifactViewProps) {
  if (artifact.kind !== "hourly_coverage_chart" && artifact.kind !== "bar_chart") {
    return null;
  }

  const maxPointValue = Math.max(...artifact.points.map((point) => point.value), 0);

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(255,240,232,0.46)]">
            Corte visual
          </p>
          <p className="mt-2 text-sm font-medium text-[color:var(--copilot-text)]">
            {artifact.title}
          </p>
          {artifact.subtitle ? (
            <p className="mt-1 text-xs leading-6 text-[color:var(--copilot-text-soft)]">
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
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(255,240,232,0.46)]">
                {card.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--copilot-text)]">
                {card.value}
              </p>
              {card.detail ? (
                <p className="mt-1 text-xs leading-5 text-[color:var(--copilot-text-soft)]">
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
                <div className="relative flex h-40 items-end justify-center overflow-hidden rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.04)] px-2 py-2">
                  <div className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-dashed border-[color:rgba(255,255,255,0.08)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-2/4 border-t border-dashed border-[color:rgba(255,255,255,0.08)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-dashed border-[color:rgba(255,255,255,0.08)]" />
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
                <p className="mt-2 text-[11px] font-medium text-[color:var(--copilot-text)]">
                  {point.label}
                </p>
                <p className="mt-1 text-[11px] text-[color:var(--copilot-text-soft)]">
                  {point.formatted_value}
                </p>
                {point.detail ? (
                  <p className="mt-1 text-[10px] text-[color:rgba(255,240,232,0.46)]">
                    {point.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {artifact.footnote ? (
        <p className="mt-4 text-xs leading-6 text-[color:var(--copilot-text-soft)]">
          {artifact.footnote}
        </p>
      ) : null}
    </section>
  );
}
