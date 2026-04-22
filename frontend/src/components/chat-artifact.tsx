"use client";

import type { ChatArtifact } from "@/lib/api";

function toneClasses(tone: ChatArtifact["cards"][number]["tone"]): string {
  if (tone === "accent") {
    return "border-[color:rgba(255,122,31,0.14)] bg-[linear-gradient(135deg,rgba(255,122,31,0.14),rgba(255,255,255,0.92))]";
  }

  if (tone === "warning") {
    return "border-[color:rgba(255,206,115,0.18)] bg-[linear-gradient(135deg,rgba(255,206,115,0.18),rgba(255,248,236,0.96))]";
  }

  if (tone === "muted") {
    return "border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.72)]";
  }

  return "border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.72)]";
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
    <section className="mt-4 overflow-visible rounded-[24px] border border-[color:rgba(67,57,47,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(250,245,239,0.94))] p-4 shadow-[0_16px_34px_rgba(41,31,20,0.05)] sm:p-[18px]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(67,58,49,0.46)]">
            Corte visual
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-[color:var(--copilot-text)]">
            {artifact.title}
          </p>
          {artifact.subtitle ? (
            <p className="mt-1 text-[11px] leading-5 text-[color:var(--copilot-text-soft)]">
              {artifact.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {artifact.cards.length ? (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {artifact.cards.map((card) => (
            <div
              key={`${card.label}-${card.value}`}
              className={`rounded-[16px] border p-2.5 ${toneClasses(card.tone)}`}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(108,83,67,0.54)]">
                {card.label}
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-[color:var(--copilot-text)]">
                {card.value}
              </p>
              {card.detail ? (
                <p className="mt-1 text-[11px] leading-5 text-[color:var(--copilot-text-soft)]">
                  {card.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {artifact.points.length ? (
        <div className="mt-4 overflow-x-auto pb-3">
          <div className="flex min-w-max items-end gap-3">
            {artifact.points.map((point) => (
              <div
                key={`${point.label}-${point.formatted_value}`}
                className="w-14 min-w-[3.5rem] text-center sm:w-[4rem]"
              >
                <div className="relative flex h-40 items-end justify-center overflow-hidden rounded-[16px] border border-[color:rgba(67,57,47,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,243,236,0.72))] px-1.5 py-1.5">
                  <div className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-dashed border-[color:rgba(67,57,47,0.08)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-2/4 border-t border-dashed border-[color:rgba(67,57,47,0.08)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-dashed border-[color:rgba(67,57,47,0.08)]" />
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
                <p className="mt-2 text-[10px] font-medium text-[color:var(--copilot-text)]">
                  {point.label}
                </p>
                <p className="mt-1 text-[10px] text-[color:var(--copilot-text-soft)]">
                  {point.formatted_value}
                </p>
                {point.detail ? (
                  <p className="mt-1 text-[9px] text-[color:rgba(108,83,67,0.54)]">
                    {point.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {artifact.footnote ? (
        <p className="mt-3 max-w-3xl text-[11px] leading-5 text-[color:var(--copilot-text-soft)]">
          {artifact.footnote}
        </p>
      ) : null}
    </section>
  );
}
