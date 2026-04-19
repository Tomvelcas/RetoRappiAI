"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { ChatQueryResponse } from "@/lib/api";
import { queryChat } from "@/lib/api";
import { coverageChip, modeLabel, sourceLabel } from "@/lib/format";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  payload?: ChatQueryResponse;
};

type ChatWorkspaceProps = {
  initialQuestion?: string | null;
};

const starterPrompts = [
  "What happened on 2026-02-10?",
  "What days had the lowest coverage?",
  "Which hours usually carry the highest level?",
  "Explain this signal in plain language.",
];

export function ChatWorkspace({ initialQuestion }: ChatWorkspaceProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: "intro-assistant",
      role: "assistant",
      text: "Ask about the line, a single day, the weakest coverage, or the hours that tend to rise.",
    },
  ]);
  const [draft, setDraft] = useState(initialQuestion?.trim() || starterPrompts[0]);
  const [useLlm, setUseLlm] = useState(false);
  const [allowHypotheses, setAllowHypotheses] = useState(false);
  const [latestPayload, setLatestPayload] = useState<ChatQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();
  const autoPromptRan = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setTurns((current) => [...current, userTurn]);

    try {
      const payload = await queryChat({
        question: trimmed,
        use_llm: useLlm,
        allow_hypotheses: allowHypotheses,
      });

      const assistantTurn: ChatTurn = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: payload.answer,
        payload,
      };

      startTransition(() => {
        setTurns((current) => [...current, assistantTurn]);
        setLatestPayload(payload);
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "The assistant could not reach the backend.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!initialQuestion || autoPromptRan.current) {
      return;
    }

    autoPromptRan.current = true;
    void sendQuestion(initialQuestion);
  }, [initialQuestion]);

  const latestFollowUps = latestPayload?.follow_up_questions.length
    ? latestPayload.follow_up_questions
    : starterPrompts;

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[0.76fr_1.2fr_0.78fr]">
        <aside className="grid gap-4 self-start xl:sticky xl:top-24">
          <div className="panel rounded-[34px] p-6">
            <p className="eyebrow">Copilot</p>
            <h1
              className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              Ask the dashboard in plain language.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--text-soft)]">
              The answer stays tied to the data that is already on the board.
            </p>
          </div>

          <div className="panel rounded-[30px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Modes</p>
                <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                  Keep the answer grounded. Add polish only when you want it.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <button
                className={[
                  "rounded-[24px] border px-4 py-4 text-left transition",
                  useLlm
                    ? "border-[color:rgba(90,214,195,0.34)] bg-[color:rgba(90,214,195,0.08)]"
                    : "border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)]",
                ].join(" ")}
                onClick={() => {
                  setUseLlm((current) => !current);
                  if (useLlm) {
                    setAllowHypotheses(false);
                  }
                }}
                type="button"
              >
                <p className="text-sm font-medium text-[color:var(--text-strong)]">
                  Narrative polish
                </p>
                <p className="mt-1 text-xs leading-6 text-[color:var(--text-soft)]">
                  Lets the assistant rewrite the grounded answer more smoothly.
                </p>
              </button>

              <button
                className={[
                  "rounded-[24px] border px-4 py-4 text-left transition",
                  allowHypotheses
                    ? "border-[color:rgba(255,188,92,0.34)] bg-[color:rgba(255,188,92,0.08)]"
                    : "border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)]",
                ].join(" ")}
                onClick={() => {
                  setAllowHypotheses((current) => !current);
                  if (!useLlm) {
                    setUseLlm(true);
                  }
                }}
                type="button"
              >
                <p className="text-sm font-medium text-[color:var(--text-strong)]">
                  Possible reasons
                </p>
                <p className="mt-1 text-xs leading-6 text-[color:var(--text-soft)]">
                  Only for tentative explanations. Facts still come from the data.
                </p>
              </button>
            </div>
          </div>

          <div className="panel rounded-[30px] p-5">
            <p className="eyebrow">Quick asks</p>
            <div className="mt-4 flex flex-col gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-[22px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] px-4 py-3 text-left text-sm text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                  onClick={() => {
                    setDraft(prompt);
                    void sendQuestion(prompt);
                  }}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel flex min-h-[720px] flex-col rounded-[36px] p-5 sm:p-6">
          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
            <textarea
              className="glass-scroll min-h-28 w-full resize-none bg-transparent text-sm leading-7 text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-dim)]"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a day, the line, the coverage, or the hours that move the signal."
              value={draft}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {latestFollowUps.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:rgba(90,214,195,0.34)] hover:text-[color:var(--text-strong)]"
                    onClick={() => {
                      setDraft(prompt);
                    }}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <button
                className="rounded-full bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--signal-ink)] transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || !draft.trim()}
                onClick={() => void sendQuestion(draft)}
                type="button"
              >
                {isSubmitting ? "thinking…" : "send"}
              </button>
            </div>
          </div>

          <div className="glass-scroll mt-5 flex-1 space-y-4 overflow-y-auto pr-2">
            {turns.map((turn) => (
              <article
                key={turn.id}
                className={[
                  "max-w-[88%] rounded-[28px] border px-5 py-4",
                  turn.role === "user"
                    ? "ml-auto border-[color:rgba(255,188,92,0.22)] bg-[color:rgba(255,188,92,0.08)]"
                    : "border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)]",
                ].join(" ")}
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-dim)]">
                  {turn.role === "user" ? "you" : "assistant"}
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-strong)]">
                  {turn.text}
                </p>

                {turn.payload?.follow_up_questions.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {turn.payload.follow_up_questions.slice(0, 2).map((prompt) => (
                      <button
                        key={prompt}
                        className="rounded-full border border-[color:var(--border)] px-3 py-2 text-[11px] text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                        onClick={() => {
                          setDraft(prompt);
                        }}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            {error ? (
              <div className="rounded-[24px] border border-[color:rgba(255,121,137,0.22)] bg-[color:rgba(255,121,137,0.08)] px-4 py-3 text-sm text-[color:#ffd3d9]">
                {error}
              </div>
            ) : null}

            <div ref={endRef} />
          </div>
        </section>

        <aside className="grid gap-4 self-start xl:sticky xl:top-24">
          <div className="panel rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Answer readout</p>
                <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                  What backed the latest answer.
                </p>
              </div>
              {latestPayload ? (
                <span className={`rounded-full border px-3 py-2 text-xs ${coverageChip(latestPayload.confidence)}`}>
                  {latestPayload.confidence}
                </span>
              ) : null}
            </div>

            {latestPayload ? (
              <div className="mt-5 grid gap-4">
                <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                    mode
                  </p>
                  <p className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">
                    {modeLabel(latestPayload.answer_mode)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                    evidence
                  </p>
                  <div className="mt-3 space-y-3">
                    {latestPayload.evidence.map((item) => (
                      <div key={`${item.label}-${item.value}`}>
                        <p className="text-sm font-medium text-[color:var(--text-strong)]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--text-soft)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                    sources
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {latestPayload.source_tables.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)]"
                      >
                        {sourceLabel(item)}
                      </span>
                    ))}
                  </div>
                </div>

                {latestPayload.hypotheses.length ? (
                  <div className="rounded-[24px] border border-[color:rgba(255,188,92,0.22)] bg-[color:rgba(255,188,92,0.08)] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--signal-amber)]">
                      possible reasons
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:#ffe0b4]">
                      {latestPayload.hypotheses.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {latestPayload.warnings.length ? (
                  <div className="rounded-[24px] border border-[color:rgba(255,121,137,0.22)] bg-[color:rgba(255,121,137,0.08)] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--signal-rose)]">
                      read with care
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:#ffd3d9]">
                      {latestPayload.warnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-4 text-sm leading-7 text-[color:var(--text-soft)]">
                The inspector will fill itself after the first answer.
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
